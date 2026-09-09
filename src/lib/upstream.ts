// ---------------------------------------------------------------------------
// Upstream HTTP client — the ONLY place that talks to the Sanka Vollerei API.
//
// Protections (the API allows 60 req/min; 3 violations => permanent BAN):
//   1. Token-bucket outbound rate limiter (RATE_LIMIT_PER_MIN, default 50/min)
//   2. SWR cache (src/lib/cache.ts) so most requests never hit upstream at all
//   3. Single-flight dedupe: concurrent identical requests share one upstream call
//   4. 429 handling: honors Retry-After, enters cooldown, serves stale fallback
//   5. Request timeout via AbortController
// ---------------------------------------------------------------------------

import { cache } from "./cache";
import type { ApiEnvelope } from "./types";

const BASE = process.env.UPSTREAM_API_BASE ?? "https://www.sankavollerei.web.id/anime";
const UA = process.env.UPSTREAM_USER_AGENT ?? "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const PER_MIN = Number(process.env.RATE_LIMIT_PER_MIN ?? 50);
const STALE_FACTOR = Number(process.env.CACHE_STALE_FACTOR ?? 6);
const TIMEOUT_MS = 15_000;

export class UpstreamError extends Error {
  constructor(message: string, readonly status: number, readonly retryAfterSec?: number) {
    super(message);
    this.name = "UpstreamError";
  }
}

// ---- 1. Token-bucket outbound rate limiter --------------------------------
const g = globalThis as unknown as {
  __rate?: { tokens: number; last: number; cooldownUntil: number };
  __inflight?: Map<string, Promise<ApiEnvelope<unknown>>>;
};
const rate = (g.__rate ??= { tokens: PER_MIN, last: Date.now(), cooldownUntil: 0 });
const inflight = (g.__inflight ??= new Map<string, Promise<ApiEnvelope<unknown>>>());

function acquireSlot(): { waitMs: number } | { cooldownMs: number } | null {
  const now = Date.now();
  if (now < rate.cooldownUntil) return { cooldownMs: rate.cooldownUntil - now };
  rate.tokens = Math.min(PER_MIN, rate.tokens + ((now - rate.last) / 60_000) * PER_MIN);
  rate.last = now;
  if (rate.tokens >= 1) { rate.tokens -= 1; return null; }
  return { waitMs: Math.ceil(((1 - rate.tokens) * 60_000) / PER_MIN) };
}

// ---- 2. Raw upstream fetch with timeout -----------------------------------
async function rawFetch<T>(path: string): Promise<ApiEnvelope<T>> {
  const url = `${BASE.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { accept: "application/json", "user-agent": UA },
      signal: ac.signal,
      cache: "no-store",
    });
  } catch (err) {
    throw new UpstreamError(err instanceof Error ? err.message : "network error", 0);
  } finally {
    clearTimeout(timer);
  }
  if (res.status === 429) {
    const ra = Number(res.headers.get("retry-after") ?? 60);
    const waitSec = Number.isFinite(ra) && ra > 0 ? Math.min(ra, 120) : 60;
    rate.cooldownUntil = Date.now() + waitSec * 1000;
    throw new UpstreamError("Upstream rate limit (429)", 429, waitSec);
  }
  if (!res.ok) throw new UpstreamError(`Upstream HTTP ${res.status}`, res.status);
  const body = (await res.json()) as ApiEnvelope<T>;
  if (body.ok === false || body.statusCode >= 400) {
    throw new UpstreamError(body.message || "upstream returned error payload", body.statusCode ?? 500);
  }
  return body;
}

// ---- 3. SWR + single-flight + 429 fallback wrapper -------------------------
export interface UpstreamResult<T> {
  envelope: ApiEnvelope<T>;
  cache: "fresh" | "stale" | "fallback";
  fetchedAt: number;
  retryAfter?: number;
}

export async function apiGet<T>(
  path: string,
  ttlSec: number,
  opts: { forceFresh?: boolean } = {},
): Promise<UpstreamResult<T>> {
  const key = `up:${path}`;
  const staleWindow = Math.max(6 * 3600 - ttlSec, ttlSec * (STALE_FACTOR - 1));

  if (!opts.forceFresh) {
    const hit = cache.resolve<ApiEnvelope<T>>(key);
    if (hit?.state === "fresh") {
      return { envelope: hit.entry.value, cache: "fresh", fetchedAt: hit.entry.fetchedAt };
    }
    if (hit?.state === "stale") {
      // Serve stale immediately, refresh in the background (fire-and-forget).
      void refresh(key, path, ttlSec, staleWindow).catch(() => {});
      return { envelope: hit.entry.value, cache: "stale", fetchedAt: hit.entry.fetchedAt };
    }
  }

  try {
    const envelope = await refresh<T>(key, path, ttlSec, staleWindow);
    return { envelope, cache: "fresh", fetchedAt: Date.now() };
  } catch (err) {
    // 429 / 5xx / timeout -> serve expired cache as graceful fallback.
    const stale = cache.fallback<ApiEnvelope<T>>(key);
    if (stale) {
      const retryAfter = err instanceof UpstreamError ? err.retryAfterSec : undefined;
      return { envelope: stale.value, cache: "fallback", fetchedAt: stale.fetchedAt, retryAfter };
    }
    throw err;
  }
}

function refresh<T>(key: string, path: string, ttlSec: number, staleWindow: number): Promise<ApiEnvelope<T>> {
  const existing = inflight.get(key);
  if (existing) return existing as unknown as Promise<ApiEnvelope<T>>;

  const slot = acquireSlot();
  let p: Promise<ApiEnvelope<T>>;
  if (slot && "cooldownMs" in slot) {
    p = Promise.reject(new UpstreamError("Upstream in cooldown (429)", 429, Math.ceil(slot.cooldownMs / 1000)));
  } else if (slot && "waitMs" in slot) {
    p = new Promise((resolve, reject) =>
      setTimeout(() => { acquireSlot(); rawFetch<T>(path).then(resolve, reject); }, Math.min(slot.waitMs, 3000)),
    );
  } else {
    p = rawFetch<T>(path);
  }

  p.then((env) => cache.set(key, env, ttlSec, staleWindow)).finally(() => inflight.delete(key));
  inflight.set(key, p as unknown as Promise<ApiEnvelope<unknown>>);
  return p;
}

/** Cache introspection for the /api/proxy/stats endpoint. */
export function cacheStats() {
  return {
    keys: cache.keys().length,
    tokens: Math.floor(rate.tokens),
    cooldownRemainingMs: Math.max(0, rate.cooldownUntil - Date.now()),
  };
}


// ---------------------------------------------------------------------------
// Catch-all proxy: /api/proxy/<upstream path>?...
//
// The ONLY channel between the browser and the Sanka Vollerei API.
// - Path allowlist (no SSRF / arbitrary passthrough)
// - SWR node-cache layer (fresh -> stale+bg refresh -> 429 fallback)
// - Outbound token-bucket limiter below the upstream 60 req/min ban threshold
// - Emits ProxyResponse JSON: { ok, data, pagination, cache, fetchedAt, retryAfter, error }
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { resolveDownloadEmbed, ttlForPath } from "@/lib/api";
import { apiGet, cacheStats } from "@/lib/upstream";
import type { ProxyResponse } from "@/lib/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ALLOWED = [
  /^home$/,
  /^ongoing-anime$/,
  /^complete-anime$/,
  /^anime\/[\w.-]+$/,
  /^episode\/[\w.-]+$/,
  /^server\/[\w-]+$/,
  /^search\/[\w+.-]+$/,
  /^genre$/,
  /^genre\/[\w-]+$/,
  /^schedule$/,
  /^resolve$/,
] as const;

function json<T>(body: ProxyResponse<T>, status = 200, headers: Record<string, string> = {}) {
  return NextResponse.json(body, {
    status,
    headers: { "x-cache-state": body.cache, ...headers },
  });
}

export async function GET(req: NextRequest, ctx: { params: { path: string[] } }) {
  const segments = ctx.params.path ?? [];
  const path = segments.join("/");

  // -- stats passthrough (rate-limit/cache introspection for the UI) ---------
  if (path === "stats") {
    return json({
      ok: true,
      data: { ...cacheStats(), rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN ?? 50) } as never,
      pagination: null,
      cache: "fresh",
    });
  }

  const { searchParams } = new URL(req.url);

  // -- external embed resolver: download host (e.g. Filedon 1080p) -> iframe URL
  if (path === "resolve") {
    const target = searchParams.get("url") ?? "";
    if (!/^https?:\/\//i.test(target)) {
      return json({ ok: false, data: null, pagination: null, cache: "fallback", error: "Missing or invalid ?url" }, 400);
    }
    try {
      const embed = await resolveDownloadEmbed(target);
      return json({ ok: true, data: embed as never, pagination: null, cache: "fresh" });
    } catch (err) {
      return json(
        {
          ok: false,
          data: null,
          pagination: null,
          cache: "fallback",
          error: (err as Error).message || "Embed unavailable",
        },
        502,
      );
    }
  }

  if (!ALLOWED.some((re) => re.test(path))) {
    return json({ ok: false, data: null, pagination: null, cache: "fallback", error: `Blocked path: ${path}` }, 400);
  }

  const page = Math.max(1, Number(searchParams.get("page") ?? 1) || 1);
  const fullPath = page > 1 ? `${path}?page=${page}` : path;

  const ttl = ttlForPath(path);
  const forceFresh = searchParams.get("refresh") === "1";

  try {
    const res = await apiGet<unknown>(fullPath, ttl, { forceFresh });
    return json({
      ok: true,
      data: res.envelope.data as never,
      pagination: (res.envelope.pagination ?? null) as never,
      cache: res.cache,
      fetchedAt: res.fetchedAt,
      retryAfter: res.retryAfter,
    });
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const retryAfter = (err as { retryAfterSec?: number }).retryAfterSec;
    return json(
      {
        ok: false,
        data: null,
        pagination: null,
        cache: "fallback",
        retryAfter,
        error:
          status === 429
            ? `Server is busy, serving cached data${retryAfter ? ` — retry after ${retryAfter}s` : ""}`
            : (err as Error).message || "Upstream unavailable",
      },
      status === 429 ? 503 : 502,
      retryAfter ? { "retry-after": String(retryAfter) } : {},
    );
  }
}

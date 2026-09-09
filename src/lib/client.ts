// ---------------------------------------------------------------------------
// Client-side fetcher for the internal /api/proxy layer.
// Consumed by TanStack Query hooks in client components.
// ---------------------------------------------------------------------------

import type { Pagination, ProxyResponse } from "./types";

export class ProxyError extends Error {
  constructor(readonly status: number, message: string, readonly retryAfter?: number) {
    super(message);
    this.name = "ProxyError";
  }
}

export interface Proxied<T> {
  data: T;
  pagination: Pagination | null;
  cache: "fresh" | "stale" | "fallback";
}

export async function proxyGet<T>(path: string, params?: Record<string, string | number>): Promise<Proxied<T>> {
  const url = new URL(`/api/proxy/${path.replace(/^\//, "")}`, window.location.origin);
  for (const [k, v] of Object.entries(params ?? {})) url.searchParams.set(k, String(v));

  const res = await fetch(url, { headers: { accept: "application/json" } });
  let body: ProxyResponse<null> | null = null;
  try {
    body = (await res.json()) as ProxyResponse<null>;
  } catch {
    /* non-JSON error */
  }

  if (!res.ok || !body?.ok || body.data === null) {
    throw new ProxyError(res.status, body?.error ?? `Request failed (${res.status})`, body?.retryAfter);
  }

  // Global "server busy" notice hook — BusyNotice listens for this.
  if (body.cache === "fallback") {
    window.dispatchEvent(new CustomEvent("fazuranime:busy", { detail: { retryAfter: body.retryAfter } }));
  }

  return { data: body.data as T, pagination: body.pagination, cache: body.cache };
}

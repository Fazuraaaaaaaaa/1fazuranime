// ---------------------------------------------------------------------------
// SWR (Stale-While-Revalidate) cache store built on node-cache.
// Server-only module — never import from client components.
//
// Entry lifecycle:
//   [0, ttl)                    -> FRESH   (served directly, no upstream call)
//   [ttl, ttl + staleWindow)    -> STALE   (served immediately + background refresh)
//   beyond staleWindow          -> MISS    (blocking upstream fetch)
//   on 429 / upstream failure   -> FALLBACK (serve stale entry even if expired)
// ---------------------------------------------------------------------------

import NodeCache from "node-cache";

export interface CacheEntry<T> {
  value: T;
  fetchedAt: number; // epoch ms
  expiresAt: number; // epoch ms — after this the entry is stale
  staleUntil: number; // epoch ms — after this the entry is unusable
}

class SwrCache {
  private store: NodeCache;

  constructor() {
    // stdTTL 0 => we manage expiry ourselves; checkperiod sweeps dead keys.
    this.store = new NodeCache({ stdTTL: 0, checkperiod: 120, useClones: false });
  }

  set<T>(key: string, value: T, ttlSec: number, staleWindowSec: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      value,
      fetchedAt: now,
      expiresAt: now + ttlSec * 1000,
      staleUntil: now + (ttlSec + staleWindowSec) * 1000,
    };
    // Keep dead-but-fallback-able entries around for 24h max.
    this.store.set(key, entry, 24 * 60 * 60);
  }

  /** Returns the entry with its current state, or null. */
  resolve<T>(key: string): { entry: CacheEntry<T>; state: "fresh" | "stale" } | null {
    const entry = this.store.get<CacheEntry<T>>(key);
    if (!entry) return null;
    const now = Date.now();
    if (now < entry.expiresAt) return { entry, state: "fresh" };
    if (now < entry.staleUntil) return { entry, state: "stale" };
    return null;
  }

  /** Last-resort read used when upstream returns 429/5xx — ignores staleness. */
  fallback<T>(key: string): CacheEntry<T> | null {
    return this.store.get<CacheEntry<T>>(key) ?? null;
  }

  delete(key: string): void {
    this.store.del(key);
  }

  keys(): string[] {
    return this.store.keys();
  }
}

// Singleton across HMR reloads in dev
const g = globalThis as unknown as { __swrCache?: SwrCache };
export const cache: SwrCache = (g.__swrCache ??= new SwrCache());

"use client";

// ---------------------------------------------------------------------------
// localStorage-backed stores: Watchlist + Continue Watching (history).
// Cross-component sync via a tiny pub/sub (no external state library needed).
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from "react";
import type { HistoryEntry, WatchlistEntry } from "./types";

const WATCHLIST_KEY = "fazuranime:watchlist";
const HISTORY_KEY = "fazuranime:history";
const LS_EVENT = "fazuranime:ls";

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  window.localStorage.setItem(key, JSON.stringify(value));
  window.dispatchEvent(new Event(LS_EVENT));
}

function useLsValue<T>(key: string, fallback: T): T {
  const [value, setValue] = useState<T>(fallback);
  useEffect(() => {
    const sync = () => setValue(read(key, fallback));
    sync();
    window.addEventListener(LS_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(LS_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return value;
}

// ---- Watchlist --------------------------------------------------------------

export function useWatchlist() {
  const items = useLsValue<WatchlistEntry[]>(WATCHLIST_KEY, []);

  const has = useCallback((animeId: string) => items.some((i) => i.animeId === animeId), [items]);

  const toggle = useCallback((entry: Omit<WatchlistEntry, "addedAt">) => {
    const current = read<WatchlistEntry[]>(WATCHLIST_KEY, []);
    if (current.some((i) => i.animeId === entry.animeId)) {
      write(WATCHLIST_KEY, current.filter((i) => i.animeId !== entry.animeId));
      return false;
    }
    write(WATCHLIST_KEY, [{ ...entry, addedAt: Date.now() }, ...current]);
    return true;
  }, []);

  const remove = useCallback((animeId: string) => {
    const current = read<WatchlistEntry[]>(WATCHLIST_KEY, []);
    write(WATCHLIST_KEY, current.filter((i) => i.animeId !== animeId));
  }, []);

  return { items, has, toggle, remove };
}

// ---- Continue Watching / History --------------------------------------------

export function useHistory() {
  const entries = useLsValue<HistoryEntry[]>(HISTORY_KEY, []);

  /** Continue-watching view: latest entry per anime, most recent first. */
  const continueWatching = (() => {
    const seen = new Set<string>();
    return entries.filter((e) => {
      if (seen.has(e.animeId)) return false;
      seen.add(e.animeId);
      return true;
    });
  })();

  const record = useCallback((entry: Omit<HistoryEntry, "updatedAt">) => {
    const current = read<HistoryEntry[]>(HISTORY_KEY, []).filter(
      (e) => e.episodeId !== entry.episodeId,
    );
    write(HISTORY_KEY, [{ ...entry, updatedAt: Date.now() }, ...current].slice(0, 100));
  }, []);

  const removeEpisode = useCallback((episodeId: string) => {
    const current = read<HistoryEntry[]>(HISTORY_KEY, []);
    write(HISTORY_KEY, current.filter((e) => e.episodeId !== episodeId));
  }, []);

  const removeAnime = useCallback((animeId: string) => {
    const current = read<HistoryEntry[]>(HISTORY_KEY, []);
    write(HISTORY_KEY, current.filter((e) => e.animeId !== animeId));
  }, []);

  const clear = useCallback(() => write(HISTORY_KEY, []), []);

  const lastForAnime = useCallback(
    (animeId: string) => entries.find((e) => e.animeId === animeId),
    [entries],
  );

  return { entries, continueWatching, record, removeEpisode, removeAnime, clear, lastForAnime };
}

/** Set of watched episode ids, used to badge the episode list. */
export function useWatchedEpisodes() {
  const entries = useLsValue<HistoryEntry[]>(HISTORY_KEY, []);
  return new Set(entries.map((e) => e.episodeId));
}

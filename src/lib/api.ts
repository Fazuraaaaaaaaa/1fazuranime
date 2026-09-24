// ---------------------------------------------------------------------------
// Typed API service layer (server-side).
// RSC pages call these directly; the /api/proxy route also routes through here.
// TTL policy:
//   LIST    (home / ongoing / completed / genre / schedule) -> 15 min
//   DETAIL  (anime detail)                                  -> 60 min
//   EPISODE (watch payload)                                 -> 30 min
//   SEARCH  (queries)                                       -> 30 min
//   SERVER  (resolved embed url)                            -> 5 min
// ---------------------------------------------------------------------------

import { cache } from "./cache";
import { apiGet } from "./upstream";
import type {
  AnimeCard,
  AnimeDetail,
  EpisodeData,
  GenreList,
  HomeData,
  ScheduleDay,
  ServerEmbed,
  WatchQualityGroup,
  WatchServerOption,
} from "./types";

export type CacheKind = "LIST" | "DETAIL" | "EPISODE" | "SEARCH" | "SERVER";

const envTtl = (name: string, fallback: number) => Number(process.env[name] ?? fallback);

export const TTL: Record<CacheKind, number> = {
  LIST: envTtl("CACHE_TTL_LIST", 900),
  DETAIL: envTtl("CACHE_TTL_DETAIL", 3600),
  EPISODE: envTtl("CACHE_TTL_EPISODE", 1800),
  SEARCH: envTtl("CACHE_TTL_SEARCH", 1800),
  SERVER: envTtl("CACHE_TTL_SERVER", 300),
};

/** Resolve the TTL for an arbitrary upstream sub-path (used by the proxy). */
export function ttlForPath(path: string): number {
  if (path.startsWith("server/")) return TTL.SERVER;
  if (path.startsWith("episode/")) return TTL.EPISODE;
  if (path.startsWith("anime/")) return TTL.DETAIL;
  if (path.startsWith("search/")) return TTL.SEARCH;
  return TTL.LIST;
}

export interface ServiceResult<T> {
  data: T;
  pagination: import("./types").Pagination | null;
  cache: "fresh" | "stale" | "fallback";
  fetchedAt: number;
  retryAfter?: number;
}

async function call<T>(path: string, kind: CacheKind): Promise<ServiceResult<T>> {
  const res = await apiGet<T>(path, TTL[kind]);
  return {
    data: res.envelope.data,
    pagination: null,
    cache: res.cache,
    fetchedAt: res.fetchedAt,
    retryAfter: res.retryAfter,
  };
}

// ---- Endpoint helpers -------------------------------------------------------

export function getHome() {
  return call<HomeData>("home", "LIST");
}

export interface ListResult<T> extends ServiceResult<T> {
  pagination: import("./types").Pagination | null;
}

async function callList<T>(path: string, kind: CacheKind): Promise<ListResult<{ animeList: T[] }>> {
  const res = await apiGet<{ animeList: T[] }>(path, TTL[kind]);
  return {
    data: res.envelope.data,
    pagination: res.envelope.pagination ?? null,
    cache: res.cache,
    fetchedAt: res.fetchedAt,
    retryAfter: res.retryAfter,
  };
}

export function getOngoing(page = 1) {
  return callList<AnimeCard>(`ongoing-anime?page=${page}`, "LIST");
}

export function getCompleted(page = 1) {
  return callList<AnimeCard>(`complete-anime?page=${page}`, "LIST");
}

export function getAnimeDetail(slug: string) {
  return call<AnimeDetail>(`anime/${encodeURIComponent(slug)}`, "DETAIL");
}

export function getEpisode(slug: string) {
  return call<EpisodeData>(`episode/${encodeURIComponent(slug)}`, "EPISODE");
}

export function resolveServer(serverId: string) {
  return call<ServerEmbed>(`server/${encodeURIComponent(serverId)}`, "SERVER");
}

export function searchAnime(keyword: string) {
  // Upstream expects `search/one+piece` — encode each token, keep '+' separators
  const kw = keyword.trim().split(/\s+/).map(encodeURIComponent).join("+");
  if (!kw) {
    return Promise.resolve({
      data: { animeList: [] },
      pagination: null,
      cache: "fresh" as const,
      fetchedAt: Date.now(),
    });
  }
  return callList<AnimeCard & { status?: string; score?: string }>(`search/${kw}`, "SEARCH");
}

export function getGenres() {
  return call<GenreList>("genre", "LIST");
}

export function getGenreAnime(slug: string, page = 1) {
  return callList<AnimeCard>(`genre/${encodeURIComponent(slug)}?page=${page}`, "LIST");
}

export function getSchedule() {
  return call<ScheduleDay[]>("schedule", "LIST");
}

export { apiGet };

// ---------------------------------------------------------------------------
// External embed resolver — download hosts (NOT the Sanka API, so these calls
// never touch the token bucket). Some hosts expose an /embed/ player page,
// which lets download-only qualities like 1080p surface as real stream servers.
// ---------------------------------------------------------------------------

const EXTERNAL_UA = process.env.UPSTREAM_USER_AGENT ?? "FazurAnime/1.0";
const EXTERNAL_TIMEOUT_MS = 12_000;

/** Final URL after redirects -> playable iframe URL. */
const EMBED_PATTERNS = [
  {
    test: /^https?:\/\/(?:www\.)?filedon\.co\/view\/[\w-]+/i,
    toEmbed: (u: string) => u.replace(/\/view\//i, "/embed/"),
  },
  {
    // vikingfile lands on vik1ngfile.site (or vikingfile.com); /embed/ 302s to vikingfile.com
    test: /^https?:\/\/(?:www\.)?(?:vik1ngfile\.site|vikingfile\.com)\/f\/([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/\/f\/([\w-]+)/i);
      return m ? `https://vikingfile.com/embed/${m[1]}` : u;
    },
  },
  {
    // mega file page -> embed player; the #key fragment is REQUIRED (without it
    // the player renders a decryption error), so the pattern only matches with it.
    test: /^https?:\/\/(?:www\.)?mega\.nz\/file\/([\w-]+)#([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/^https?:\/\/(?:www\.)?mega\.nz\/file\/([\w-]+)#([\w-]+)/i);
      return m ? `https://mega.nz/embed/${m[1]}#${m[2]}` : u;
    },
  },
  {
    test: /^https?:\/\/(?:www\.)?pixeldrain\.com\/u\/([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/pixeldrain\.com\/u\/([\w-]+)/i);
      return m ? `https://pixeldrain.com/e/${m[1]}` : u;
    },
  },
  {
    test: /^https?:\/\/(?:drive|docs)\.google\.com\/file\/d\/([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/\/file\/d\/([\w-]+)/i);
      return m ? `https://drive.google.com/file/d/${m[1]}/preview` : u;
    },
  },
  {
    test: /^https?:\/\/(?:www\.)?mp4upload\.com\/([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/mp4upload\.com\/([\w-]+)/i);
      return m ? `https://www.mp4upload.com/embed-${m[1]}.html` : u;
    },
  },
] as const;

export interface ResolvedEmbed {
  url: string; // "" => host known to be non-embeddable (negative cache)
  host: string;
}

const extInflight = new Map<string, Promise<ResolvedEmbed>>();

function hostOf(u: string): string {
  try {
    return new URL(u).hostname;
  } catch {
    return "unknown";
  }
}

/**
 * Follow the (possibly link-shortener) URL server-side and return the final URL.
 * Redirects are followed MANUALLY so that #fragments survive — required for
 * Mega links whose decryption key lives in the fragment (undici strips it when
 * using redirect:"follow").
 */
async function fetchFinalUrl(target: string): Promise<string> {
  let current = target;
  for (let hop = 0; hop < 6; hop++) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), EXTERNAL_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: ac.signal,
        cache: "no-store",
        headers: { "user-agent": EXTERNAL_UA, accept: "text/html,*/*" },
      });
    } catch {
      return current; // network issue — pattern may still match what we have
    } finally {
      clearTimeout(timer);
    }
    const loc = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && loc) {
      current = new URL(loc, current).toString(); // keeps the #key fragment
      continue;
    }
    return current;
  }
  return current;
}

export async function resolveDownloadEmbed(target: string): Promise<ResolvedEmbed> {
  const key = `ext:${target}`;
  const hit = cache.resolve<ResolvedEmbed>(key);
  if (hit) {
    if (hit.state === "fresh") {
      if (!hit.entry.value.url) throw new Error(`${hit.entry.value.host} tidak mendukung embed player`);
      return hit.entry.value;
    }
    void refreshExternal(key, target).catch(() => {});
    if (hit.entry.value.url) return hit.entry.value;
    throw new Error(`${hit.entry.value.host} tidak mendukung embed player`);
  }
  return refreshExternal(key, target);
}

function refreshExternal(key: string, target: string): Promise<ResolvedEmbed> {
  const existing = extInflight.get(key);
  if (existing) return existing;

  const p = (async (): Promise<ResolvedEmbed> => {
    const finalUrl = await fetchFinalUrl(target);
    const pattern = EMBED_PATTERNS.find((pat) => pat.test.test(finalUrl));
    if (!pattern) {
      const neg: ResolvedEmbed = { url: "", host: hostOf(finalUrl) };
      cache.set(key, neg, 600, 3600); // negative cache — hide the button for a while
      throw new Error(`${neg.host} tidak mendukung embed player`);
    }
    const out: ResolvedEmbed = { url: pattern.toEmbed(finalUrl), host: hostOf(finalUrl) };
    
    // Validate if the embed is actually alive (Pixeldrain/Mega/etc often have dead links)
    try {
      const ac = new AbortController();
      const timer = setTimeout(() => ac.abort(), 4000);
      const probe = await fetch(out.url, { method: "HEAD", signal: ac.signal }).finally(() => clearTimeout(timer));
      if (probe.status === 404) {
        const neg: ResolvedEmbed = { url: "", host: hostOf(finalUrl) };
        cache.set(key, neg, 600, 3600);
        throw new Error(`${neg.host} file not found (404)`);
      }
    } catch (err: any) {
      if (err.message.includes("404")) throw err;
      // If HEAD fails due to CORS/network/timeout, we still optimistically return the URL 
      // rather than breaking working servers that block HEAD requests.
    }

    cache.set(key, out, TTL.SERVER, TTL.SERVER * 5);
    return out;
  })();

  p.catch(() => {}).finally(() => extInflight.delete(key));
  extInflight.set(key, p);
  return p;
}

// ---------------------------------------------------------------------------
// Watch-page server hygiene
//
// Builds the quality groups shown by the player's server switcher:
//   1. native Sanka mirrors, minus the desustream family — those hosts answer
//      with X-Frame-Options: SAMEORIGIN and can NEVER play inside our iframe
//      (odstream / odcdn / ondesu* / otakuwatch* / updesu all resolve there);
//   2. a synthesized "1080p" group from MKV_1080p download links on hosts that
//      expose an embed player (Filedon / VikingFile / Mega) — resolved lazily
//      by the client via /api/proxy/resolve.
// Anything the EMBED_PATTERNS table can't transform fails at probe time and is
// dropped from the UI by the client (no dead buttons, no broken players).
// ---------------------------------------------------------------------------

const STREAM_BLOCKLIST = /(updesu|ondesu|desustream|odstream|odcdn|otakuwatch)/i;

export function sanitizeWatchServers(episode: EpisodeData): WatchQualityGroup[] {
  const groups: WatchQualityGroup[] = [];

  // 1) native mirror groups
  for (const q of episode.server?.qualities ?? []) {
    const servers: WatchServerOption[] = q.serverList
      .filter((s) => !STREAM_BLOCKLIST.test(s.title))
      .map((s) => ({ kind: "server" as const, serverId: s.serverId, title: s.title, href: s.href }));
    if (servers.length > 0) groups.push({ title: q.title, servers });
  }

  // 2) synthesized 1080p group from embeddable download hosts
  if (!groups.some((g) => g.title.includes("1080")) && episode.downloadUrl?.qualities) {
    const seen = new Set<string>();
    const servers: WatchServerOption[] = [];
    for (const d of episode.downloadUrl.qualities) {
      if (!/1080/i.test(d.title)) continue;
      for (const u of d.urls) {
        if (seen.has(u.url)) continue;
        seen.add(u.url);
        servers.push({ kind: "ext", serverId: `ext:${u.url}`, title: u.title, href: u.url });
      }
    }
    if (servers.length > 0) groups.push({ title: "1080p", servers });
  }

  return groups;
}

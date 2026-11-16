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
  if (path.startsWith("server/") || path.startsWith("samehadaku/server/")) return TTL.SERVER;
  if (path.startsWith("episode/") || path.startsWith("samehadaku/episode/")) return TTL.EPISODE;
  if (path.startsWith("anime/") || path.startsWith("samehadaku/anime/")) return TTL.DETAIL;
  if (path.startsWith("search/") || path.startsWith("samehadaku/search/")) return TTL.SEARCH;
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
  if (!serverId || typeof serverId !== "string" || !serverId.trim()) {
    throw new Error("Invalid serverId");
  }
  return call<ServerEmbed>(`server/${encodeURIComponent(serverId.trim())}`, "SERVER");
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
    test: /^https?:\/\/(?:www\.)?filedon\.co\/(?:view|embed|f)\/([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/\/(?:view|embed|f)\/([\w-]+)/i);
      return m ? `https://filedon.co/embed/${m[1]}` : u;
    },
  },
  {
    // vikingfile lands on vik1ngfile.site (or vikingfile.com); /embed/ 302s to vikingfile.com
    test: /^https?:\/\/(?:www\.)?(?:vik(?:1ng|ing)file\.(?:site|com|org)|vikingfile\.com)\/(?:f|embed|d)\/([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/\/(?:f|embed|d)\/([\w-]+)/i);
      return m ? `https://vikingfile.com/embed/${m[1]}` : u;
    },
  },
  {
    // mega file page -> embed player; the #key fragment is REQUIRED (without it
    // the player renders a decryption error), so the pattern only matches with it.
    test: /^https?:\/\/(?:www\.)?mega\.(?:nz|co\.nz)\/(?:file\/([\w-]+)#([\w-]+)|embed\/([\w-]+)#([\w-]+)|#!(?:file\/)?([\w-]+)!([\w-]+))/i,
    toEmbed: (u: string) => {
      const m1 = u.match(/\/(?:file|embed)\/([\w-]+)#([\w-]+)/i);
      if (m1) return `https://mega.nz/embed/${m1[1]}#${m1[2]}`;
      const m2 = u.match(/#!(?:file\/)?([\w-]+)!([\w-]+)/i);
      if (m2) return `https://mega.nz/embed/${m2[1]}#${m2[2]}`;
      return u;
    },
  },
  {
    // acefile download link -> embed player
    test: /^https?:\/\/(?:www\.)?acefile\.co\/(?:f|player)\/(\d+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/\/(?:f|player)\/(\d+)/i);
      return m ? `https://acefile.co/player/${m[1]}` : u;
    },
  },
  {
    test: /^https?:\/\/(?:www\.)?(?:odvidhide|vidhide|vidhidepro|vidhidepre|vidhidevip)\.(?:com|net|org)\/(?:v|f|d|embed)\/([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/\/(?:v|f|d|embed)\/([\w-]+)/i);
      return m ? `https://odvidhide.com/embed/${m[1]}` : u;
    },
  },
  {
    test: /^https?:\/\/(?:drive|docs)\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/(?:file\/d\/|open\?id=|uc\?id=)([\w-]+)/i);
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
  {
    test: /^https?:\/\/(?:[a-z0-9-]+\.)?icefile\.my\.id\/(?:embed|f|view)\/([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/\/(?:embed|f|view)\/([\w-]+)/i);
      return m ? `https://beta.icefile.my.id/embed/${m[1]}` : u;
    },
  },
  {
    test: /^https?:\/\/(?:www\.)?blogger\.com\/video\.g\?token=([\w-]+)/i,
    toEmbed: (u: string) => u,
  },
  {
    test: /^https?:\/\/(?:www\.)?ok\.ru\/(?:videoembed|video)\/(\d+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/\/(?:videoembed|video)\/(\d+)/i);
      return m ? `https://ok.ru/videoembed/${m[1]}` : u;
    },
  },
  {
    test: /^https?:\/\/(?:www\.)?pixeldrain\.com\/(?:u|api\/file)\/([\w-]+)/i,
    toEmbed: (u: string) => {
      const m = u.match(/\/(?:u|api\/file)\/([\w-]+)/i);
      return m ? `https://pixeldrain.com/u/${m[1]}` : u;
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
      try {
        const targetHash = current.includes("#") ? new URL(current).hash : "";
        const nextUrl = new URL(loc, current);
        if (!nextUrl.hash && targetHash) {
          nextUrl.hash = targetHash;
        }
        current = nextUrl.toString();
        continue;
      } catch {
        return current;
      }
    }
    if (res.status === 200) {
      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("text/html")) {
        try {
          const html = await res.text();
          // Check for meta refresh: <meta http-equiv="refresh" content="0; url=...">
          const metaMatch = html.match(/<meta[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?[^"'>]*url=([^"'>\s]+)/i);
          if (metaMatch && metaMatch[1]) {
            const targetHash = current.includes("#") ? new URL(current).hash : "";
            const nextUrl = new URL(metaMatch[1], current);
            if (!nextUrl.hash && targetHash) nextUrl.hash = targetHash;
            current = nextUrl.toString();
            continue;
          }
          // Check for JS redirect: window.location = "..." or window.location.href = "..." or location.replace("...")
          const jsMatch = html.match(/(?:window\.)?location(?:\.href|\.replace)?\s*=\s*["']([^"']+)["']/i);
          if (jsMatch && jsMatch[1] && /^https?:\/\//i.test(jsMatch[1])) {
            const targetHash = current.includes("#") ? new URL(current).hash : "";
            const nextUrl = new URL(jsMatch[1], current);
            if (!nextUrl.hash && targetHash) nextUrl.hash = targetHash;
            current = nextUrl.toString();
            continue;
          }
        } catch {
          // ignore parsing error and return current
        }
      }
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
    
    // Validate if the embed is actually alive (Pixeldrain/Filedon/etc often have dead links).
    // Mega is already validated during redirect resolution (fetchFinalUrl) and blocks HEAD requests.
    if (!/mega\.(?:nz|co\.nz)/i.test(finalUrl)) {
      try {
        const ac = new AbortController();
        const timer = setTimeout(() => ac.abort(), 4000);
        const probe = await fetch(out.url, { method: "HEAD", signal: ac.signal }).finally(() => clearTimeout(timer));
        if (probe.status === 404 || probe.status === 410) {
          const neg: ResolvedEmbed = { url: "", host: hostOf(finalUrl) };
          cache.set(key, neg, 600, 3600);
          throw new Error(`${neg.host} file not found (${probe.status})`);
        }
      } catch (err: unknown) {
        if (err instanceof Error && (err.message.includes("404") || err.message.includes("410"))) throw err;
        // If HEAD fails due to CORS/network/timeout/method not allowed, we still optimistically return the URL 
        // rather than breaking working servers that block HEAD requests.
      }
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
// Native mirrors are resolved and probed by the client. Exclude only the
// DesuStream family because those hosts explicitly reject iframe embedding.
// 1080p download links are included when EMBED_PATTERNS or a supported host title
// can turn them into iframe URLs. Mega is unique within the synthesized 1080p group.
// ---------------------------------------------------------------------------

const STREAM_BLOCKLIST = /(updesu|ondesu|desustream|odstream|odcdn|otakuwatch)/i;
const MEGA_TITLE = /^mega(?:\.nz)?$/i;
export const SUPPORTED_HOST_TITLE = /^(?:mega(?:\.nz)?|filedon|viking(?:file)?|acefile|vid\s*hide(?:pro)?|odvidhide|g(?:oogle)?\s*drive|mp4upload|icefile|blogger|blogspot|pixeldrain|okru|ok\.ru)$/i;

export function isMegaTitle(title: string): boolean {
  return MEGA_TITLE.test((title ?? "").trim());
}

export function normalizeHostTitle(title: string): string {
  const t = (title ?? "").trim();
  if (/^mega/i.test(t)) return "Mega";
  if (/^filedon/i.test(t)) return "Filedon";
  if (/^viking/i.test(t)) return "VikingFile";
  if (/^acefile/i.test(t)) return "Acefile";
  if (/(?:vid\s*hide|odvidhide)/i.test(t)) return "Vidhide";
  if (/^g(?:oogle)?\s*drive/i.test(t)) return "Google Drive";
  if (/^mp4upload/i.test(t)) return "Mp4upload";
  if (/^icefile/i.test(t)) return "Icefile";
  if (/(?:blogger|blogspot)/i.test(t)) return "Blogger";
  if (/^pixeldrain/i.test(t)) return "Pixeldrain";
  if (/(?:okru|ok\.ru)/i.test(t)) return "OK.ru";
  return t;
}

const HOST_PRIORITY: Record<string, number> = {
  Mega: 1,
  Icefile: 2,
  Blogger: 3,
  Filedon: 4,
  VikingFile: 5,
  Acefile: 6,
  Vidhide: 7,
  "Google Drive": 8,
  Pixeldrain: 9,
  "OK.ru": 10,
  Mp4upload: 11,
};

export function isSupportedHost(title: string, url: string): boolean {
  if (url && EMBED_PATTERNS.some((pattern) => pattern.test.test(url))) return true;
  return Boolean(title && SUPPORTED_HOST_TITLE.test(title.trim()));
}

export function extractQualityResolution(title: string): number {
  if (!title) return 0;
  const match = title.match(/(\d{3,4})p?/i);
  if (match) return parseInt(match[1], 10);
  if (/4k|uhd/i.test(title)) return 2160;
  if (/1080|fhd/i.test(title)) return 1080;
  if (/720|hd/i.test(title)) return 720;
  if (/480|sd/i.test(title)) return 480;
  if (/360/i.test(title)) return 360;
  return 0;
}

export function sanitizeWatchServers(episode: EpisodeData): WatchQualityGroup[] {
  const groups: WatchQualityGroup[] = [];

  // Keep every non-blocked native mirror; the client probes its resolved URL.
  for (const q of episode?.server?.qualities ?? []) {
    if (!q || !Array.isArray(q.serverList)) continue;
    const servers: WatchServerOption[] = q.serverList
      .filter((s) => s && s.serverId && !STREAM_BLOCKLIST.test(`${s.title ?? ""} ${s.serverId} ${s.href ?? ""}`))
      .filter((s, i, arr) => arr.findIndex((x) => x?.serverId === s?.serverId) === i)
      .map((s) => ({
        kind: "server" as const,
        serverId: s.serverId,
        title: (s.title ?? "Server").trim(),
        href: s.href ?? "",
      }));
    if (servers.length > 0) {
      groups.push({ title: (q.title ?? "Unknown").trim(), servers });
    }
  }

  // Collect backup servers from download links across all resolutions (1080p, 720p, 480p, 360p)
  // that can be played in iframe (Mega, Icefile, Blogger, Filedon, VikingFile, Acefile, Vidhide, etc.).
  if (Array.isArray(episode?.downloadUrl?.qualities)) {
    // Prioritize MP4 over MKV if both exist for better browser player compatibility
    const sortedQualities = [...episode.downloadUrl.qualities].sort((a, b) => {
      const aMp4 = /mp4/i.test(a?.title ?? "") ? 1 : 0;
      const bMp4 = /mp4/i.test(b?.title ?? "") ? 1 : 0;
      return bMp4 - aMp4;
    });

    const TARGET_RESOLUTIONS = [1080, 720, 480, 360] as const;

    for (const res of TARGET_RESOLUTIONS) {
      const seenUrls = new Set<string>();
      const seenHosts = new Set<string>();
      const extServers: WatchServerOption[] = [];

      for (const d of sortedQualities) {
        if (!d || extractQualityResolution(d.title ?? "") !== res || !Array.isArray(d.urls)) continue;
        for (const u of d.urls) {
          if (!u || !u.url) continue;
          const isSupported = isSupportedHost(u.title ?? "", u.url);
          if (!isSupported || seenUrls.has(u.url)) continue;

          const hostName = normalizeHostTitle(u.title ?? "");
          // Deduplicate so each host appears once per resolution
          if (seenHosts.has(hostName.toLowerCase())) continue;

          seenHosts.add(hostName.toLowerCase());
          seenUrls.add(u.url);

          extServers.push({
            kind: "ext",
            serverId: `ext:${u.url}`,
            title: hostName,
            href: u.url,
          });
        }
      }

      // Sort external servers by host priority (Mega first, then Icefile, Blogger, Filedon, etc.)
      extServers.sort((a, b) => (HOST_PRIORITY[a.title] ?? 99) - (HOST_PRIORITY[b.title] ?? 99));

      const idx = groups.findIndex((g) => extractQualityResolution(g.title) === res);
      if (idx !== -1) {
        // Native group exists for this resolution — append non-duplicate backup servers
        const existingTitles = new Set(groups[idx].servers.map((s) => normalizeHostTitle(s.title).toLowerCase()));
        const newServers = extServers.filter((s) => !existingTitles.has(normalizeHostTitle(s.title).toLowerCase()));
        if (newServers.length > 0) {
          groups[idx] = { ...groups[idx], servers: [...groups[idx].servers, ...newServers] };
        }
      } else if (extServers.length > 0) {
        // No native group existed for this resolution — create it with backup servers
        groups.push({ title: `${res}p`, servers: extServers });
      }
    }
  }

  // Priority ordering: 1080p > 720p > 480p > 360p
  groups.sort((a, b) => extractQualityResolution(b.title) - extractQualityResolution(a.title));

  return groups;
}

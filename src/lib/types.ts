// ---------------------------------------------------------------------------
// Types mirroring the Sanka Vollerei API (https://www.sankavollerei.web.id/anime)
// Envelope: { status, creator, statusCode, statusMessage, message, ok, data, pagination }
// ---------------------------------------------------------------------------

export interface ApiEnvelope<T> {
  status: string;
  creator?: string;
  statusCode: number;
  statusMessage?: string;
  message?: string;
  ok: boolean;
  data: T;
  pagination: Pagination | null;
}

export interface Pagination {
  currentPage: number;
  hasPrevPage: boolean;
  prevPage: number | null;
  hasNextPage: boolean;
  nextPage: number | null;
  totalPages: number;
}

/** Card as returned by ongoing / home lists */
export interface AnimeCard {
  title: string;
  poster: string;
  episodes?: number;
  releaseDay?: string;
  latestReleaseDate?: string;
  score?: string;
  lastReleaseDate?: string;
  status?: string;
  genreList?: GenreRef[];
  animeId: string; // slug
  href: string; // upstream relative path, e.g. /anime/anime/<slug>
  otakudesuUrl?: string;
}

export interface GenreRef {
  title: string;
  genreId: string;
  href: string;
  otakudesuUrl?: string;
}

export interface HomeData {
  ongoing: { href?: string; otakudesuUrl?: string; animeList: AnimeCard[] };
  completed: { href?: string; otakudesuUrl?: string; animeList: AnimeCard[] };
  [key: string]: unknown;
}

export interface EpisodeRef {
  title: string;
  eps: number;
  date: string;
  episodeId: string; // slug
  href: string;
  otakudesuUrl?: string;
}

export interface AnimeDetail {
  title: string;
  poster: string;
  japanese?: string;
  score?: string;
  producers?: string;
  type?: string;
  status?: string;
  episodes?: number;
  duration?: string;
  aired?: string;
  studios?: string;
  batch?: { episodeId: string; href: string } | null;
  synopsis: { paragraphs: string[]; connections?: unknown[] };
  genreList: GenreRef[];
  episodeList: EpisodeRef[];
  recommendedAnimeList?: AnimeCard[];
}

export interface StreamServer {
  title: string; // e.g. "ondesu2hd"
  serverId: string; // e.g. "758EAB-6-C75u"
  href: string; // /anime/server/<serverId>
}

export interface QualityGroup {
  title: string; // "360p" | "480p" | "720p"
  serverList: StreamServer[];
}

export interface DownloadLink {
  title: string;
  url: string;
}

export interface DownloadQuality {
  title: string; // "Mp4_360p"
  size: string; // "48.8 MB"
  urls: DownloadLink[];
}

export interface EpisodeNavRef {
  title: string;
  episodeId: string;
  href: string;
}

export interface EpisodeData {
  title: string;
  animeId: string; // parent anime slug
  releaseTime?: string;
  defaultStreamingUrl: string;
  hasPrevEpisode: boolean;
  prevEpisode: EpisodeNavRef | null;
  hasNextEpisode: boolean;
  nextEpisode: EpisodeNavRef | null;
  server: { qualities: QualityGroup[] };
  downloadUrl?: { qualities: DownloadQuality[] };
  /** Some deployments embed the parent anime info here */
  anime?: Partial<AnimeDetail>;
}

export interface ServerEmbed {
  url: string;
}

/** A server button on the watch page (native stream mirror or 1080p download-host embed). */
export interface WatchServerOption {
  /** "server" = Sanka mirror, resolve via /api/proxy/server/<serverId> */
  kind: "server" | "ext";
  serverId: string;
  title: string;
  /** ext: original download-host link to resolve; server: mirror id */
  href: string;
}

export interface WatchQualityGroup {
  title: string; // "360p" | "480p" | "720p" | "1080p"
  servers: WatchServerOption[];
}

export interface GenreList {
  genreList: GenreRef[];
}

export interface ScheduleDay {
  dayName: string;
  animeList: { title: string; eps: number; animeId: string; href: string }[];
}

// ---- Local user utilities (localStorage) ----------------------------------

export interface HistoryEntry {
  animeId: string;
  animeTitle: string;
  poster: string;
  episodeId: string;
  episodeTitle: string;
  episodeNumber?: number;
  /** playback position in seconds when supported (custom players), else 0 */
  timestamp: number;
  updatedAt: number; // epoch ms
}

export interface WatchlistEntry {
  animeId: string;
  title: string;
  poster: string;
  score?: string;
  type?: string;
  totalEpisodes?: number;
  addedAt: number;
}

// ---- Proxy response shape (what our /api/proxy returns to the client) -----

export type CacheState = "fresh" | "stale" | "fallback";

export interface ProxyResponse<T> {
  ok: boolean;
  data: T | null;
  pagination: Pagination | null;
  /** cache state of the payload */
  cache: CacheState;
  /** epoch ms of when the payload was fetched upstream */
  fetchedAt?: number;
  /** seconds to wait before retrying (429 handling) */
  retryAfter?: number;
  error?: string;
}

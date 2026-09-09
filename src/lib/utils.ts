import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "One Piece Episode 1098 Subtitle Indonesia" -> nice display title */
export function prettyTitle(raw: string): string {
  return raw
    .replace(/\s*subtitle\s*indonesia\s*/i, "")
    .replace(/\s*sub\s*indo\s*/i, "")
    .trim();
}

export function timeAgo(epochMs: number): string {
  const diff = Date.now() - epochMs;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(epochMs).toLocaleDateString();
}

/** Split "Mp4_360p" / "MKV 720p" into readable label */
export function qualityLabel(raw: string): string {
  return raw.replace(/[_-]+/g, " ").trim();
}

/**
 * Resolves a broken/unreachable upstream poster URL into our Jikan-backed
 * poster proxy route: /api/poster?title=...&fallback=...
 * The proxy route looks up the poster on MyAnimeList (via Jikan API) with
 * heavy caching, then 302-redirects to the final image URL.
 */
export function posterSrc(rawPoster: string, rawTitle: string): string {
  return `/api/poster?title=${encodeURIComponent(rawTitle)}&fallback=${encodeURIComponent(rawPoster || "")}`;
}

export function slugToTitle(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

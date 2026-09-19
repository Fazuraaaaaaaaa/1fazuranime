// ---------------------------------------------------------------------------
// Poster resolver — /api/poster?title=...&fallback=...
//
// Upstream (otakudesu) poster URLs are hotlink-protected and return 403, so
// every poster on the site is routed through here and resolved against real
// anime metadata APIs instead:
//   1. normalize the scraped title ("Xxx Subtitle Indonesia" -> "Xxx")
//   2. look the title up in Kitsu (primary) then Jikan/MyAnimeList (backup)
//   3. SWR-cache the resolved image URL, then 302-redirect the browser to it
//   4. if nothing matches, serve an inline SVG placeholder (never a broken img)
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from "next/server";
import { cache } from "@/lib/cache";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const JIKAN_BASE = process.env.JIKAN_API_BASE ?? "https://api.jikan.moe/v4";
const KITSU_BASE = process.env.KITSU_API_BASE ?? "https://kitsu.io/api/edge";
const KITSU_TIMEOUT_MS = 12_000; // Kitsu search latency spikes under load
const JIKAN_TIMEOUT_MS = 6_000;
const HIT_TTL = 14 * 24 * 3600; // resolved poster URL (posters never change)
const MISS_TTL = 12 * 3600; // negative cache: title really is unknown
const RETRY_TTL = 60; // provider errored/timed out: try again soon
const MIN_SCORE = 50; // confidence needed to accept a fuzzy title match

function normalizeKitsuOriginal(url?: string): string | undefined {
  if (!url) return undefined;
  if (!url.includes("X-Amz-Signature")) return url;
  
  // Convert presigned S3 URLs to stable CDN URLs
  // https://kitsu-production-media.s3.us-west-002.backblazeb2.com/anime/47988/poster_image/...jpg?X-Amz...
  // => https://media.kitsu.app/anime/47988/poster_image/...jpg
  const baseUrl = url.split("?")[0];
  if (baseUrl.includes("kitsu-production-media.s3")) {
    return baseUrl.replace(/https:\/\/[^/]+\//, "https://media.kitsu.app/");
  }
  return baseUrl;
}


/** A provider answer: either a poster, or "not found" — plus how much to trust it. */
interface ProviderResult {
  hit: PosterHit | null;
  /** false on timeout / non-200 / network error, so a miss is not cached long */
  definitive: boolean;
}

/**
 * Strip scraper noise and rewrite sequel markers into the spelling Kitsu/MAL
 * use: "Xxx Season 2" -> "Xxx 2nd Season", "Xxx Season 1" -> "Xxx".
 */
function normalizeTitle(raw: string): string {
  let s = raw
    .replace(/\(?\b(?:dub|sub)\s*(?:indonesia|indo)?\)?/gi, " ")
    .replace(/\bsubtitle\s*indonesia\b/gi, " ")
    .replace(/\bindo-sub\b/gi, " ")
    .replace(/\bepisode\s*\d+(?:\s*[-]\s*\d+)?\b/gi, " ")
    .replace(/\b(?:batch|end)\b/gi, " ")
    .replace(/[^A-Za-z0-9!?:&,.()'\s-]/g, " ");

  s = s.replace(/\bseason\s*1\b/gi, " ");
  s = s.replace(/\bseason\s*(\d+)\b/gi, (_, n) => {
    const num = parseInt(n, 10);
    const suffixes = ["th", "st", "nd", "rd"];
    const v = num % 100;
    const suffix = suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0];
    return `${num}${suffix} Season`;
  });

  return s.replace(/\s{2,}/g, " ").trim();
}

/** Lowercase, drop punctuation/whitespace — for fuzzy title comparison. */
function key(s?: string | null): string {
  if (!s) return "";
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Lowercase word tokens (len >= 2) — for token-overlap scoring. */
function tokens(s?: string | null): string[] {
  if (!s) return [];
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Capped Levenshtein distance (early-exit once the budget is exceeded). */
function editDistanceWithin(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (cur[j] < rowMin) rowMin = cur[j];
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

function tokensMatch(wt: string, ct: string): boolean {
  if (ct === wt) return true;
  if (wt.length < 5 || ct.length < 5) return false;
  // containment: "mienai" inside "menimienai"
  if (ct.includes(wt) || wt.includes(ct)) return true;
  // romanization drift: "toumei" vs "tomei"
  return editDistanceWithin(wt, ct, Math.max(1, Math.floor(Math.min(wt.length, ct.length) / 5)));
}

/** Romaji -> English title words ("Mahou Shoujo" = "Magical Girl"). */
const TO_EN: Record<string, string> = {
  mahou: "magical",
  shoujo: "girl",
  shounen: "boy",
  seinen: "youth",
  hime: "princess",
  ouji: "prince",
  kishi: "knight",
  eiyuu: "hero",
  yuusha: "hero",
  maou: "demonking",
  onna: "woman",
  otoko: "man",
  kodomo: "child",
  gakuen: "academy",
  gakkou: "school",
  sekai: "world",
  tengoku: "heaven",
  jigoku: "hell",
  tsuki: "moon",
  taiyou: "sun",
  hoshi: "star",
  yoru: "night",
  asa: "morning",
  hana: "flower",
  kaze: "wind",
  ame: "rain",
  yuki: "snow",
  mori: "forest",
  umi: "sea",
  sora: "sky",
  inu: "dog",
  neko: "cat",
  ryuu: "dragon",
  ookami: "wolf",
  tori: "bird",
  senshi: "warrior",
  monogatari: "story",
  kage: "shadow",
  hikari: "light",
  shinigami: "deathgod",
  tenshi: "angel",
  akuma: "devil",
  jingai: "nonhuman",
  madoushi: "mage",
  kenja: "sage",
  boukensha: "adventurer",
  oukoku: "kingdom",
  teikoku: "empire",
  mura: "village",
  machi: "town",
};

const EN_WORDS = new Set(Object.values(TO_EN));

/** Canonical (English) form of a title token, so "mahou" == "magical". */
function canonToken(t: string): string {
  return TO_EN[t] ?? (EN_WORDS.has(t) ? t : t);
}

/**
 * Score a candidate title against the wanted one, 0-100.
 * Exact key match beats prefix beats substring beats token overlap; the token
 * score is the share of wanted words found in the candidate (minus a penalty
 * so a loose subset never outranks a true match).
 */
function titleScore(wKey: string, wTokens: string[], candidate: string): number {
  const cKey = key(candidate);
  if (!cKey) return 0;
  if (cKey === wKey) return 100;

  // Reject sequel conflicts ("... 5th Season" must not match "... 4th Season").
  // Compare ONLY explicit season markers — candidate titles often carry stray
  // digits ("... 4th Season: 2-nensei-hen 1 Gakki") that must not veto a
  // perfectly good match.
  const seasonOf = (k: string): string | null =>
    k.match(/(\d+)(?:st|nd|rd|th)season/)?.[1] ?? k.match(/season(\d+)/)?.[1] ?? null;
  const wSeason = seasonOf(wKey);
  const cSeason = seasonOf(cKey);
  if (wSeason && cSeason && wSeason !== cSeason) {
    return 0;
  }

  if (cKey.startsWith(wKey) || wKey.startsWith(cKey)) return 80;
  if (cKey.includes(wKey) || wKey.includes(cKey)) return 60;

  const cTokens = tokens(candidate);
  const evalTokens = wTokens.filter((t) => t.length >= 3);
  if (!evalTokens.length) return 0;

  let hits = 0;
  for (const wt of evalTokens) {
    const wc = canonToken(wt);
    const found = cTokens.some((ct) => {
      const cc = canonToken(ct);
      return (
        wc === cc || tokensMatch(wt, ct) || tokensMatch(wc, ct) || tokensMatch(wt, cc)
      );
    });
    if (found) hits++;
  }
  return Math.min(55, (hits / evalTokens.length) * 100 - 15);
}

interface PosterHit {
  url: string;
  matched: boolean;
}

/** Best-scoring candidate title across a provider entry's alias list. */
function bestTitleScore(wKey: string, wTokens: string[], candidates: string[]): number {
  let score = 0;
  for (const c of candidates) score = Math.max(score, titleScore(wKey, wTokens, c));
  return score;
}

// ---------------------------------------------------------------------------
// 1. Kitsu provider (primary: high uptime, HD posters, generous rate limits)
// ---------------------------------------------------------------------------
interface KitsuItem {
  attributes?: {
    canonicalTitle?: string;
    abbreviatedTitles?: string[] | null;
    titles?: Record<string, string | undefined>;
    posterImage?: { original?: string; large?: string; medium?: string; small?: string };
  };
}

async function fetchFromKitsu(wanted: string, signal: AbortSignal): Promise<ProviderResult> {
  const url = `${KITSU_BASE}/anime?filter[text]=${encodeURIComponent(wanted)}&page[limit]=5`;
  const res = await fetch(url, {
    signal,
    headers: { Accept: "application/vnd.api+json" },
    cache: "no-store",
  });
  if (!res.ok) return { hit: null, definitive: res.status === 404 };
  const json = (await res.json()) as { data?: KitsuItem[] };
  const items = json.data ?? [];
  if (!items.length) return { hit: null, definitive: true };

  const wKey = key(wanted);
  const wTokens = tokens(wanted);
  let bestUrl: string | null = null;
  let bestScore = 0;

  for (const item of items) {
    const attr = item.attributes;
    if (!attr) continue;
    const p = attr.posterImage;
    const poster =
      p?.large ||
      p?.medium ||
      p?.small ||
      normalizeKitsuOriginal(p?.original);
    if (!poster) continue;

    const candidates = [
      attr.canonicalTitle ?? "",
      ...(attr.abbreviatedTitles ?? []),
      ...Object.values(attr.titles ?? {}).filter(Boolean),
    ] as string[];

    const score = bestTitleScore(wKey, wTokens, candidates);
    if (score > bestScore) {
      bestScore = score;
      bestUrl = poster;
    }
  }

  return {
    hit: bestUrl && bestScore >= MIN_SCORE ? { url: bestUrl, matched: true } : null,
    definitive: true,
  };
}

// ---------------------------------------------------------------------------
// 2. Jikan provider (fallback: MAL blocks requests randomly via Cloudflare)
// ---------------------------------------------------------------------------
interface JikanItem {
  images?: {
    webp?: { large_image_url?: string; image_url?: string };
    jpg?: { large_image_url?: string; image_url?: string };
  };
  title?: string;
  title_english?: string;
  title_japanese?: string;
}

async function fetchFromJikan(wanted: string, signal: AbortSignal): Promise<ProviderResult> {
  const url = `${JIKAN_BASE}/anime?q=${encodeURIComponent(wanted.slice(0, 30))}&limit=5`;
  const res = await fetch(url, { signal, cache: "no-store" });
  if (!res.ok) return { hit: null, definitive: res.status === 404 };
  const json = (await res.json()) as { data?: JikanItem[] };
  const items = json.data ?? [];
  if (!items.length) return { hit: null, definitive: true };

  const wKey = key(wanted);
  const wTokens = tokens(wanted);
  let bestUrl: string | null = null;
  let bestScore = 0;

  for (const item of items) {
    const poster =
      item.images?.webp?.large_image_url ||
      item.images?.webp?.image_url ||
      item.images?.jpg?.large_image_url ||
      item.images?.jpg?.image_url;
    if (!poster) continue;

    const candidates = [item.title, item.title_english, item.title_japanese].filter(Boolean) as string[];
    const score = bestTitleScore(wKey, wTokens, candidates);

    if (score > bestScore) {
      bestScore = score;
      bestUrl = poster;
    }
  }

  return {
    hit: bestUrl && bestScore >= MIN_SCORE ? { url: bestUrl, matched: true } : null,
    definitive: true,
  };
}

// ---------------------------------------------------------------------------
// Pipeline & cache wrapper
// ---------------------------------------------------------------------------
const inflight = new Map<string, Promise<PosterHit | null>>();

/** Generate shorter search queries from a long title for retry. */
function truncatedQueries(wanted: string): string[] {
  const alts: string[] = [];
  // cut at comma or colon — "Xxx, Yyy" → "Xxx"
  const commaIdx = wanted.search(/[,:\uff0c\u3001]/);
  if (commaIdx > 6) alts.push(wanted.slice(0, commaIdx).trim());
  // first N words (7, then 4)
  const words = wanted.split(/\s+/);
  if (words.length > 7) alts.push(words.slice(0, 7).join(" "));
  if (words.length > 4) alts.push(words.slice(0, 4).join(" "));
  return Array.from(new Set(alts.filter((a) => a.length > 4 && a !== wanted)));
}

async function searchWithRetry(
  wanted: string,
  provider: (q: string, signal: AbortSignal) => Promise<ProviderResult>,
  timeoutMs: number,
): Promise<ProviderResult> {
  const queries = [wanted, ...truncatedQueries(wanted)];
  for (const q of queries) {
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), timeoutMs);
    try {
      const result = await provider(q, ac.signal).catch(() => ({
        hit: null as PosterHit | null,
        definitive: false,
      }));
      if (result.hit) return result;
    } finally {
      clearTimeout(timer);
    }
  }
  return { hit: null, definitive: true };
}

async function lookupPoster(title: string): Promise<PosterHit | null> {
  const wanted = normalizeTitle(title);
  if (!wanted) return null;

  const cacheKey = `poster:${wanted.toLowerCase()}`;
  const hit = cache.resolve<PosterHit>(cacheKey);
  if (hit) {
    if (hit.state === "fresh") return hit.entry.value;
    void refresh(cacheKey, wanted).catch(() => {});
    return hit.entry.value;
  }
  return refresh(cacheKey, wanted);
}

function refresh(cacheKey: string, wanted: string): Promise<PosterHit | null> {
  const existing = inflight.get(cacheKey);
  if (existing) return existing;

  const p = (async (): Promise<PosterHit | null> => {
    let bestResult: ProviderResult = { hit: null, definitive: false };

    try {
      bestResult = await searchWithRetry(wanted, fetchFromKitsu, KITSU_TIMEOUT_MS).catch(() => ({
        hit: null,
        definitive: false,
      }));

      if (!bestResult.hit) {
        const jikanRes = await searchWithRetry(wanted, fetchFromJikan, JIKAN_TIMEOUT_MS).catch(() => ({
          hit: null,
          definitive: false,
        }));
        if (jikanRes.hit) {
          bestResult = jikanRes;
        } else if (jikanRes.definitive) {
          bestResult.definitive = true;
        }
      }

      const hit = bestResult.hit;
      const ttl = hit?.matched ? HIT_TTL : bestResult.definitive ? MISS_TTL : RETRY_TTL;
      cache.set(cacheKey, hit ?? { url: "", matched: false }, ttl, HIT_TTL);
      return hit;
    } catch {
      return null;
    } finally {
      inflight.delete(cacheKey);
    }
  })();

  inflight.set(cacheKey, p);
  p.catch(() => inflight.delete(cacheKey));
  return p;
}

function placeholder(title: string) {
  const label = normalizeTitle(title).slice(0, 34) || "Anime";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
<stop offset="0%" stop-color="#1b1725"/><stop offset="100%" stop-color="#2a2140"/></linearGradient></defs>
<rect width="400" height="600" fill="url(#g)"/>
<circle cx="200" cy="250" r="54" fill="none" stroke="#7c3aed" stroke-width="6"/>
<path d="M186 224 L232 250 L186 276 Z" fill="#7c3aed"/>
<text x="200" y="360" font-family="system-ui,sans-serif" font-size="22" font-weight="700" fill="#e9e4f5" text-anchor="middle">${label.replace(/[<>&]/g, "")}</text>
<text x="200" y="392" font-family="system-ui,sans-serif" font-size="15" fill="#8b8499" text-anchor="middle">poster tidak tersedia</text>
</svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}

import dns from "dns/promises";

async function isAllowedFallback(url: string): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    // Whitelist domains (allow subdomains)
    const allowedDomains = [
      "otakudesu.cloud",
      "otakudesu.ltd",
      "otakudesu.cam",
      "otakudesu.cc",
      "otakudesu.bid",
      "otakudesu.wiki",
      "otakudesu.blog",
      "otakudesu.vip",
      "otakudesu.net",
      "otakudesu.org",
      "jikan.moe",
      "kitsu.io",
      "kitsu.app",
      "sankavollerei.web.id"
    ];
    
    const isDomainAllowed = allowedDomains.some(
      domain => hostname === domain || hostname.endsWith(`.${domain}`)
    ) || hostname.includes("otakudesu");
    
    if (!isDomainAllowed) return false;

    // Block private/internal IPs to prevent SSRF
    const lookup = await dns.lookup(hostname);
    const ip = lookup.address;
    
    const ipv4Match = ip.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
    if (ipv4Match) {
      const parts = ipv4Match.slice(1).map(Number);
      if (parts[0] === 10) return false;
      if (parts[0] === 127) return false;
      if (parts[0] === 192 && parts[1] === 168) return false;
      if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return false;
      if (parts[0] === 169 && parts[1] === 254) return false;
      if (parts[0] === 0) return false;
    }
    
    if (ip === "::1" || ip.toLowerCase().startsWith("fc") || ip.toLowerCase().startsWith("fd") || ip.toLowerCase().startsWith("fe80")) {
      return false;
    }

    return true;
  } catch {
    return false; // Invalid URL or DNS lookup failed
  }
}

/**
 * Proxy the upstream image server-side. The host blocks browser hotlinking
 * (Referer check) but plain server-side requests pass — so if metadata
 * providers can't identify the title, we can still deliver the ORIGINAL
 * poster through our own origin. Falls back to SVG if that fails too.
 */
async function proxyUpstreamImage(url: string): Promise<NextResponse | null> {
  try {
    if (!(await isAllowedFallback(url))) return null;

    const upstream = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" },
      cache: "no-store",
      signal: AbortSignal.timeout(5000), // 5 seconds timeout
    });
    if (!upstream.ok || !upstream.headers.get("content-type")?.startsWith("image/")) return null;
    
    // Limit file size to 5MB
    const contentLength = upstream.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > 5 * 1024 * 1024) {
      return null;
    }

    const body = await upstream.arrayBuffer();
    if (body.byteLength > 5 * 1024 * 1024) {
      return null;
    }
    
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": upstream.headers.get("content-type") ?? "image/jpeg",
        // edge cache / CDN cache + browser cache
        "cache-control": "public, s-maxage=604800, max-age=604800, stale-while-revalidate=86400",
      },
    });
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sp = new URL(req.url).searchParams;
  const title = sp.get("title")?.trim() ?? "";
  const fallback = sp.get("fallback")?.trim() ?? "";

  if (!title) {
    if (/^https?:\/\//i.test(fallback)) {
      return (await proxyUpstreamImage(fallback)) ?? placeholder("Anime");
    }
    return placeholder("Anime");
  }

  const resolved = await lookupPoster(title).catch(() => null);
  if (resolved?.url && resolved.matched) {
    return NextResponse.redirect(resolved.url, 302);
  }

  // last resort: stream the upstream image through our server (bypasses
  // the hotlink Referer check that blocks it in the browser)
  if (/^https?:\/\//i.test(fallback)) {
    const proxied = await proxyUpstreamImage(fallback);
    if (proxied) return proxied;
  }
  return placeholder(title);
}

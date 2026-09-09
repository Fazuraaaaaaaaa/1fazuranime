// ---------------------------------------------------------------------------
// Genre-based recommendations for the anime detail page.
//
// Upstream's `recommendedAnimeList` is a generic "anime lain" dump that often
// ignores the title's actual genres. Instead we pull the genre listing pages
// for the current anime's top genres and rank those candidates by how many
// genres they share with it (ties broken by score). The upstream list is kept
// only as a top-up so the section is never empty.
//
// Upstream budget: max GENRE_SOURCES list pages per detail view, but genre
// pages are shared across many anime and cached (LIST TTL), so the amortized
// cost per unique view is well under one extra upstream call.
// ---------------------------------------------------------------------------

import type { AnimeCard, GenreRef } from "./types";

const DEFAULT_LIMIT = 12;
export const GENRE_SOURCES = 2;

function genreKey(g: GenreRef): string {
  return (g.genreId || g.title || "").toLowerCase();
}

function sharedGenres(current: Set<string>, candidate: AnimeCard): number {
  let n = 0;
  for (const g of candidate.genreList ?? []) if (current.has(genreKey(g))) n++;
  return n;
}

function ratingOf(c: AnimeCard): number {
  const n = Number.parseFloat(c.score ?? "");
  return Number.isFinite(n) ? n : 0;
}

/** Merge genre pages round-robin so one genre can't dominate the result. */
function interleave(groups: AnimeCard[][]): AnimeCard[] {
  const out: AnimeCard[] = [];
  const max = Math.max(0, ...groups.map((g) => g?.length ?? 0));
  for (let i = 0; i < max; i++) {
    for (const g of groups) if (g?.[i]) out.push(g[i]);
  }
  return out;
}

export function buildGenreRecommendations(params: {
  currentSlug: string;
  currentGenres: GenreRef[];
  /** Candidate lists, one per genre page (interleaved before ranking). */
  groups: AnimeCard[][];
  /** Upstream recommendations used only to top up when candidates run dry. */
  fallback?: AnimeCard[];
  limit?: number;
}): AnimeCard[] {
  const { currentSlug, currentGenres, groups, fallback = [], limit = DEFAULT_LIMIT } = params;
  const keys = new Set(currentGenres.map(genreKey));
  const seen = new Set<string>([currentSlug]); // never recommend the page itself
  const scored: { card: AnimeCard; shared: number }[] = [];

  for (const card of interleave(groups)) {
    if (!card?.animeId || seen.has(card.animeId)) continue;
    seen.add(card.animeId);
    scored.push({ card, shared: sharedGenres(keys, card) });
  }

  scored.sort((a, b) => b.shared - a.shared || ratingOf(b.card) - ratingOf(a.card));
  const out = scored.slice(0, limit).map((s) => s.card);

  if (out.length < limit) {
    for (const f of fallback) {
      if (out.length >= limit) break;
      if (!f?.animeId || seen.has(f.animeId)) continue;
      seen.add(f.animeId);
      out.push(f);
    }
  }
  return out;
}
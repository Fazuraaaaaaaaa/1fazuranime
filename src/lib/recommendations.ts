// ---------------------------------------------------------------------------
// Genre-based recommendations for the anime detail page.
//
// Ranked by weighted cosine similarity of genres, with bonus modifiers for
// rating, and basic title similarity (for picking up sequels/spin-offs).
// ---------------------------------------------------------------------------

import type { AnimeCard, GenreRef } from "./types";

const DEFAULT_LIMIT = 12;
export const GENRE_SOURCES = 2;

function genreKey(g: GenreRef): string {
  return (g.genreId || g.title || "").toLowerCase();
}

/** Get standardized words from a title > 4 chars to find related seasons */
function titleTokens(title: string): Set<string> {
  const words = (title || "").toLowerCase().replace(/[^a-z0-9]/g, " ").split(/\s+/);
  return new Set(words.filter(w => w.length > 4));
}

function ratingOf(c: AnimeCard): number {
  const n = Number.parseFloat(c.score ?? "");
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Calculates a relevance score:
 * - Cosine similarity of genres (0.0 to 1.0) * 10
 * - Score bonus: (score - 6) / 2 [max ~2.0]
 * - Title match bonus: +3 per shared word (season/sequel detector)
 */
function calculateScore(
  candidate: AnimeCard,
  baseKeys: Set<string>,
  baseTokens: Set<string>,
): number {
  // 1. Genre Overlap
  const candKeys = candidate.genreList?.map(genreKey) ?? [];
  let overlap = 0;
  for (const k of candKeys) if (baseKeys.has(k)) overlap++;
  
  let genreScore = 0;
  if (baseKeys.size > 0 && candKeys.length > 0) {
    // Cosine similarity: (A \cdot B) / (||A|| * ||B||)
    const similarity = overlap / Math.sqrt(baseKeys.size * candKeys.length);
    genreScore = similarity * 10;
  }

  // 2. Rating Bonus
  const r = ratingOf(candidate);
  const ratingBonus = r > 6 ? (r - 6) * 0.5 : 0;

  // 3. Title Token Match
  let titleBonus = 0;
  const candTokens = titleTokens(candidate.title);
  for (const t of Array.from(candTokens)) if (baseTokens.has(t)) titleBonus += 3;

  return genreScore + ratingBonus + titleBonus;
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
  currentTitle: string;
  currentGenres: GenreRef[];
  groups: AnimeCard[][];
  fallback?: AnimeCard[];
  limit?: number;
}): AnimeCard[] {
  const { currentSlug, currentTitle, currentGenres, groups, fallback = [], limit = DEFAULT_LIMIT } = params;
  
  const baseKeys = new Set(currentGenres.map(genreKey));
  const baseTokens = titleTokens(currentTitle);
  const seen = new Set<string>([currentSlug]);
  const scored: { card: AnimeCard; score: number }[] = [];

  for (const card of interleave(groups)) {
    if (!card?.animeId || seen.has(card.animeId)) continue;
    seen.add(card.animeId);
    scored.push({ card, score: calculateScore(card, baseKeys, baseTokens) });
  }

  // Sort descending by our computed similarity score
  scored.sort((a, b) => b.score - a.score || ratingOf(b.card) - ratingOf(a.card));
  const out = scored.slice(0, limit).map((s) => s.card);

  // Top-up with fallback if we haven't hit the limit
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
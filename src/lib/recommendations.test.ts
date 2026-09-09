import { describe, it, expect } from "vitest";
import { buildGenreRecommendations } from "./recommendations";
import type { AnimeCard, GenreRef } from "./types";

const card = (animeId: string, title: string, genreList?: GenreRef[], score?: string): AnimeCard =>
  ({ animeId, title, poster: "", href: `/anime/${animeId}`, genreList, score }) as AnimeCard;

const genre = (id: string): GenreRef => ({ title: id, genreId: id, href: "" });

describe("buildGenreRecommendations", () => {
  it("ranks candidates by combined cosine similarity score", () => {
    // Current: [action, comedy]
    // A: [action] -> overlap 1, len 1 -> 1 / sqrt(2*1) = 0.707 -> score 7.07
    // B: [action, comedy] -> overlap 2, len 2 -> 2 / sqrt(2*2) = 1.0 -> score 10.0
    // C: [action, comedy, drama] -> overlap 2, len 3 -> 2 / sqrt(2*3) = 0.816 -> score 8.16
    const recs = buildGenreRecommendations({
      currentSlug: "one",
      currentTitle: "One Punch",
      currentGenres: [genre("action"), genre("comedy")],
      groups: [[
        card("a", "Anime A", [genre("action")]),
        card("b", "Anime B", [genre("action"), genre("comedy")]),
        card("c", "Anime C", [genre("action"), genre("comedy"), genre("drama")]),
      ]],
    });
    expect(recs.map((r) => r.animeId)).toEqual(["b", "c", "a"]);
  });

  it("adds bonus points for rating > 6", () => {
    // Both have exact same genre overlap, but D has higher score
    const recs = buildGenreRecommendations({
      currentSlug: "one",
      currentTitle: "Normal",
      currentGenres: [genre("action")],
      groups: [[
        card("low", "Low", [genre("action")], "6.00"), // bonus 0
        card("high", "High", [genre("action")], "8.00"), // bonus 1.0
      ]],
    });
    expect(recs.map((r) => r.animeId)).toEqual(["high", "low"]);
  });

  it("adds massive bonus points for shared title tokens (sequel detector)", () => {
    // Both have same genres, but one shares the word "shippuden" (mock token length > 4)
    const recs = buildGenreRecommendations({
      currentSlug: "n1",
      currentTitle: "Naruto Adventure",
      currentGenres: [genre("action")],
      groups: [[
        card("other", "Random Anime", [genre("action")], "9.00"), // high rating
        card("seq", "Naruto Shippuden", [genre("action")], "7.00"), // shares "naruto"
      ]],
    });
    expect(recs.map((r) => r.animeId)).toEqual(["seq", "other"]);
  });

  it("excludes the current anime and dedupes across genre pages", () => {
    const recs = buildGenreRecommendations({
      currentSlug: "self",
      currentTitle: "Self",
      currentGenres: [genre("action"), genre("adventure")],
      groups: [
        [card("self", "Self"), card("dup", "Dup"), card("a", "A")],
        [card("dup", "Dup"), card("b", "B")],
      ],
    });
    const ids = recs.map((r) => r.animeId);
    expect(ids).not.toContain("self");
    expect(ids).toHaveLength(3); // dup, a, b
    expect(new Set(ids).size).toBe(3);
  });

  it("tops up with the upstream fallback list and still dedupes", () => {
    const recs = buildGenreRecommendations({
      currentSlug: "one",
      currentTitle: "One",
      currentGenres: [genre("action")],
      groups: [[card("strong", "Strong", [genre("action")])]],
      fallback: [card("strong", "Strong"), card("up1", "Up1"), card("up2", "Up2")],
      limit: 3,
    });
    expect(recs.map((r) => r.animeId)).toEqual(["strong", "up1", "up2"]);
  });

  it("respects the limit", () => {
    const groups = Array.from({ length: 20 }, (_, i) => card(`g${i}`, `G ${i}`, [genre("action")]));
    const recs = buildGenreRecommendations({
      currentSlug: "one",
      currentTitle: "One",
      currentGenres: [genre("action")],
      groups: [groups],
      limit: 5,
    });
    expect(recs).toHaveLength(5);
  });
});
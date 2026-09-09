import { describe, it, expect } from "vitest";
import { buildGenreRecommendations } from "./recommendations";
import type { AnimeCard, GenreRef } from "./types";

const card = (animeId: string, genreList?: GenreRef[], score?: string): AnimeCard =>
  ({ animeId, title: animeId, poster: "", href: `/anime/${animeId}`, genreList, score }) as AnimeCard;

const genre = (id: string): GenreRef => ({ title: id, genreId: id, href: "" });

describe("buildGenreRecommendations", () => {
  it("ranks candidates by number of shared genres, then by score", () => {
    const recs = buildGenreRecommendations({
      currentSlug: "one",
      currentGenres: [genre("action"), genre("comedy")],
      groups: [[
        card("partial", [genre("action")]),
        card("perfect", [genre("action"), genre("comedy")]),
        card("none", [genre("horror")]),
      ]],
    });
    expect(recs.map((r) => r.animeId)).toEqual(["perfect", "partial", "none"]);
  });

  it("breaks shared-genre ties using the score field", () => {
    const recs = buildGenreRecommendations({
      currentSlug: "one",
      currentGenres: [genre("action")],
      groups: [[card("low", [genre("action")], "6.50"), card("high", [genre("action")], "8.90")]],
    });
    expect(recs.map((r) => r.animeId)).toEqual(["high", "low"]);
  });

  it("excludes the current anime and dedupes across genre pages", () => {
    const recs = buildGenreRecommendations({
      currentSlug: "self",
      currentGenres: [genre("action"), genre("adventure")],
      groups: [
        [card("self"), card("dup"), card("a")],
        [card("dup"), card("b")], // "dup" appears on both genre pages
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
      currentGenres: [genre("action")],
      groups: [[card("strong", [genre("action"), genre("comedy")])]],
      fallback: [card("strong"), card("up1"), card("up2")],
      limit: 3,
    });
    expect(recs.map((r) => r.animeId)).toEqual(["strong", "up1", "up2"]);
  });

  it("respects the limit", () => {
    const groups = Array.from({ length: 20 }, (_, i) => card(`g${i}`, [genre("action")]));
    const recs = buildGenreRecommendations({
      currentSlug: "one",
      currentGenres: [genre("action")],
      groups: [groups],
      limit: 5,
    });
    expect(recs).toHaveLength(5);
  });

  it("handles missing genreList on candidates gracefully", () => {
    const recs = buildGenreRecommendations({
      currentSlug: "one",
      currentGenres: [genre("action")],
      groups: [[card("x"), card("y")]], // no genreList info at all
    });
    expect(recs.map((r) => r.animeId)).toEqual(["x", "y"]); // keeps genre-page order
  });
});
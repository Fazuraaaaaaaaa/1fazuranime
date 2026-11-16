import { MetadataRoute } from "next";
import { getHome, getGenres } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [homeRes, genresRes] = await Promise.allSettled([
    getHome(),
    getGenres(),
  ]);

  const home = homeRes.status === "fulfilled" ? homeRes.value : null;
  const genres = genresRes.status === "fulfilled" ? genresRes.value : null;

  const now = new Date();

  // Core static & listing routes
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/ongoing`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/completed`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/genre`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/search`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];

  // Dynamic anime routes (ongoing and completed from home)
  const animeMap = new Map<string, { priority: number; changeFrequency: "daily" | "weekly" }>();

  if (home?.data?.ongoing?.animeList) {
    for (const item of home.data.ongoing.animeList) {
      if (item.animeId) {
        animeMap.set(item.animeId, { priority: 0.9, changeFrequency: "daily" });
      }
    }
  }

  if (home?.data?.completed?.animeList) {
    for (const item of home.data.completed.animeList) {
      if (item.animeId && !animeMap.has(item.animeId)) {
        animeMap.set(item.animeId, { priority: 0.8, changeFrequency: "weekly" });
      }
    }
  }

  const animeRoutes: MetadataRoute.Sitemap = Array.from(animeMap.entries()).map(([slug, meta]) => ({
    url: `${SITE_URL}/anime/${slug}`,
    lastModified: now,
    changeFrequency: meta.changeFrequency,
    priority: meta.priority,
  }));

  // Dynamic genre routes
  const genreRoutes: MetadataRoute.Sitemap = [];
  if (genres?.data?.genreList) {
    for (const g of genres.data.genreList) {
      if (g.genreId) {
        genreRoutes.push({
          url: `${SITE_URL}/genre/${encodeURIComponent(g.genreId)}`,
          lastModified: now,
          changeFrequency: "weekly",
          priority: 0.7,
        });
      }
    }
  }

  return [...staticRoutes, ...animeRoutes, ...genreRoutes];
}

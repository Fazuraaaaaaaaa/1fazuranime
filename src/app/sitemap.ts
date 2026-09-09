import { MetadataRoute } from "next";
import { getHome } from "@/lib/api";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const home = await getHome().catch(() => null);

  const routes = ["", "/ongoing", "/completed", "/search"].map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: route === "" ? 1 : 0.8,
  }));

  const animeRoutes: MetadataRoute.Sitemap = [];
  
  if (home?.data?.ongoing?.animeList) {
    for (const item of home.data.ongoing.animeList) {
      animeRoutes.push({
        url: `${SITE_URL}/anime/${item.animeId}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.9,
      });
    }
  }

  return [...routes, ...animeRoutes];
}
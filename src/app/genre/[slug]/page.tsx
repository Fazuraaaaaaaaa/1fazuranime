import { getGenres, getGenreAnime } from "@/lib/api";
import { AnimeGrid } from "@/components/anime-grid";
import { PaginationNav } from "@/components/pagination-nav";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  return { title: `${decodeURIComponent(params.slug)} Anime — Genre` };
}

export default async function GenrePage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const slug = decodeURIComponent(params.slug);
  const [genresRes, list] = await Promise.all([
    getGenres().catch(() => null),
    getGenreAnime(slug, page).catch(() => null),
  ]);
  const genres = genresRes?.data.genreList ?? [];
  const animeList = list?.data.animeList ?? [];
  const pagination = list?.pagination ?? null;

  return (
    <div className="container py-8">
      <SectionHeader title={`${slug} Anime`} className="mb-6">
        <Badge variant="success">Page {page}</Badge>
      </SectionHeader>

      {genres.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {genres.map((g) => (
            <Link key={g.genreId} href={`/genre/${g.genreId}`}>
              <Badge variant={g.genreId === slug ? "default" : "secondary"}>{g.title}</Badge>
            </Link>
          ))}
        </div>
      )}

      <AnimeGrid animeList={animeList} />
      <PaginationNav
        currentPage={pagination?.currentPage ?? page}
        hasNextPage={pagination?.hasNextPage ?? false}
        hasPrevPage={pagination?.hasPrevPage ?? false}
        basePath={`/genre/${slug}`}
      />
    </div>
  );
}

import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { Star, Clock, Calendar, Tv, Building, PlayCircle } from "lucide-react";
import { getAnimeDetail, getGenreAnime } from "@/lib/api";
import type { AnimeCard } from "@/lib/types";
import { buildGenreRecommendations, GENRE_SOURCES } from "@/lib/recommendations";
import { prettyTitle, posterSrc } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EpisodeList } from "@/components/episode-list";
import { WatchlistButton } from "@/components/watchlist-button";
import { AnimeGrid } from "@/components/anime-grid";
import { SectionHeader } from "@/components/section-header";

export const dynamic = "force-dynamic"; // detail + episode list cached 1h in node-cache

export async function generateMetadata({ params }: { params: { slug: string } }) {
  try {
    const { data } = await getAnimeDetail(params.slug);
    const title = prettyTitle(data.title);
    const desc = data.synopsis?.paragraphs?.join(" ")?.slice(0, 160) || `Nonton anime ${title} subtitle Indonesia di FazurAnime.`;
    const image = `/api/poster?title=${encodeURIComponent(data.title)}&fallback=${encodeURIComponent(data.poster || "")}`;
    return {
      title,
      description: desc,
      openGraph: {
        title: `${title} | FazurAnime`,
        description: desc,
        images: [{ url: image }],
      },
      twitter: {
        card: "summary_large_image",
        title: `${title} | FazurAnime`,
        description: desc,
        images: [image],
      },
    };
  } catch {
    return { title: "Anime" };
  }
}

function MetaRow({ icon: Icon, label, value }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value?: string;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <dt className="shrink-0 font-medium">{label}:</dt>
      <dd className="truncate text-muted-foreground">{value}</dd>
    </div>
  );
}

export default async function AnimeDetailPage({ params }: { params: { slug: string } }) {
  // Upstream 404 (unknown slug) arrives as a thrown UpstreamError — map it to notFound().
  const anime = await getAnimeDetail(params.slug)
    .then((r) => r.data)
    .catch(() => null);
  if (!anime?.title) notFound();

  const firstEp = anime.episodeList?.at(-1) ?? anime.episodeList?.[0];
  const paragraphs = anime.synopsis?.paragraphs ?? [];

  // Recommended — ranked by genre overlap with this anime (top genre listing
  // pages are shared across anime and cached, so this is quota-cheap).
  const recGenres = (anime.genreList ?? []).slice(0, GENRE_SOURCES);
  const genreGroups = await Promise.all(
    recGenres.map((g) =>
      getGenreAnime(g.genreId)
        .then((r) => r.data.animeList ?? [])
        .catch(() => [] as AnimeCard[]),
    ),
  );
  const recommendations = buildGenreRecommendations({
    currentSlug: params.slug,
    currentTitle: anime.title,
    currentGenres: anime.genreList ?? [],
    groups: genreGroups,
    fallback: anime.recommendedAnimeList ?? [],
  });

  return (
    <div className="pb-12">
      <div className="relative h-56 w-full overflow-hidden md:h-72">
        <Image src={posterSrc(anime.poster, anime.title)} alt="" fill sizes="100vw" className="scale-110 object-cover blur-md" priority unoptimized />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/10" />
      </div>

      <div className="container -mt-40 md:-mt-48">
        <div className="flex flex-col gap-6 md:flex-row">
          <div className="relative z-10 mx-auto w-40 shrink-0 md:mx-0 md:w-52">
            <div className="overflow-hidden rounded-xl border shadow-2xl">
              <Image src={posterSrc(anime.poster, anime.title)} alt={anime.title} width={416} height={624} priority className="h-auto w-full object-cover" unoptimized />
            </div>
          </div>

          <div className="min-w-0 flex-1 pt-2 md:pt-24">
            <h1 className="mb-1 text-2xl font-extrabold tracking-tight md:text-3xl">{prettyTitle(anime.title)}</h1>
            {anime.japanese && <p className="mb-3 text-sm text-muted-foreground">{anime.japanese}</p>}

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {anime.score && (
                <Badge variant="warning" className="gap-1 text-sm"><Star className="h-3.5 w-3.5 fill-current" /> {anime.score}</Badge>
              )}
              <Badge variant="secondary" className="gap-1"><Tv className="h-3.5 w-3.5" /> {anime.type ?? "TV"}</Badge>
              <Badge variant={anime.status === "Completed" ? "success" : "default"}>{anime.status ?? "Ongoing"}</Badge>
            </div>

            <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm md:max-w-lg">
              <MetaRow icon={Calendar} label="Aired" value={anime.aired} />
              <MetaRow icon={Clock} label="Duration" value={anime.duration} />
              <MetaRow icon={PlayCircle} label="Episodes" value={anime.episodes?.toString()} />
              <MetaRow icon={Building} label="Studio" value={anime.studios} />
              <MetaRow icon={Tv} label="Producers" value={anime.producers} />
            </dl>

            <div className="mb-5 flex flex-wrap gap-1.5">
              {anime.genreList?.map((g) => (
                <Link key={g.genreId} href={`/genre/${g.genreId}`} className="transition-transform hover:scale-105">
                  <Badge variant="outline" className="bg-card">{g.title}</Badge>
                </Link>
              ))}
            </div>

            <div className="flex flex-wrap gap-2.5">
              {firstEp && (
                <Button asChild size="lg" className="gap-2">
                  <Link href={`/watch/${firstEp.episodeId}`}>
                    <PlayCircle className="h-5 w-5 fill-current" />
                    Watch Episode {firstEp.eps}
                  </Link>
                </Button>
              )}
              <WatchlistButton entry={{
                animeId: params.slug,
                title: anime.title,
                poster: anime.poster,
                score: anime.score,
                type: anime.type,
                totalEpisodes: anime.episodes,
              }} />
            </div>
          </div>
        </div>

        <section className="mt-10">
          <SectionHeader title="Synopsis" />
          <div className="max-w-3xl space-y-3 text-sm leading-relaxed text-muted-foreground">
            {paragraphs.length > 0
              ? paragraphs.map((p, i) => <p key={i}>{p}</p>)
              : <p className="italic">No synopsis available for this title yet.</p>}
          </div>
        </section>

        <section className="mt-10">
          <SectionHeader title="Episodes">
            <Badge variant="secondary">{anime.episodeList?.length ?? 0}</Badge>
          </SectionHeader>
          <EpisodeList episodes={anime.episodeList ?? []} />
        </section>

        {recommendations.length > 0 && (
          <section className="mt-10">
            <SectionHeader title="Rekomendasi Sejenis">
              {recGenres.length > 0 && (
                <div className="hidden items-center gap-1.5 md:flex">
                  <span className="text-xs text-muted-foreground">Berdasarkan genre:</span>
                  {recGenres.map(g => (
                    <Badge key={g.genreId} variant="outline" className="text-[10px] uppercase font-normal">{g.title}</Badge>
                  ))}
                </div>
              )}
            </SectionHeader>
            <AnimeGrid animeList={recommendations} />
          </section>
        )}
      </div>
    </div>
  );
}

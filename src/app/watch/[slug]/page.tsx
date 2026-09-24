import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getEpisode, getAnimeDetail, sanitizeWatchServers } from "@/lib/api";
import { WatchClient } from "@/components/watch-client";
import { slugToTitle } from "@/lib/utils";

interface Props {
  params: { slug: string };
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: `${slugToTitle(params.slug)} — Watch` };
}

export default async function WatchPage({ params }: Props) {
  let episode;
  try {
    episode = (await getEpisode(params.slug)).data;
  } catch (err: any) {
    if (err?.status === 404) notFound();
    throw err;
  }

  // Playlist: prefer the embedded parent info, otherwise fetch the anime detail
  const episodes =
    episode.anime?.episodeList?.length
      ? episode.anime.episodeList
      : (
          await getAnimeDetail(episode.animeId).catch(() => null)
        )?.data.episodeList ?? [];

  return (
    <div className="container max-w-5xl py-6">
      <nav className="mb-3 text-sm text-muted-foreground">
        <Link href={`/anime/${episode.animeId}`} className="hover:text-primary">
          {episode.anime?.title ?? slugToTitle(episode.animeId)}
        </Link>
        <span className="mx-1.5">/</span>
        <span className="text-foreground">{episode.title}</span>
      </nav>
      <WatchClient episode={episode} episodes={episodes} slug={params.slug} groups={sanitizeWatchServers(episode)} />
    </div>
  );
}

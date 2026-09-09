"use client";

import { useHistory } from "@/lib/local-storage";
import { AnimeGrid } from "./anime-grid";
import { SectionHeader } from "./section-header";
import { History } from "lucide-react";
import { Badge } from "./ui/badge";

export function ContinueWatchingSection() {
  const { continueWatching } = useHistory();

  if (continueWatching.length === 0) return null;

  const cards = continueWatching.slice(0, 6).map((h) => ({
    title: h.animeTitle,
    poster: h.poster,
    animeId: h.animeId,
    href: `/anime/${h.animeId}`,
    episodes: h.episodeNumber,
    status: h.episodeTitle ? `Eps: ${h.episodeTitle}` : undefined,
  }));

  return (
    <section>
      <SectionHeader title="Lanjutkan Menonton" href="/my-list">
        <Badge variant="secondary" className="gap-1">
          <History className="h-3 w-3" /> Riwayat
        </Badge>
      </SectionHeader>
      <AnimeGrid animeList={cards} />
    </section>
  );
}

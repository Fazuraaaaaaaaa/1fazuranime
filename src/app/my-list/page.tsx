"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, History, Play, Trash2 } from "lucide-react";
import { useWatchlist, useHistory } from "@/lib/local-storage";
import { AnimeCard } from "@/components/anime-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prettyTitle, timeAgo, cn, posterSrc } from "@/lib/utils";
import type { AnimeCard as AnimeCardType } from "@/lib/types";

type Tab = "watchlist" | "continue";

export default function MyListPage() {
  const [tab, setTab] = useState<Tab>("continue");
  const { items: watchlist, remove: removeFromWatchlist } = useWatchlist();
  const { continueWatching, removeEpisode, clear } = useHistory();

  const cards: AnimeCardType[] = watchlist.map((w) => ({
    title: w.title,
    poster: w.poster,
    animeId: w.animeId,
    href: `/anime/${w.animeId}`,
    score: w.score,
    episodes: w.totalEpisodes,
  }));

  return (
    <div className="container py-8">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight">My List</h1>
        <div className="flex gap-1 rounded-lg border bg-card p-1">
          <TabBtn active={tab === "continue"} onClick={() => setTab("continue")}>
            <History className="h-4 w-4" /> Riwayat
            <Badge variant="secondary" className="ml-1">{continueWatching.length}</Badge>
          </TabBtn>
          <TabBtn active={tab === "watchlist"} onClick={() => setTab("watchlist")}>
            <Bookmark className="h-4 w-4" /> Disimpan
            <Badge variant="secondary" className="ml-1">{watchlist.length}</Badge>
          </TabBtn>
        </div>
      </div>

      {tab === "watchlist" ? (
        <WatchlistTab cards={cards} onRemove={removeFromWatchlist} />
      ) : (
        <ContinueTab items={continueWatching} onRemove={removeEpisode} onClear={clear} />
      )}
    </div>
  );
}

function WatchlistTab({
  cards,
  onRemove,
}: {
  cards: AnimeCardType[];
  onRemove: (animeId: string) => void;
}) {
  if (cards.length === 0) {
    return (
      <Empty
        icon={<Bookmark className="h-8 w-8" />}
        title="Belum ada anime yang disimpan"
        description="Simpan anime dari halaman detail untuk memantau anime yang ingin kamu tonton."
      />
    );
  }
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
      {cards.map((a) => (
        <div key={a.animeId} className="group/card relative">
          <AnimeCard anime={a} />
          <button
            type="button"
            aria-label={`Remove ${a.title} from watchlist`}
            onClick={() => onRemove(a.animeId)}
            className="absolute right-2 top-2 z-10 rounded-md bg-black/70 p-1.5 text-white opacity-0 transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover/card:opacity-100"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}

function ContinueTab({
  items,
  onRemove,
  onClear,
}: {
  items: ReturnType<typeof useHistory>["continueWatching"];
  onRemove: (episodeId: string) => void;
  onClear: () => void;
}) {
  if (items.length === 0) {
    return (
      <Empty
        icon={<History className="h-8 w-8" />}
        title="Belum ada riwayat tontonan"
        description="Episode yang baru saja kamu tonton akan muncul di sini."
      />
    );
  }
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button variant="ghost" size="sm" onClick={onClear} className="text-muted-foreground">
          <Trash2 className="mr-1.5 h-4 w-4" /> Hapus riwayat
        </Button>
      </div>
      <ul className="space-y-2">
        {items.map((h) => (
          <li
            key={h.animeId}
            className="flex items-center gap-3 rounded-lg border bg-card p-2.5 transition-colors hover:border-primary/50"
          >
            <Link href={`/anime/${h.animeId}`} className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-muted">
              {h.poster ? (
                <Image src={posterSrc(h.poster, h.animeTitle)} alt={h.animeTitle} fill sizes="56px" className="object-cover" unoptimized />
              ) : null}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={`/anime/${h.animeId}`} className="line-clamp-1 text-sm font-medium hover:text-primary">
                {prettyTitle(h.animeTitle)}
              </Link>
              <p className="line-clamp-1 text-xs text-muted-foreground">
                {h.episodeNumber != null && `EP ${h.episodeNumber} — `}
                {prettyTitle(h.episodeTitle)}
              </p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{timeAgo(h.updatedAt)}</p>
            </div>
            <Button asChild size="sm" className="shrink-0 gap-1.5">
              <Link href={`/watch/${h.episodeId}`}>
                <Play className="h-3.5 w-3.5" /> Resume
              </Link>
            </Button>
            <button
              type="button"
              aria-label="Remove from history"
              onClick={() => onRemove(h.episodeId)}
              className="shrink-0 rounded-md p-2 text-muted-foreground hover:text-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function Empty({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed p-14 text-center">
      <span className="text-muted-foreground">{icon}</span>
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      <Button asChild variant="outline" size="sm" className="mt-3">
        <Link href="/ongoing">Browse Anime</Link>
      </Button>
    </div>
  );
}

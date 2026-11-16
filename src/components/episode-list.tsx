"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, ArrowDownWideNarrow, ArrowUpNarrowWide, Check, Play, Search } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useWatchedEpisodes } from "@/lib/local-storage";
import type { EpisodeRef } from "@/lib/types";

interface Props {
  episodes: EpisodeRef[];
}

/**
 * Interactive episode list: grid/list view toggle, reverse order toggle and
 * client-side episode filter. Watched episodes are badged from localStorage.
 */
export function EpisodeList({ episodes }: Props) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [reversed, setReversed] = useState(false); // API returns newest-first
  const [filter, setFilter] = useState("");
  const watched = useWatchedEpisodes();

  const shown = useMemo(() => {
    let list = episodes;
    const q = filter.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (e) => String(e.eps).includes(q) || e.title.toLowerCase().includes(q),
      );
    }
    return reversed ? [...list].reverse() : list;
  }, [episodes, filter, reversed]);

  return (
    <div>
      {/* toolbar */}
      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Cari episode…"
            className="h-8 w-36 pl-8 text-xs sm:w-44 sm:text-sm"
          />
        </div>
        <div className="ml-auto flex items-center gap-1">
          <Button
            variant={view === "grid" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            aria-label="Grid view"
            onClick={() => setView("grid")}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={view === "list" ? "secondary" : "ghost"}
            size="icon"
            className="h-8 w-8"
            aria-label="List view"
            onClick={() => setView("list")}
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="Reverse order"
            title={reversed ? "Urutkan: Terlama dulu" : "Urutkan: Terbaru dulu"}
            onClick={() => setReversed((r) => !r)}
          >
            {reversed ? <ArrowUpNarrowWide className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {shown.length === 0 && (
        <p className="rounded-xl border border-dashed border-border/80 p-8 text-center text-sm text-muted-foreground">
          Tidak ada episode yang cocok dengan “<span className="font-semibold text-foreground">{filter}</span>”.
        </p>
      )}

      {view === "grid" ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {shown.map((e) => (
            <EpisodeTile key={e.episodeId} ep={e} watched={watched.has(e.episodeId)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {shown.map((e) => {
            const isWatched = watched.has(e.episodeId);
            return (
              <Link
                key={e.episodeId}
                href={`/watch/${e.episodeId}`}
                className={cn(
                  "group flex items-center justify-between gap-3 rounded-lg border border-border/80 bg-card px-4 py-2.5 text-sm transition-all hover:border-primary/60 hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isWatched && "opacity-75 bg-card/60",
                )}
              >
                <span className="flex min-w-0 items-center gap-2.5">
                  {isWatched ? (
                    <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                  ) : (
                    <Play className="h-3.5 w-3.5 shrink-0 text-muted-foreground opacity-60 transition-colors group-hover:text-primary group-hover:opacity-100" />
                  )}
                  <span className="truncate font-medium text-foreground group-hover:text-primary">
                    {e.title.replace(/subtitle indonesia/i, "").trim()}
                  </span>
                </span>
                <div className="flex shrink-0 items-center gap-2">
                  {isWatched && (
                    <Badge variant="success" className="px-1.5 py-0 text-[10px]">
                      Selesai
                    </Badge>
                  )}
                  {e.date && <span className="text-xs text-muted-foreground">{e.date}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

function EpisodeTile({ ep, watched }: { ep: EpisodeRef; watched: boolean }) {
  return (
    <Link
      href={`/watch/${ep.episodeId}`}
      className={cn(
        "relative flex h-10 items-center justify-center rounded-lg border border-border/80 bg-card text-xs font-semibold transition-all hover:-translate-y-0.5 hover:border-primary/60 hover:bg-primary/10 hover:text-primary hover:shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:text-sm",
        watched && "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
      )}
    >
      {watched && <Check className="absolute left-1.5 top-1.5 h-3 w-3 text-emerald-500" />}
      EP {ep.eps}
    </Link>
  );
}

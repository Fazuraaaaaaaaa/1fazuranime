"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, List, ArrowDownWideNarrow, ArrowUpNarrowWide, Check } from "lucide-react";
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
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Find episode…"
          className="h-8 w-32 text-xs sm:w-40 sm:text-sm"
        />
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
            className="h-8 w-8"
            aria-label="Reverse order"
            title={reversed ? "Newest first" : "Oldest first"}
            onClick={() => setReversed((r) => !r)}
          >
            {reversed ? <ArrowUpNarrowWide className="h-4 w-4" /> : <ArrowDownWideNarrow className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {shown.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No episode matches “{filter}”.
        </p>
      )}

      {view === "grid" ? (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {shown.map((e) => (
            <EpisodeTile key={e.episodeId} ep={e} watched={watched.has(e.episodeId)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {shown.map((e) => (
            <Link
              key={e.episodeId}
              href={`/watch/${e.episodeId}`}
              className={cn(
                "group flex items-center justify-between gap-3 rounded-lg border bg-card px-3.5 py-2.5 text-sm transition-colors hover:border-primary/60 hover:bg-accent",
                watched.has(e.episodeId) && "opacity-70",
              )}
            >
              <span className="flex min-w-0 items-center gap-2">
                {watched.has(e.episodeId) && <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
                <span className="truncate">{e.title.replace(/subtitle indonesia/i, "").trim()}</span>
              </span>
              {e.date && <span className="shrink-0 text-xs text-muted-foreground">{e.date}</span>}
            </Link>
          ))}
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
        "relative flex h-10 items-center justify-center rounded-md border bg-card text-sm font-medium transition-colors hover:border-primary/60 hover:bg-primary/10 hover:text-primary",
        watched && "border-emerald-500/40 text-emerald-500/80",
      )}
    >
      {watched && <Check className="absolute left-1 top-1 h-3 w-3 text-emerald-500" />}
      EP {ep.eps}
    </Link>
  );
}

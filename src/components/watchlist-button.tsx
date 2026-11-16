"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/lib/local-storage";
import { cn } from "@/lib/utils";
import type { WatchlistEntry } from "@/lib/types";

interface Props {
  entry: Omit<WatchlistEntry, "addedAt">;
}

/** Bookmark toggle persisted in localStorage (no auth required). */
export function WatchlistButton({ entry }: Props) {
  const { has, toggle } = useWatchlist();
  const saved = has(entry.animeId);

  return (
    <Button
      variant={saved ? "secondary" : "outline"}
      onClick={() => toggle(entry)}
      className={cn(
        "gap-2 transition-all duration-200",
        saved && "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 hover:border-primary/60",
      )}
      aria-pressed={saved}
    >
      {saved ? (
        <>
          <BookmarkCheck className="h-4 w-4 text-primary" /> Di Watchlist
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" /> Simpan ke Watchlist
        </>
      )}
    </Button>
  );
}

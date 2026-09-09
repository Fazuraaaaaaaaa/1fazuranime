"use client";

import { Bookmark, BookmarkCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/lib/local-storage";
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
      className="gap-2"
      aria-pressed={saved}
    >
      {saved ? (
        <>
          <BookmarkCheck className="h-4 w-4 text-primary" /> In Watchlist
        </>
      ) : (
        <>
          <Bookmark className="h-4 w-4" /> Add to Watchlist
        </>
      )}
    </Button>
  );
}

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { AnimeCard as AnimeCardType } from "@/lib/types";
import { AnimeCard } from "./anime-card";

interface Props {
  animeList: AnimeCardType[];
  className?: string;
  minItems?: number;
}

/** Responsive poster grid used by Ongoing / Completed / Search / Genre pages. */
export function AnimeGrid({ animeList, className, minItems = 0 }: Props) {
  const items = minItems ? [...animeList, ...Array.from({ length: Math.max(0, minItems - animeList.length) }, () => null)] : animeList;
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-3 min-[400px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6",
        className,
      )}
    >
      {items.map((a, i) =>
        a ? (
          <AnimeCard key={`${a.animeId}-${i}`} anime={a} priority={i < 6} />
        ) : (
          <div key={`sk-${i}`} className="flex flex-col overflow-hidden rounded-lg border bg-card">
            <Skeleton className="aspect-[2/3] w-full rounded-none" />
            <div className="flex flex-col gap-2 p-2.5">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          </div>
        ),
      )}
    </div>
  );
}

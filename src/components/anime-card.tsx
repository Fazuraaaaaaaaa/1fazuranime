import Image from "next/image";
import Link from "next/link";
import { Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn, prettyTitle, posterSrc } from "@/lib/utils";
import type { AnimeCard as AnimeCardType } from "@/lib/types";

interface Props {
  anime: AnimeCardType;
  /** optional badge override, e.g. "EP 10" */
  badge?: string;
  className?: string;
  priority?: boolean;
}

export function AnimeCard({ anime, badge, className, priority }: Props) {
  const epBadge = badge ?? (anime.episodes != null ? `EP ${anime.episodes}` : undefined);
  return (
    <Link
      href={`/anime/${anime.animeId}`}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card transition-all duration-300 hover:-translate-y-1.5 hover:border-primary/60 hover:shadow-xl hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background",
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        <Image
          src={posterSrc(anime.poster, anime.title)}
          alt={anime.title}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-108"
          priority={priority}
          unoptimized
        />
        {/* Play icon overlay on hover */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/25 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/90 text-primary-foreground shadow-lg backdrop-blur-sm transition-transform duration-300 group-hover:scale-110">
            <Play className="ml-0.5 h-5 w-5 fill-current" />
          </div>
        </div>

        {/* Top Badges */}
        <div className="pointer-events-none absolute inset-x-2 top-2 flex items-start justify-between gap-1">
          {epBadge ? (
            <span className="inline-flex items-center rounded-md border border-white/10 bg-primary/95 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm backdrop-blur-md">
              {epBadge}
            </span>
          ) : (
            <span />
          )}
          {anime.score && (
            <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/75 px-1.5 py-0.5 text-xs font-bold text-amber-300 shadow-sm backdrop-blur-md">
              <Star className="h-3 w-3 fill-amber-300" />
              {anime.score}
            </span>
          )}
        </div>

        {/* Bottom Banner Info */}
        {anime.releaseDay && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent p-2.5 pt-6">
            <span className="block truncate text-[11px] font-medium capitalize text-white/95 drop-shadow">
              {anime.releaseDay} • {anime.latestReleaseDate ?? anime.lastReleaseDate}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between gap-1.5 p-3">
        <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground/90 transition-colors group-hover:text-primary">
          {prettyTitle(anime.title)}
        </h3>
        {anime.status && (
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                anime.status.toLowerCase().includes("ongoing") ? "bg-emerald-500 animate-pulse" : "bg-muted-foreground/60",
              )}
            />
            <span className="text-xs font-medium text-muted-foreground">{anime.status}</span>
          </div>
        )}
      </div>
    </Link>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border/80 bg-card">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

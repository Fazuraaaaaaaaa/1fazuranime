import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
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
        "group relative flex flex-col overflow-hidden rounded-lg border bg-card transition-all duration-200 hover:-translate-y-1 hover:border-primary/60 hover:shadow-lg hover:shadow-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-muted">
        <Image
          src={posterSrc(anime.poster, anime.title)}
          alt={anime.title}
          fill
          sizes="(max-width: 640px) 45vw, (max-width: 1024px) 30vw, 220px"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          priority={priority}
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-80" />
        {epBadge && (
          <Badge className="absolute left-2 top-2 bg-primary/90 backdrop-blur">{epBadge}</Badge>
        )}
        {anime.score && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-xs font-semibold text-amber-400 backdrop-blur">
            <Star className="h-3 w-3 fill-amber-400" />
            {anime.score}
          </span>
        )}
        {anime.releaseDay && (
          <span className="absolute bottom-2 left-2 text-[11px] font-medium capitalize text-white/90">
            {anime.releaseDay} • {anime.latestReleaseDate ?? anime.lastReleaseDate}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2.5">
        <h3 className="line-clamp-2 text-sm font-medium leading-snug text-foreground/90 transition-colors group-hover:text-primary">
          {prettyTitle(anime.title)}
        </h3>
        {anime.status && (
          <span className="text-xs text-muted-foreground">{anime.status}</span>
        )}
      </div>
    </Link>
  );
}

export function AnimeCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-lg border bg-card">
      <Skeleton className="aspect-[2/3] w-full rounded-none" />
      <div className="flex flex-col gap-2 p-2.5">
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, Play, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, prettyTitle, posterSrc } from "@/lib/utils";
import type { AnimeCard } from "@/lib/types";

interface Props {
  featured: AnimeCard[];
}

/** Auto-advancing hero banner for trending/featured anime. */
export function HeroCarousel({ featured }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = featured.length;

  const next = useCallback(() => setIndex((i) => (i + 1) % count), [count]);
  const prev = useCallback(() => setIndex((i) => (i - 1 + count) % count), [count]);

  useEffect(() => {
    if (paused || count <= 1) return;
    const t = setInterval(next, 6000);
    return () => clearInterval(t);
  }, [next, paused, count]);

  if (count === 0) return null;
  const active = featured[index];

  return (
    <section
      className="relative h-[400px] w-full overflow-hidden sm:h-[440px] md:h-[480px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
      aria-label="Featured Anime Carousel"
    >
      {/* backdrop slides */}
      {featured.map((a, i) => (
        <div
          key={a.animeId}
          className={cn(
            "absolute inset-0 transition-opacity duration-700 ease-in-out",
            i === index ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          aria-hidden={i !== index}
        >
          <Image
            src={posterSrc(a.poster, a.title)}
            alt=""
            fill
            priority={i === 0}
            sizes="100vw"
            className="scale-105 object-cover object-center blur-[2px]"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/25" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        </div>
      ))}

      {/* content */}
      <div className="container relative flex h-full flex-col justify-end pb-8 sm:pb-12">
        <div key={active.animeId} className="max-w-xl animate-fade-up">
          <div className="mb-2.5 flex flex-wrap items-center gap-2">
            <Badge className="border border-white/10 bg-primary/95 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-primary-foreground shadow-sm backdrop-blur-md">
              Trending
            </Badge>
            {active.score && (
              <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-black/60 px-2 py-0.5 text-xs font-bold text-amber-300 backdrop-blur-md">
                <Star className="h-3.5 w-3.5 fill-amber-300" /> {active.score}
              </span>
            )}
            {active.releaseDay && (
              <Badge variant="secondary" className="border border-border/50 text-xs font-medium">
                {active.releaseDay} • EP {active.episodes}
              </Badge>
            )}
          </div>

          <h1 className="mb-2 line-clamp-2 text-2xl font-extrabold leading-tight tracking-tight text-foreground drop-shadow-sm sm:text-3xl md:text-4xl">
            {prettyTitle(active.title)}
          </h1>
          <p className="mb-4 text-xs font-medium text-muted-foreground sm:text-sm">
            {active.latestReleaseDate ?? active.lastReleaseDate
              ? `Latest: Episode ${active.episodes} • ${active.latestReleaseDate ?? active.lastReleaseDate}`
              : "Now airing"}
          </p>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <Button asChild size="default" className="gap-2 shadow-lg shadow-primary/25 transition-all hover:shadow-primary/40 sm:h-11 sm:px-6 sm:text-base">
              <Link href={`/anime/${active.animeId}`}>
                <Play className="h-4 w-4 fill-current" /> Watch Now
              </Link>
            </Button>
            <Button asChild size="default" variant="secondary" className="gap-1.5 border border-border/50 backdrop-blur-sm sm:h-11 sm:px-6 sm:text-base">
              <Link href={`/anime/${active.animeId}`}>
                <Info className="h-4 w-4" /> Details
              </Link>
            </Button>
          </div>
        </div>

        {/* carousel controls */}
        <div className="absolute bottom-4 right-4 flex items-center gap-2 sm:bottom-8 sm:right-6 md:right-8">
          <Button
            variant="secondary"
            size="icon"
            onClick={prev}
            aria-label="Previous slide"
            className="h-8 w-8 rounded-full border border-border/50 bg-background/80 shadow-sm backdrop-blur hover:bg-background sm:h-9 sm:w-9"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
          <div className="flex items-center gap-1.5 px-1">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70",
                )}
              />
            ))}
          </div>
          <Button
            variant="secondary"
            size="icon"
            onClick={next}
            aria-label="Next slide"
            className="h-8 w-8 rounded-full border border-border/50 bg-background/80 shadow-sm backdrop-blur hover:bg-background sm:h-9 sm:w-9"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Star, Play } from "lucide-react";
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
      className="relative h-[380px] w-full overflow-hidden md:h-[460px]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      {/* backdrop slides */}
      {featured.map((a, i) => (
        <div
          key={a.animeId}
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
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
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-background/20" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/80 via-transparent to-transparent" />
        </div>
      ))}

      {/* content */}
      <div className="container relative flex h-full flex-col justify-end pb-10">
        <div key={active.animeId} className="max-w-xl animate-fade-up">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Badge className="bg-primary/90 backdrop-blur">Trending</Badge>
            {active.score && (
              <span className="inline-flex items-center gap-1 text-sm font-semibold text-amber-400">
                <Star className="h-4 w-4 fill-amber-400" /> {active.score}
              </span>
            )}
            {active.releaseDay && (
              <Badge variant="secondary">{active.releaseDay} • EP {active.episodes}</Badge>
            )}
          </div>
          <h1 className="mb-2 line-clamp-2 text-2xl font-extrabold leading-tight tracking-tight md:text-4xl">
            {prettyTitle(active.title)}
          </h1>
          <p className="mb-5 text-sm text-muted-foreground">
            {active.latestReleaseDate ?? active.lastReleaseDate
              ? `Latest: Episode ${active.episodes} • ${active.latestReleaseDate ?? active.lastReleaseDate}`
              : "Now airing"}
          </p>
          <div className="flex gap-3">
            <Button asChild size="lg" className="gap-2">
              <Link href={`/anime/${active.animeId}`}>
                <Play className="h-4 w-4 fill-current" /> Watch Now
              </Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link href={`/anime/${active.animeId}`}>Details</Link>
            </Button>
          </div>
        </div>

        {/* controls */}
        <div className="absolute bottom-10 right-4 flex items-center gap-2 md:right-8">
          <Button variant="secondary" size="icon" onClick={prev} aria-label="Previous slide" className="rounded-full">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-1.5">
            {featured.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/70",
                )}
              />
            ))}
          </div>
          <Button variant="secondary" size="icon" onClick={next} aria-label="Next slide" className="rounded-full">
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </section>
  );
}

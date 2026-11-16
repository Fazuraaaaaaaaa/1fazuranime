"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Loader2, ArrowRight, X, Star } from "lucide-react";
import { proxyGet } from "@/lib/client";
import { useDebounce } from "@/hooks/use-debounce";
import { prettyTitle, posterSrc } from "@/lib/utils";
import type { AnimeCard } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface SearchData {
  animeList: AnimeCard[];
}

/** Search modal with 500ms debounced live suggestions (spec requirement). */
export function SearchModal() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 500);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd/Ctrl+K opens the modal anywhere on the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQuery("");
  }, [open]);

  const { data, isFetching } = useQuery({
    queryKey: ["search-suggest", debounced],
    queryFn: () =>
      proxyGet<SearchData>(
        `search/${debounced.trim().split(/\s+/).map(encodeURIComponent).join("+")}`,
      ),
    enabled: debounced.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });

  const results = (data?.data.animeList ?? []).slice(0, 6);

  const go = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  return (
    <>
      {/* Desktop Search Trigger */}
      <Button
        variant="outline"
        size="sm"
        aria-label="Search anime"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-44 items-center justify-between border-border/80 bg-muted/30 px-3 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:inline-flex lg:w-56"
      >
        <span className="inline-flex items-center gap-2">
          <Search className="h-3.5 w-3.5" />
          <span>Cari anime…</span>
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border border-border/80 bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          Ctrl K
        </kbd>
      </Button>

      {/* Mobile Search Trigger */}
      <Button
        variant="ghost"
        size="icon"
        aria-label="Search anime"
        onClick={() => setOpen(true)}
        className="md:hidden"
      >
        <Search className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[18%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0 shadow-2xl sm:rounded-xl [&>button]:hidden">
          <DialogTitle className="sr-only">Search anime</DialogTitle>
          <DialogDescription className="sr-only">Type a keyword to search the anime catalog</DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (debounced.trim()) go(`/search?q=${encodeURIComponent(debounced.trim())}`);
            }}
          >
            <div className="flex items-center gap-3 border-b border-border/80 px-4 py-1">
              {isFetching ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari judul anime… (Ctrl+K)"
                className="h-12 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {query && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={() => setQuery("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {debounced.trim().length >= 2 ? (
              <div className="max-h-[60vh] overflow-y-auto p-2">
                {results.length === 0 && !isFetching && (
                  <p className="p-6 text-center text-sm text-muted-foreground">
                    Tidak ditemukan hasil untuk “<span className="font-semibold text-foreground">{debounced}</span>”.
                  </p>
                )}
                <div className="space-y-1">
                  {results.map((a) => (
                    <button
                      key={a.animeId}
                      type="button"
                      onClick={() => go(`/anime/${a.animeId}`)}
                      className="group flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                    >
                      <Image
                        src={posterSrc(a.poster, a.title)}
                        alt={a.title}
                        width={40}
                        height={56}
                        className="h-14 w-10 shrink-0 rounded-md object-cover shadow-sm transition-transform group-hover:scale-105"
                        unoptimized
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground group-hover:text-primary">
                          {prettyTitle(a.title)}
                        </p>
                        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                          {a.status && (
                            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
                              {a.status}
                            </Badge>
                          )}
                          {a.score && (
                            <span className="inline-flex items-center gap-1 font-medium text-amber-500 dark:text-amber-400">
                              <Star className="h-3 w-3 fill-current" /> {a.score}
                            </span>
                          )}
                          {a.episodes != null && <span>• EP {a.episodes}</span>}
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </button>
                  ))}
                </div>
                <button
                  type="submit"
                  className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-border/80 p-2.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/5 hover:border-primary/50"
                >
                  Lihat semua hasil pencarian untuk “{debounced}” <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Ketik minimal 2 karakter untuk melihat saran anime.
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

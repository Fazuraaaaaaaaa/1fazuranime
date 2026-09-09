"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search, Tv, Loader2, ArrowRight } from "lucide-react";
import { proxyGet } from "@/lib/client";
import { useDebounce } from "@/hooks/use-debounce";
import { prettyTitle, posterSrc } from "@/lib/utils";
import type { AnimeCard } from "@/lib/types";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

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
      <Button variant="ghost" size="icon" aria-label="Search anime" onClick={() => setOpen(true)}>
        <Search className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="top-[20%] translate-y-0 gap-0 p-0 sm:max-w-xl [&>button]:hidden">
          <DialogTitle className="sr-only">Search anime</DialogTitle>
          <DialogDescription className="sr-only">Type a keyword to search the anime catalog</DialogDescription>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (debounced.trim()) go(`/search?q=${encodeURIComponent(debounced.trim())}`);
            }}
          >
            <div className="flex items-center gap-2 border-b px-4">
              {isFetching ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-primary" />
              ) : (
                <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search anime… (Ctrl+K)"
                className="h-12 border-0 bg-transparent px-0 focus-visible:ring-0"
              />
            </div>

            {debounced.trim().length >= 2 && (
              <div className="max-h-[50vh] overflow-y-auto p-2">
                {results.length === 0 && !isFetching && (
                  <p className="p-4 text-center text-sm text-muted-foreground">
                    No results for “{debounced}”.
                  </p>
                )}
                {results.map((a) => (
                  <button
                    key={a.animeId}
                    type="button"
                    onClick={() => go(`/anime/${a.animeId}`)}
                    className="flex w-full items-center gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent"
                  >
                    <Image
                      src={posterSrc(a.poster, a.title)}
                      alt={a.title}
                      width={36}
                      height={52}
                      className="h-[52px] w-9 rounded object-cover"
                      unoptimized
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{prettyTitle(a.title)}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.status ?? "Ongoing"}
                        {a.score ? ` • ★ ${a.score}` : ""}
                      </p>
                    </div>
                  </button>
                ))}
                <button
                  type="submit"
                  className="mt-1 flex w-full items-center justify-center gap-1 rounded-md p-2 text-xs font-medium text-primary hover:bg-accent"
                >
                  See all results for “{debounced}” <ArrowRight className="h-3 w-3" />
                </button>
              </div>
            )}
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

import { searchAnime } from "@/lib/api";
import { AnimeGrid } from "@/components/anime-grid";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export async function generateMetadata({ searchParams }: { searchParams: { q?: string } }) {
  const q = searchParams.q?.trim();
  return { title: q ? `"${q}" — Search` : "Search Anime" };
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const q = searchParams.q?.trim() ?? "";
  // Zero-result queries upstream surface as an error payload — treat as empty list.
  const res = q ? await searchAnime(q).catch(() => null) : null;
  const results = res?.data.animeList ?? [];

  return (
    <div className="container py-8">
      <SectionHeader title="Search Anime" className="mb-6">
        {q && <Badge variant="success">{results.length} results</Badge>}
      </SectionHeader>

      {/* No-JS friendly fallback form (Ctrl+K modal is the primary UX) */}
      <form action="/search" method="get" className="mb-8 flex max-w-xl gap-2">
        <Input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search anime by title…"
          aria-label="Search anime"
        />
        <Button type="submit">Search</Button>
      </form>

      {q ? (
        results.length > 0 ? (
          <AnimeGrid animeList={results} />
        ) : (
          <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
            No results found for <span className="font-semibold text-foreground">“{q}”</span>.
          </p>
        )
      ) : (
        <p className="rounded-xl border border-dashed p-10 text-center text-muted-foreground">
          Type a title above or press <kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl</kbd>{" "}
          + <kbd className="rounded border px-1.5 py-0.5 text-xs">K</kbd> to search.
        </p>
      )}
    </div>
  );
}

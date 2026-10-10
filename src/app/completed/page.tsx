import { getCompleted } from "@/lib/api";
import { AnimeGrid } from "@/components/anime-grid";
import { PaginationNav } from "@/components/pagination-nav";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Completed Anime" };

export default async function CompletedPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const result = await getCompleted(page).catch(() => null);

  return (
    <div className="container py-8">
      <SectionHeader title="Completed Anime" className="mb-6">
        <Badge variant="secondary">Page {page}</Badge>
      </SectionHeader>
      <AnimeGrid animeList={result?.data.animeList ?? []} />
      <PaginationNav
        currentPage={result?.pagination?.currentPage ?? page}
        hasNextPage={result?.pagination?.hasNextPage ?? false}
        hasPrevPage={result?.pagination?.hasPrevPage ?? false}
        basePath="/completed"
      />
    </div>
  );
}

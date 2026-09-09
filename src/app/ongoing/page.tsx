import { getOngoing } from "@/lib/api";
import { AnimeGrid } from "@/components/anime-grid";
import { PaginationNav } from "@/components/pagination-nav";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export const metadata = { title: "Ongoing Anime" };

export default async function OngoingPage({
  searchParams,
}: {
  searchParams: { page?: string };
}) {
  const page = Math.max(1, Number(searchParams.page ?? 1) || 1);
  const { data, pagination } = await getOngoing(page);

  return (
    <div className="container py-8">
      <SectionHeader title="On-Going Anime" className="mb-6">
        <Badge variant="success">Page {page}</Badge>
      </SectionHeader>
      <AnimeGrid animeList={data.animeList ?? []} />
      <PaginationNav
        currentPage={pagination?.currentPage ?? page}
        hasNextPage={pagination?.hasNextPage ?? false}
        hasPrevPage={pagination?.hasPrevPage ?? false}
        basePath="/ongoing"
      />
    </div>
  );
}

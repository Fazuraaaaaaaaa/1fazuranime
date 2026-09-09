import { AnimeGridSkeleton } from "@/components/page-skeleton";
export default function Loading() { 
  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <div className="h-8 w-48 rounded bg-muted animate-pulse" />
      <AnimeGridSkeleton count={20} />
    </div>
  );
}
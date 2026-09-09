import { Skeleton } from "@/components/ui/skeleton";

/** Skeleton grid yang meniru tata letak AnimeGrid (5 kolom di desktop). */
export function AnimeGridSkeleton({ count = 10 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="aspect-[2/3] w-full rounded-lg" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-3 w-2/5" />
        </div>
      ))}
    </div>
  );
}

/** Skeleton beranda: hero banner + dua baris grid. */
export function HomeSkeleton() {
  return (
    <div className="mx-auto max-w-7xl space-y-10 px-4 py-8">
      <Skeleton className="h-56 w-full rounded-xl md:h-72" />
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <AnimeGridSkeleton count={5} />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <AnimeGridSkeleton count={10} />
      </div>
    </div>
  );
}

/** Skeleton halaman detail anime. */
export function DetailSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <Skeleton className="h-56 w-full rounded-xl md:h-72" />
      <div className="mt-6 flex flex-col gap-6 md:flex-row">
        <Skeleton className="h-72 w-48 shrink-0 self-start rounded-lg" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-2/3" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-20 rounded-full" />
            <Skeleton className="h-6 w-14 rounded-full" />
          </div>
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton halaman watch: video player + daftar episode. */
export function WatchSkeleton() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
      <Skeleton className="aspect-video w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-5 w-1/2" />
        </div>
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
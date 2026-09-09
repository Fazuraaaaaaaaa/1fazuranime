import Link from "next/link";
import { Flame, Sparkles } from "lucide-react";
import { getHome, getCompleted } from "@/lib/api";
import { HeroCarousel } from "@/components/hero-carousel";
import { AnimeGrid } from "@/components/anime-grid";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { ContinueWatchingSection } from "@/components/continue-watching-section";

// Data freshness is governed by the SWR proxy cache (15 min for lists).
// Pages render per-request so the node-cache layer can serve stale data
// gracefully when upstream is rate-limited.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [home, completed] = await Promise.all([getHome(), getCompleted(1)]);

  const ongoing = home.data.ongoing?.animeList ?? [];
  const done = completed.data.animeList ?? [];
  const featured = ongoing.slice(0, 6);

  return (
    <div className="pb-10">
      <HeroCarousel featured={featured} />

      <div className="container mt-8 space-y-10">
        {/* Continue Watching / History */}
        <ContinueWatchingSection />

        {/* Latest Ongoing Releases */}
        <section>
          <SectionHeader title="Latest Update" href="/ongoing">
            <Badge variant="success" className="gap-1">
              <Flame className="h-3 w-3" /> Ongoing
            </Badge>
          </SectionHeader>
          <AnimeGrid animeList={ongoing} />
        </section>

        {/* Popular / Completed ranking */}
        <section>
          <SectionHeader title="Completed Anime" href="/completed">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> Tamat
            </Badge>
          </SectionHeader>
          <AnimeGrid animeList={done} />
        </section>

        {/* Watchlist teaser */}
        <section className="rounded-xl border bg-card/50 p-6 text-center">
          <h2 className="mb-1 text-lg font-bold">Never lose your spot</h2>
          <p className="mx-auto mb-4 max-w-md text-sm text-muted-foreground">
            Riwayat dan watchlist anime Anda otomatis tersimpan di browser Anda tanpa perlu login akun.
          </p>
          <Link
            href="/my-list"
            className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Buka Riwayat & List
          </Link>
        </section>
      </div>
    </div>
  );
}

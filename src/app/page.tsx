import Link from "next/link";
import { Flame, Sparkles, Tags, MessageSquare, Zap } from "lucide-react";
import { getHome, getCompleted, getSamehadakuHome, getAnimekompiHome } from "@/lib/api";
import { HeroCarousel } from "@/components/hero-carousel";
import { AnimeGrid } from "@/components/anime-grid";
import { SectionHeader } from "@/components/section-header";
import { Badge } from "@/components/ui/badge";
import { ContinueWatchingSection } from "@/components/continue-watching-section";
import { ProviderSwitcher, type ProviderType } from "@/components/provider-switcher";
import type { AnimeCard } from "@/lib/types";

// Data freshness is governed by the SWR proxy cache (15 min for lists).
// Pages render per-request so the node-cache layer can serve stale data
// gracefully when upstream is rate-limited.
export const dynamic = "force-dynamic";

interface Props {
  searchParams?: { provider?: string };
}

export default async function HomePage({ searchParams }: Props) {
  const provider = (searchParams?.provider as ProviderType) || "otakudesu";

  let ongoing: AnimeCard[] = [];
  let done: AnimeCard[] = [];
  let featured: AnimeCard[] = [];

  if (provider === "samehadaku") {
    const sameList = await getSamehadakuHome();
    ongoing = sameList;
    featured = sameList.slice(0, 6);
  } else if (provider === "animekompi") {
    const kompiList = await getAnimekompiHome();
    ongoing = kompiList;
    featured = kompiList.slice(0, 6);
  } else {
    // Default Otakudesu
    const [home, completed] = await Promise.all([
      getHome().catch(() => null),
      getCompleted(1).catch(() => null),
    ]);
    ongoing = home?.data.ongoing?.animeList ?? [];
    done = completed?.data.animeList ?? [];
    featured = ongoing.slice(0, 6);
  }

  return (
    <div className="pb-10">
      <HeroCarousel featured={featured} />

      <div className="container mt-8 space-y-10">
        {/* Multi-Provider Switcher Bar */}
        <ProviderSwitcher current={provider} />

        {/* Continue Watching / History */}
        <ContinueWatchingSection />

        {/* Genre shortcut */}
        <section className="rounded-xl border bg-card/50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Tags className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-bold">Cari berdasarkan Genre</h2>
                <p className="text-sm text-muted-foreground">Temukan anime sesuai genre favorit Anda.</p>
              </div>
            </div>
            <Link
              href="/genre"
              className="inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
            >
              Lihat Semua Genre
            </Link>
          </div>
        </section>

        {/* Releases Section */}
        <section>
          <SectionHeader
            title={
              provider === "samehadaku"
                ? "Rilis Terbaru (Samehadaku)"
                : provider === "animekompi"
                ? "Rilis Terbaru & Ongoing (Animekompi)"
                : "Latest Update"
            }
            href={provider === "otakudesu" ? "/ongoing" : `/?provider=${provider}`}
          >
            <Badge
              variant={provider === "animekompi" ? "default" : "success"}
              className={`gap-1 ${
                provider === "animekompi"
                  ? "bg-purple-600 text-white"
                  : provider === "samehadaku"
                  ? "bg-amber-600 text-white"
                  : ""
              }`}
            >
              {provider === "animekompi" ? (
                <>
                  <MessageSquare className="h-3 w-3" /> Animekompi
                </>
              ) : provider === "samehadaku" ? (
                <>
                  <Sparkles className="h-3 w-3" /> Samehadaku
                </>
              ) : (
                <>
                  <Flame className="h-3 w-3" /> Ongoing
                </>
              )}
            </Badge>
          </SectionHeader>
          <AnimeGrid animeList={ongoing} />
        </section>

        {/* Completed ranking (shown for default Otakudesu) */}
        {done.length > 0 && (
          <section>
            <SectionHeader title="Completed Anime" href="/completed">
              <Badge variant="secondary" className="gap-1">
                <Sparkles className="h-3 w-3" /> Tamat
              </Badge>
            </SectionHeader>
            <AnimeGrid animeList={done} />
          </section>
        )}

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

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  ListVideo,
  Download,
  Loader2,
  MonitorPlay,
  ShieldAlert,
  Play,
  Check,
  Search,
  ExternalLink,
} from "lucide-react";
import { proxyGet, ProxyError } from "@/lib/client";
import { useHistory } from "@/lib/local-storage";
import { slugToTitle, qualityLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetTrigger, SheetContent, SheetTitle } from "@/components/ui/sheet";
import type { EpisodeData, EpisodeRef, ServerEmbed, WatchQualityGroup, WatchServerOption } from "@/lib/types";

interface Props {
  episode: EpisodeData;
  episodes: EpisodeRef[];
  slug: string;
  groups: WatchQualityGroup[];
}

type ServerState = "pending" | "ok" | "dead" | "unresolved";

const BLOCKED_HOST = /(?:updesu|ondesu|desustream|odstream|odcdn|otakuwatch)/i;

export function WatchClient({ episode, episodes, slug, groups }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [playlistSearch, setPlaylistSearch] = useState("");
  const { record } = useHistory();

  useEffect(() => {
    record({
      animeId: episode.animeId,
      animeTitle: episode.anime?.title ?? slugToTitle(episode.animeId),
      poster: episode.anime?.poster ?? "",
      episodeId: slug,
      episodeTitle: episode.title,
      episodeNumber: episodes.find((e) => e.episodeId === slug)?.eps,
      timestamp: 0,
    });
  }, [slug, episode.animeId, episode.anime?.title, episode.anime?.poster, episode.title, episodes, record]);

  const idx = episodes.findIndex((e) => e.episodeId === slug);
  const currentEp = episodes[idx]?.eps;
  const prevHref = episode.prevEpisode?.episodeId ?? (idx > 0 ? episodes[idx - 1].episodeId : null);
  const nextHref =
    episode.nextEpisode?.episodeId ??
    (idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1].episodeId : null);

  const filteredEpisodes = useMemo(() => {
    if (!playlistSearch.trim()) return episodes;
    const q = playlistSearch.trim().toLowerCase();
    return episodes.filter(
      (e) => String(e.eps).includes(q) || e.title.toLowerCase().includes(q),
    );
  }, [episodes, playlistSearch]);

  const downloads = useMemo(
    () => episode.downloadUrl?.qualities ?? [],
    [episode.downloadUrl?.qualities],
  );
  const allServers = useMemo(() => groups.flatMap((g) => g.servers), [groups]);

  const probes = useQueries({
    queries: allServers.map((s) => ({
      queryKey: ["server-embed", s.serverId],
      queryFn: async () => {
        if (s.kind === "ext") {
          if (
            s.href.includes("/embed") ||
            s.href.includes("blogger.com/video.g") ||
            s.href.includes("ok.ru/videoembed") ||
            s.href.includes("filedon.co/embed")
          ) {
            return s.href;
          }
          const r = await proxyGet<{ url: string; host: string }>("resolve", { url: s.href });
          return r.data.url;
        }
        const endpoint = s.href && s.href.startsWith("/samehadaku/")
          ? s.href.replace(/^\//, "")
          : s.serverId.startsWith("samehadaku:")
          ? s.serverId.replace(/^samehadaku:/, "samehadaku/server/")
          : `server/${s.serverId}`;
        const r = await proxyGet<ServerEmbed>(endpoint);
        return r.data.url;
      },
      retry: false,
      staleTime: 10 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
      refetchOnWindowFocus: false,
    })),
  });

  const stateById = useMemo(() => {
    const map = new Map<string, { state: ServerState; url: string }>();
    allServers.forEach((s, i) => {
      const q = probes[i];
      const url = q?.data ?? "";
      if (url) {
        const blocked = BLOCKED_HOST.test(url);
        map.set(s.serverId, { state: blocked ? "dead" : "ok", url: blocked ? "" : url });
      } else if (q?.error) {
        const status = (q.error as ProxyError).status;
        const isTemporary = status === 429 || status === 503;
        map.set(s.serverId, { state: isTemporary ? "unresolved" : "dead", url: "" });
      } else if (!q?.isLoading && q?.isFetched) {
        map.set(s.serverId, { state: "dead", url: "" });
      } else {
        map.set(s.serverId, { state: "pending", url: "" });
      }
    });
    return map;
  }, [allServers, probes]);

  const visibleGroups = useMemo(
    () =>
      groups
        .map((g) => ({ ...g, servers: g.servers.filter((s) => stateById.get(s.serverId)?.state !== "dead") }))
        .filter((g) => g.servers.length > 0),
    [groups, stateById],
  );

  const autoId = useMemo(() => {
    // Priority order: 1080p > 720p > 480p > 360p (groups are pre-sorted by quality).
    // Pick the first available server in the highest quality group that has resolved successfully.
    for (const g of visibleGroups) {
      const ok = g.servers.find((s) => stateById.get(s.serverId)?.state === "ok");
      if (ok) return ok.serverId;
    }
    return null;
  }, [visibleGroups, stateById]);

  useEffect(() => {
    if (selected && stateById.get(selected)?.state === "dead") setSelected(null);
  }, [selected, stateById]);

  const activeId = selected ?? autoId;
  const activeServer = activeId ? allServers.find((s) => s.serverId === activeId) ?? null : null;
  const embedUrl = activeServer ? stateById.get(activeServer.serverId)?.url ?? "" : "";

  const probing = allServers.some((s) => stateById.get(s.serverId)?.state === "pending");

  // The upstream default may point to another provider; only use the resolved Mega server.
  const shownUrl = embedUrl;
  const busy = !shownUrl && probing;
  const stuck = !!activeServer && !embedUrl && !probing;

  const pickServer = (s: WatchServerOption) => {
    setSelected(s.serverId);
    const qi = allServers.findIndex((x) => x.serverId === s.serverId);
    const q = probes[qi];
    if (q && !q.data && !q.isFetching) void q.refetch();
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Video Player */}
      <div className="relative overflow-hidden rounded-xl border border-border/80 bg-black shadow-xl ring-1 ring-white/10 sm:rounded-2xl">
        {shownUrl ? (
          <div className="relative aspect-video w-full bg-black">
            <iframe
              key={shownUrl}
              src={shownUrl}
              title={episode.title}
              className="h-full w-full border-0"
              allowFullScreen
              referrerPolicy="no-referrer"
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
            />
          </div>
        ) : busy ? (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 bg-card/10 text-muted-foreground">
            <Loader2 className="h-9 w-9 animate-spin text-primary" />
            <p className="text-xs font-medium text-muted-foreground animate-pulse">Menghubungkan ke pemutar video…</p>
          </div>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2.5 p-6 text-center">
            <ShieldAlert className="h-9 w-9 text-red-500/90" />
            <p className="text-sm font-semibold text-foreground">
              {stuck ? "Server terpilih tidak bisa dihubungi — pilih server lain." : "Tidak ada server yang bisa diputar."}
            </p>
            <p className="max-w-md text-xs text-muted-foreground">
              Silakan pilih server alternatif di bawah atau gunakan link Download untuk kualitas penuh.
            </p>
          </div>
        )}
      </div>

      {/* Episode Header & Navigation Controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-border/80 bg-card/60 p-3.5 shadow-sm backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {currentEp != null && (
              <Badge className="shrink-0 font-bold uppercase tracking-wide">
                EP {currentEp}
              </Badge>
            )}
            <h1 className="truncate text-base font-bold text-foreground sm:text-lg" title={episode.title}>
              {episode.title}
            </h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={!prevHref}
          >
            <Link href={prevHref ? `/watch/${prevHref}` : "#"} aria-disabled={!prevHref}>
              <ChevronLeft className="h-4 w-4" />
              <span>Prev</span>
            </Link>
          </Button>

          {episodes.length > 0 && (
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 gap-1.5 px-3 text-xs">
                  <ListVideo className="h-4 w-4 text-primary" />
                  <span>Playlist</span>
                  <Badge variant="secondary" className="ml-0.5 px-1.5 py-0 text-[10px]">
                    {episodes.length}
                  </Badge>
                </Button>
              </SheetTrigger>
              <SheetContent className="flex w-full flex-col p-0 sm:max-w-md">
                <div className="border-b border-border/80 p-4">
                  <SheetTitle className="flex items-center gap-2 text-base font-semibold">
                    <ListVideo className="h-4 w-4 text-primary" />
                    <span>Daftar Episode</span>
                    <Badge variant="secondary" className="text-xs">{episodes.length}</Badge>
                  </SheetTitle>
                  <div className="relative mt-3">
                    <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      value={playlistSearch}
                      onChange={(e) => setPlaylistSearch(e.target.value)}
                      placeholder="Cari nomor episode…"
                      className="h-8 pl-8 text-xs"
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                  {filteredEpisodes.length === 0 ? (
                    <p className="p-6 text-center text-xs text-muted-foreground">Episode tidak ditemukan.</p>
                  ) : (
                    filteredEpisodes.map((e) => {
                      const isCurrent = e.episodeId === slug;
                      return (
                        <Link
                          key={e.episodeId}
                          href={`/watch/${e.episodeId}`}
                          className={`flex items-center justify-between rounded-lg px-3.5 py-2.5 text-sm transition-all ${
                            isCurrent
                              ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                              : "hover:bg-accent text-foreground/90"
                          }`}
                        >
                          <span className="flex items-center gap-2">
                            {isCurrent ? (
                              <Play className="h-3.5 w-3.5 fill-current" />
                            ) : (
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                            )}
                            <span>EP {e.eps}</span>
                          </span>
                          {isCurrent && (
                            <Badge variant="secondary" className="bg-primary-foreground/20 text-primary-foreground text-[10px] px-1.5 py-0">
                              Sedang Diputar
                            </Badge>
                          )}
                        </Link>
                      );
                    })
                  )}
                </div>
              </SheetContent>
            </Sheet>
          )}

          <Button
            asChild
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs"
            disabled={!nextHref}
          >
            <Link href={nextHref ? `/watch/${nextHref}` : "#"} aria-disabled={!nextHref}>
              <span>Next</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      {/* Streaming Servers Section */}
      <section className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <MonitorPlay className="h-4 w-4 text-primary" />
            <span>Pilihan Server</span>
          </h2>
          {selected && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelected(null)}
            >
              Reset ke otomatis
            </Button>
          )}
        </div>

        <div className="space-y-3.5">
          {visibleGroups.map((q) => {
            const isHD = q.title.toLowerCase().includes("1080") || q.title.toLowerCase().includes("720");
            return (
              <div key={q.title} className="rounded-lg border border-border/50 bg-background/40 p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant={isHD ? "hd" : "secondary"}>
                    {qualityLabel(q.title)}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {q.servers.map((s) => {
                    const active = activeId === s.serverId;
                    return (
                      <Button
                        key={s.serverId}
                        size="sm"
                        variant={active ? "default" : "secondary"}
                        className={`h-7 px-2.5 text-xs transition-all ${
                          active
                            ? "shadow-sm font-semibold"
                            : "border border-border/40 hover:border-primary/40 text-foreground"
                        }`}
                        disabled={busy}
                        onClick={() => pickServer(s)}
                      >
                        {active && <Check className="mr-1 h-3 w-3" />}
                        {s.title}
                      </Button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {visibleGroups.length === 0 && allServers.length > 0 && !probing && (
            <p className="rounded-lg border border-dashed border-border/80 p-4 text-center text-xs text-muted-foreground">
              Semua server mirror sedang tidak bisa diakses — silakan gunakan tombol Download di bawah.
            </p>
          )}

          {allServers.length === 0 && (
            <p className="rounded-lg border border-dashed border-border/80 p-4 text-center text-xs text-muted-foreground">
              Tidak ada mirror server tambahan — memutar pemutar bawaan.
            </p>
          )}
        </div>
      </section>

      {/* Downloads Section */}
      {downloads.length > 0 && (
        <section className="rounded-xl border border-border/80 bg-card/60 p-4 shadow-sm backdrop-blur-sm sm:p-5">
          <h2 className="mb-3.5 flex items-center gap-2 text-sm font-semibold">
            <Download className="h-4 w-4 text-primary" />
            <span>Download Episode</span>
          </h2>
          <div className="space-y-3">
            {downloads.map((q) => {
              const isHD = q.title.toLowerCase().includes("1080") || q.title.toLowerCase().includes("720");
              return (
                <div key={q.title} className="rounded-lg border border-border/60 bg-background/40 p-3 transition-colors hover:border-border">
                  <div className="mb-2.5 flex items-center justify-between">
                    <Badge variant={isHD ? "hd" : "secondary"}>
                      {qualityLabel(q.title)}
                    </Badge>
                    {q.size && <span className="text-xs font-mono text-muted-foreground">{q.size}</span>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {q.urls.map((u) => (
                      <a key={u.url} href={u.url} target="_blank" rel="noopener noreferrer nofollow">
                        <Button variant="outline" size="sm" className="h-7 gap-1 px-2.5 text-xs transition-colors hover:bg-primary hover:text-primary-foreground hover:border-primary">
                          <span>{u.title}</span>
                          <ExternalLink className="h-3 w-3 opacity-70" />
                        </Button>
                      </a>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

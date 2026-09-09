"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useQueries } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, ListVideo, Download, Loader2, MonitorPlay, ShieldAlert } from "lucide-react";
import { proxyGet, ProxyError } from "@/lib/client";
import { useHistory } from "@/lib/local-storage";
import { slugToTitle, qualityLabel } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetTrigger, SheetContent } from "@/components/ui/sheet";
import type { EpisodeData, EpisodeRef, ServerEmbed, WatchQualityGroup, WatchServerOption } from "@/lib/types";

interface Props {
  episode: EpisodeData;
  episodes: EpisodeRef[];
  slug: string;
  groups: WatchQualityGroup[];
}

type ServerState = "pending" | "ok" | "dead" | "unresolved";

const BLOCKED_HOST = /desustream\.(net|com)/i;

export function WatchClient({ episode, episodes, slug, groups }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
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
  const prevHref = episode.prevEpisode?.episodeId ?? (idx > 0 ? episodes[idx - 1].episodeId : null);
  const nextHref =
    episode.nextEpisode?.episodeId ??
    (idx >= 0 && idx < episodes.length - 1 ? episodes[idx + 1].episodeId : null);

  const downloads = episode.downloadUrl?.qualities ?? [];
  const allServers = useMemo(() => groups.flatMap((g) => g.servers), [groups]);

  const probes = useQueries({
    queries: allServers.map((s) => ({
      queryKey: ["server-embed", s.serverId],
      queryFn: async () => {
        if (s.kind === "ext") {
          const r = await proxyGet<{ url: string; host: string }>("resolve", { url: s.href });
          return r.data.url;
        }
        const r = await proxyGet<ServerEmbed>(`server/${s.serverId}`);
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
        const blocked = s.kind === "server" && BLOCKED_HOST.test(url);
        map.set(s.serverId, { state: blocked ? "dead" : "ok", url: blocked ? "" : url });
      } else if (q?.error) {
        const status = (q.error as ProxyError).status;
        const dead = s.kind === "ext" && status === 502;
        map.set(s.serverId, { state: dead ? "dead" : "unresolved", url: "" });
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
    const native = visibleGroups.filter((g) => g.servers.some((s) => s.kind === "server"));
    const ext = visibleGroups.filter((g) => !g.servers.some((s) => s.kind === "server"));
    for (const g of [...native].reverse().concat(ext)) {
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
  const badDefault = BLOCKED_HOST.test(episode.defaultStreamingUrl ?? "");
  const fallbackUrl = !activeServer && !probing && !badDefault ? episode.defaultStreamingUrl ?? "" : "";
  const shownUrl = embedUrl || fallbackUrl;
  const busy = !shownUrl && probing;
  const stuck = !!activeServer && !embedUrl && !probing;

  const pickServer = (s: WatchServerOption) => {
    setSelected(s.serverId);
    const qi = allServers.findIndex((x) => x.serverId === s.serverId);
    const q = probes[qi];
    if (q && !q.data && !q.isFetching) void q.refetch();
  };

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-xl border bg-black">
        {shownUrl ? (
          <iframe
            key={shownUrl}
            src={shownUrl}
            title={episode.title}
            className="aspect-video w-full"
            allowFullScreen
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          />
        ) : busy ? (
          <div className="flex aspect-video w-full items-center justify-center text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="flex aspect-video w-full flex-col items-center justify-center gap-2 p-6 text-center">
            <ShieldAlert className="h-8 w-8 text-red-500" />
            <p className="text-sm font-medium">
              {stuck ? "Server terpilih tidak bisa dihubungi — pilih server lain." : "Tidak ada server yang bisa diputar."}
            </p>
            <p className="text-xs text-muted-foreground">
              Gunakan tombol Download di bawah untuk menonton kualitas penuh.
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="min-w-0 flex-1 truncate text-base font-bold md:text-lg">{episode.title}</h1>
        {episodes.length > 0 && (
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <ListVideo className="h-4 w-4" /> Playlist
              </Button>
            </SheetTrigger>
            <SheetContent className="flex flex-col p-0">
              <div className="border-b p-4 text-sm font-semibold">Episode List</div>
              <div className="flex-1 overflow-y-auto p-2">
                {episodes.map((e) => (
                  <Link
                    key={e.episodeId}
                    href={`/watch/${e.episodeId}`}
                    className={`block rounded-md px-3 py-2 text-sm ${
                      e.episodeId === slug ? "bg-primary text-primary-foreground" : "hover:bg-accent"
                    }`}
                  >
                    EP {e.eps}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        )}
        <Button asChild variant="outline" size="sm" disabled={!prevHref}>
          <Link href={prevHref ? `/watch/${prevHref}` : "#"} aria-disabled={!prevHref}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm" disabled={!nextHref}>
          <Link href={nextHref ? `/watch/${nextHref}` : "#"} aria-disabled={!nextHref}>
            Next <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      <section className="rounded-xl border bg-card p-4">
        <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
          <MonitorPlay className="h-4 w-4 text-primary" /> Servers
          {selected && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setSelected(null)}
            >
              Reset to default
            </Button>
          )}
        </h2>
        <div className="space-y-3">
          {visibleGroups.map((q) => (
            <div key={q.title}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">{qualityLabel(q.title)}</p>
              <div className="flex flex-wrap gap-1.5">
                {q.servers.map((s) => {
                  const active = activeId === s.serverId;
                  return (
                    <Button
                      key={s.serverId}
                      size="sm"
                      variant={active ? "default" : "secondary"}
                      className="h-7 px-2.5 text-xs"
                      disabled={busy}
                      onClick={() => pickServer(s)}
                    >
                      {s.title}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
          {visibleGroups.length === 0 && allServers.length > 0 && !probing && (
            <p className="text-sm text-muted-foreground">
              Semua server mirror mati/diblokir — gunakan tombol Download.
            </p>
          )}
          {allServers.length === 0 && (
            <p className="text-sm text-muted-foreground">No mirror servers available — using default player.</p>
          )}
        </div>
      </section>

      {downloads.length > 0 && (
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
            <Download className="h-4 w-4 text-primary" /> Download
          </h2>
          <div className="space-y-3">
            {downloads.map((q) => (
              <div key={q.title} className="rounded-lg border p-3">
                <div className="mb-2 flex items-center gap-2">
                  <Badge variant="secondary">{qualityLabel(q.title)}</Badge>
                  {q.size && <span className="text-xs text-muted-foreground">{q.size}</span>}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {q.urls.map((u) => (
                    <a key={u.url} href={u.url} target="_blank" rel="noopener noreferrer nofollow">
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs">
                        {u.title}
                      </Button>
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

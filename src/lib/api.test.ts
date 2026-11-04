import { describe, it, expect } from "vitest";
import { sanitizeWatchServers } from "./api";
import type { EpisodeData } from "./types";

describe("sanitizeWatchServers", () => {
  it("keeps all non-blocked native servers, including Mega", () => {
    const mockEpisode: EpisodeData = {
      title: "Test Episode",
      animeId: "test-slug",
      defaultStreamingUrl: "https://non-mega.example/embed",
      server: {
        qualities: [
          {
            title: "720p",
            serverList: [
              { serverId: "srv-1", title: " Mega ", href: "https://mega.nz" },
              { serverId: "srv-2", title: "vidhide", href: "https://vidhide.com" },
              { serverId: "srv-2", title: "vidhide duplicate", href: "https://vidhide.com/duplicate" },
              { serverId: "srv-3", title: "odstream", href: "https://odstream.com" },
            ],
          },
        ],
      },
      hasPrevEpisode: false,
      hasNextEpisode: false,
      prevEpisode: null,
      nextEpisode: null,
    };

    const groups = sanitizeWatchServers(mockEpisode);
    expect(groups).toHaveLength(1);
    expect(groups[0].title).toBe("720p");
    expect(groups[0].servers).toEqual([
      { kind: "server", serverId: "srv-1", title: "Mega", href: "https://mega.nz" },
      { kind: "server", serverId: "srv-2", title: "vidhide", href: "https://vidhide.com" },
    ]);
  });

  it("adds supported 1080p download hosts and dedupes Mega so there is only 1 Mega", () => {
    const mockEpisode: EpisodeData = {
      title: "Test Episode",
      animeId: "test-slug",
      defaultStreamingUrl: "",
      server: {
        qualities: [
          {
            title: "720p",
            serverList: [{ serverId: "srv-1", title: "Mega", href: "https://mega.nz" }],
          },
        ],
      },
      downloadUrl: {
        qualities: [
          {
            title: "MKV 1080p",
            size: "1 GB",
            urls: [
              { title: "Filedon", url: "https://filedon.co/view/123" },
              { title: "Mega", url: "https://mega.nz/file/abc#key1" },
            ],
          },
          {
            title: "MP4 1080p",
            size: "800 MB",
            urls: [
              { title: "Mega", url: "https://mega.nz/file/def#key2" },
              { title: "UnsupportedHost", url: "https://unsupported.com/123" },
            ],
          },
        ],
      },
      hasPrevEpisode: false,
      hasNextEpisode: false,
      prevEpisode: null,
      nextEpisode: null,
    };

    const groups = sanitizeWatchServers(mockEpisode);
    expect(groups).toHaveLength(2);
    const g1080 = groups.find((g) => g.title === "1080p");
    expect(g1080).toBeDefined();
    // Mega comes first (always-included), then other supported hosts; second Mega is deduped
    expect(g1080?.servers).toEqual([
      {
        kind: "ext",
        serverId: "ext:https://mega.nz/file/abc#key1",
        title: "Mega",
        href: "https://mega.nz/file/abc#key1",
      },
      {
        kind: "ext",
        serverId: "ext:https://filedon.co/view/123",
        title: "Filedon",
        href: "https://filedon.co/view/123",
      },
    ]);
  });

  it("injects Mega 1080p into an existing native 1080p group", () => {
    const mockEpisode: EpisodeData = {
      title: "Test Episode",
      animeId: "test-slug",
      defaultStreamingUrl: "",
      server: {
        qualities: [
          {
            title: "1080p",
            serverList: [{ serverId: "native-1080", title: "NativeHD", href: "/server/native-1080" }],
          },
          {
            title: "720p",
            serverList: [{ serverId: "srv-720", title: "Mirror720", href: "/server/srv-720" }],
          },
        ],
      },
      downloadUrl: {
        qualities: [
          {
            title: "MKV 1080p",
            size: "1.2 GB",
            urls: [
              { title: "Mega", url: "https://mega.nz/file/xyz#keyABC" },
              { title: "Filedon", url: "https://filedon.co/view/456" },
            ],
          },
        ],
      },
      hasPrevEpisode: false,
      hasNextEpisode: false,
      prevEpisode: null,
      nextEpisode: null,
    };

    const groups = sanitizeWatchServers(mockEpisode);
    // Should have 1080p (native + Mega injected) and 720p
    expect(groups).toHaveLength(2);
    const g1080 = groups.find((g) => g.title === "1080p")!;
    expect(g1080.servers).toHaveLength(2);
    // Native server first, then Mega appended
    expect(g1080.servers[0]).toEqual({
      kind: "server",
      serverId: "native-1080",
      title: "NativeHD",
      href: "/server/native-1080",
    });
    expect(g1080.servers[1]).toEqual({
      kind: "ext",
      serverId: "ext:https://mega.nz/file/xyz#keyABC",
      title: "Mega",
      href: "https://mega.nz/file/xyz#keyABC",
    });
    // Filedon is NOT included because native 1080p already exists (only Mega is always injected)
  });

  it("recognizes supported download hosts even when URL is a redirector link like desustream", () => {
    const mockEpisode: EpisodeData = {
      title: "Test Episode",
      animeId: "test-slug",
      defaultStreamingUrl: "",
      server: {
        qualities: [
          {
            title: "720p",
            serverList: [{ serverId: "srv-720", title: "Mega", href: "https://mega.nz" }],
          },
        ],
      },
      downloadUrl: {
        qualities: [
          {
            title: "Mp4_1080p",
            size: "600 MB",
            urls: [
              { title: "Filedon", url: "https://link.desustream.com/?id=filedon-id" },
              { title: "Mega", url: "https://link.desustream.com/?id=mega-id" },
              { title: "GoFile", url: "https://link.desustream.com/?id=gofile-id" },
            ],
          },
        ],
      },
      hasPrevEpisode: false,
      hasNextEpisode: false,
      prevEpisode: null,
      nextEpisode: null,
    };

    const groups = sanitizeWatchServers(mockEpisode);
    const g1080 = groups.find((g) => g.title === "1080p");
    expect(g1080).toBeDefined();
    expect(g1080?.servers).toEqual([
      {
        kind: "ext",
        serverId: "ext:https://link.desustream.com/?id=mega-id",
        title: "Mega",
        href: "https://link.desustream.com/?id=mega-id",
      },
      {
        kind: "ext",
        serverId: "ext:https://link.desustream.com/?id=filedon-id",
        title: "Filedon",
        href: "https://link.desustream.com/?id=filedon-id",
      },
    ]);
  });
});
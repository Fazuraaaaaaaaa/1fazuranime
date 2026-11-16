import { describe, it, expect } from "vitest";
import { sanitizeWatchServers, ttlForPath, searchAnime, TTL } from "./api";
import type { EpisodeData } from "./types";

describe("ttlForPath", () => {
  it("resolves correct TTL for each route category", () => {
    expect(ttlForPath("server/test-srv")).toBe(TTL.SERVER);
    expect(ttlForPath("samehadaku/server/srv-same")).toBe(TTL.SERVER);
    expect(ttlForPath("episode/ep-1")).toBe(TTL.EPISODE);
    expect(ttlForPath("samehadaku/episode/ep-1")).toBe(TTL.EPISODE);
    expect(ttlForPath("anime/naruto")).toBe(TTL.DETAIL);
    expect(ttlForPath("samehadaku/anime/naruto")).toBe(TTL.DETAIL);
    expect(ttlForPath("search/naruto+shippuden")).toBe(TTL.SEARCH);
    expect(ttlForPath("home")).toBe(TTL.LIST);
    expect(ttlForPath("ongoing-anime")).toBe(TTL.LIST);
  });
});

describe("searchAnime", () => {
  it("resolves empty result without upstream call when keyword is empty or whitespace", async () => {
    const resEmpty = await searchAnime("");
    expect(resEmpty.data.animeList).toEqual([]);
    expect(resEmpty.cache).toBe("fresh");

    const resWhitespace = await searchAnime("   ");
    expect(resWhitespace.data.animeList).toEqual([]);
    expect(resWhitespace.cache).toBe("fresh");
  });
});

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
    // Mega from MP4 comes first, then Filedon from MKV; second Mega from MKV is deduped
    expect(g1080?.servers).toEqual([
      {
        kind: "ext",
        serverId: "ext:https://mega.nz/file/def#key2",
        title: "Mega",
        href: "https://mega.nz/file/def#key2",
      },
      {
        kind: "ext",
        serverId: "ext:https://filedon.co/view/123",
        title: "Filedon",
        href: "https://filedon.co/view/123",
      },
    ]);
  });

  it("injects supported 1080p hosts (Mega, Filedon, etc.) into an existing native 1080p group", () => {
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
              { title: "VikingFile", url: "https://vikingfile.com/f/v789" },
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
    const g1080 = groups.find((g) => g.title === "1080p")!;
    expect(g1080.servers).toEqual([
      {
        kind: "server",
        serverId: "native-1080",
        title: "NativeHD",
        href: "/server/native-1080",
      },
      {
        kind: "ext",
        serverId: "ext:https://mega.nz/file/xyz#keyABC",
        title: "Mega",
        href: "https://mega.nz/file/xyz#keyABC",
      },
      {
        kind: "ext",
        serverId: "ext:https://filedon.co/view/456",
        title: "Filedon",
        href: "https://filedon.co/view/456",
      },
      {
        kind: "ext",
        serverId: "ext:https://vikingfile.com/f/v789",
        title: "VikingFile",
        href: "https://vikingfile.com/f/v789",
      },
    ]);
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
              { title: "Acefile", url: "https://link.desustream.com/?id=acefile-id" },
              { title: "VikingFile", url: "https://link.desustream.com/?id=viking-id" },
              { title: "GoFile", url: "https://link.desustream.com/?id=gofile-id" },
              { title: "Pdrain", url: "https://link.desustream.com/?id=pdrain-id" },
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
    // Mega, Filedon, VikingFile, Acefile are included and playable; GoFile and Pdrain are excluded from streaming
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
      {
        kind: "ext",
        serverId: "ext:https://link.desustream.com/?id=viking-id",
        title: "VikingFile",
        href: "https://link.desustream.com/?id=viking-id",
      },
      {
        kind: "ext",
        serverId: "ext:https://link.desustream.com/?id=acefile-id",
        title: "Acefile",
        href: "https://link.desustream.com/?id=acefile-id",
      },
    ]);
  });

  it("strictly enforces priority ordering 1080p > 720p > 480p > 360p regardless of upstream input order", () => {
    const mockEpisode: EpisodeData = {
      title: "Test Episode",
      animeId: "test-slug",
      defaultStreamingUrl: "",
      server: {
        qualities: [
          {
            title: "360p",
            serverList: [{ serverId: "srv-360", title: "Mirror360", href: "/server/360" }],
          },
          {
            title: "720p",
            serverList: [{ serverId: "srv-720", title: "Mirror720", href: "/server/720" }],
          },
          {
            title: "480p",
            serverList: [{ serverId: "srv-480", title: "Mirror480", href: "/server/480" }],
          },
        ],
      },
      downloadUrl: {
        qualities: [
          {
            title: "MP4 1080p",
            size: "500 MB",
            urls: [{ title: "Mega", url: "https://mega.nz/file/abc#key1" }],
          },
        ],
      },
      hasPrevEpisode: false,
      hasNextEpisode: false,
      prevEpisode: null,
      nextEpisode: null,
    };

    const groups = sanitizeWatchServers(mockEpisode);
    expect(groups.map((g) => g.title)).toEqual(["1080p", "720p", "480p", "360p"]);
  });

  it("gracefully handles null, undefined, or corrupted server and download data without crashing", () => {
    const corruptEpisode = {
      title: "Corrupt Episode",
      animeId: "corrupt-slug",
      server: {
        qualities: [
          null,
          {
            title: "720p",
            serverList: [
              null,
              { serverId: "", title: "Empty ID", href: "" },
              { serverId: "valid-srv", title: null, href: null },
            ],
          },
        ],
      },
      downloadUrl: {
        qualities: [
          null,
          {
            title: "MP4 1080p",
            urls: [null, { title: null, url: "" }, { title: "Filedon", url: "https://filedon.co/view/xyz" }],
          },
        ],
      },
    } as unknown as EpisodeData;

    expect(() => sanitizeWatchServers(corruptEpisode)).not.toThrow();
    const groups = sanitizeWatchServers(corruptEpisode);
    expect(groups).toHaveLength(2);
    expect(groups[0].title).toBe("1080p");
    expect(groups[0].servers[0].title).toBe("Filedon");
    expect(groups[1].title).toBe("720p");
    expect(groups[1].servers[0].serverId).toBe("valid-srv");

    // Empty episode
    expect(() => sanitizeWatchServers({} as EpisodeData)).not.toThrow();
    expect(sanitizeWatchServers({} as EpisodeData)).toEqual([]);
  });

  it("filters out empty or invalid URLs and dedupes identical external download servers", () => {
    const mockEpisode: EpisodeData = {
      title: "Test Episode",
      animeId: "test-slug",
      defaultStreamingUrl: "",
      server: { qualities: [] },
      downloadUrl: {
        qualities: [
          {
            title: "1080p",
            urls: [
              { title: "Filedon", url: "https://filedon.co/view/dup1" },
              { title: "Filedon Duplicate", url: "https://filedon.co/view/dup1" },
              { title: "Empty URL", url: "   " },
              { title: "VikingFile", url: "https://vikingfile.com/f/vik1" },
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
    expect(groups[0].title).toBe("1080p");
    expect(groups[0].servers).toHaveLength(2);
    expect(groups[0].servers[0].href).toBe("https://filedon.co/view/dup1");
    expect(groups[0].servers[1].href).toBe("https://vikingfile.com/f/vik1");
  });

  it("injects backup servers (Mega, Acefile, Icefile, Blogger) across 720p, 480p, and 360p", () => {
    const mockEpisode: EpisodeData = {
      title: "Multi-Res Episode",
      animeId: "multi-res",
      defaultStreamingUrl: "",
      server: {
        qualities: [
          {
            title: "720p",
            serverList: [
              { serverId: "otakuwatch-720", title: "otakuwatch", href: "/server/otakuwatch" }, // blocked by blocklist
            ],
          },
          {
            title: "480p",
            serverList: [
              { serverId: "vidhide-480", title: "vidhide", href: "https://vidhide.com/v/123" },
            ],
          },
        ],
      },
      downloadUrl: {
        qualities: [
          {
            title: "MP4 720p",
            urls: [
              { title: "Mega", url: "https://mega.nz/file/mega720#key720" },
              { title: "Icefile", url: "https://beta.icefile.my.id/f/ice720" },
            ],
          },
          {
            title: "MP4 480p",
            urls: [
              { title: "Mega", url: "https://mega.nz/file/mega480#key480" },
              { title: "Acefile", url: "https://acefile.co/f/480123" },
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

    // 720p had otakuwatch (blocked), so now it is powered by Mega and Icefile backup servers
    const g720 = groups.find((g) => g.title === "720p");
    expect(g720).toBeDefined();
    expect(g720?.servers).toEqual([
      { kind: "ext", serverId: "ext:https://mega.nz/file/mega720#key720", title: "Mega", href: "https://mega.nz/file/mega720#key720" },
      { kind: "ext", serverId: "ext:https://beta.icefile.my.id/f/ice720", title: "Icefile", href: "https://beta.icefile.my.id/f/ice720" },
    ]);

    // 480p had native vidhide; Mega and Acefile are appended as non-duplicate backup servers
    const g480 = groups.find((g) => g.title === "480p");
    expect(g480).toBeDefined();
    expect(g480?.servers).toEqual([
      { kind: "server", serverId: "vidhide-480", title: "vidhide", href: "https://vidhide.com/v/123" },
      { kind: "ext", serverId: "ext:https://mega.nz/file/mega480#key480", title: "Mega", href: "https://mega.nz/file/mega480#key480" },
      { kind: "ext", serverId: "ext:https://acefile.co/f/480123", title: "Acefile", href: "https://acefile.co/f/480123" },
    ]);
  });

  it("injects Samehadaku backup servers and default Blogger/Icefile embed seamlessly", () => {
    const mockEpisode: EpisodeData = {
      title: "Otakudesu Episode",
      animeId: "otaku-slug",
      defaultStreamingUrl: "",
      server: {
        qualities: [
          {
            title: "720p",
            serverList: [{ serverId: "otaku-dead-srv", title: "otakuwatch", href: "/server/dead" }],
          },
        ],
      },
      downloadUrl: { qualities: [] },
      hasPrevEpisode: false,
      hasNextEpisode: false,
      prevEpisode: null,
      nextEpisode: null,
    };

    const backupData = {
      defaultStreamingUrl: "https://www.blogger.com/video.g?token=blogger-token-123",
      server: {
        qualities: [
          {
            title: "1080p",
            serverList: [
              { serverId: "same-mega-1080", title: "Mega 1080p", href: "/samehadaku/server/same-mega-1080" },
            ],
          },
          {
            title: "720p",
            serverList: [
              { serverId: "same-blogger-720", title: "Blogspot", href: "/samehadaku/server/same-blogger-720" },
            ],
          },
        ],
      },
    };

    const groups = sanitizeWatchServers(mockEpisode, backupData);
    expect(groups).toHaveLength(2);

    // 1080p has Samehadaku Mega
    const g1080 = groups.find((g) => g.title === "1080p");
    expect(g1080).toBeDefined();
    expect(g1080?.servers[0]).toEqual({
      kind: "server",
      serverId: "samehadaku:same-mega-1080",
      title: "Mega (Samehadaku)",
      href: "/samehadaku/server/same-mega-1080",
      provider: "samehadaku",
    });

    // 720p has direct Blogger HD embed unshifted, and Blogspot server appended
    const g720 = groups.find((g) => g.title === "720p");
    expect(g720).toBeDefined();
    expect(g720?.servers[0]).toEqual({
      kind: "ext",
      serverId: "samehadaku:default:https://www.blogger.com/video.g?token=blogger-token-123",
      title: "Blogger HD (Samehadaku)",
      href: "https://www.blogger.com/video.g?token=blogger-token-123",
      provider: "samehadaku",
    });
    expect(g720?.servers[1]).toEqual({
      kind: "server",
      serverId: "samehadaku:same-blogger-720",
      title: "Blogger (Samehadaku)",
      href: "/samehadaku/server/same-blogger-720",
      provider: "samehadaku",
    });
  });

  it("injects Animekompi backup servers alongside Samehadaku and Otakudesu (Triple Backup)", () => {
    const mockEpisode: EpisodeData = {
      title: "Test Episode",
      animeId: "test-slug",
      defaultStreamingUrl: "",
      server: {
        qualities: [
          {
            title: "720p",
            serverList: [{ serverId: "otaku-1", title: "Vidhide", href: "https://vidhide.com" }],
          },
        ],
      },
      downloadUrl: { qualities: [] },
      hasPrevEpisode: false,
      hasNextEpisode: false,
      prevEpisode: null,
      nextEpisode: null,
    };

    const sameBackup = {
      defaultStreamingUrl: "https://www.blogger.com/video.g?token=same-token",
    };

    const kompiBackup = {
      defaultIframe: "https://www.blogger.com/video.g?token=kompi-token",
      episodeSlug: "kompi-ep-slug",
      mirrors: [
        {
          name: "720p [1]",
          server: "Berkasdrive",
          url: "https://dl.berkasdrive.com/streaming/?id=123",
          quality: "720p",
        },
        {
          name: "1080p [1]",
          server: "Mega",
          url: "https://mega.nz/embed/kompi-1080",
          quality: "1080p",
        },
      ],
    };

    const groups = sanitizeWatchServers(mockEpisode, sameBackup, kompiBackup);

    // Check 1080p has Animekompi Mega
    const g1080 = groups.find((g) => g.title === "1080p");
    expect(g1080).toBeDefined();
    expect(g1080?.servers.some((s) => s.provider === "animekompi" && s.title.includes("Animekompi"))).toBe(true);

    // Check 720p has Otakudesu, Samehadaku, and Animekompi servers
    const g720 = groups.find((g) => g.title === "720p");
    expect(g720).toBeDefined();
    const providers = g720?.servers.map((s) => s.provider);
    expect(providers).toContain("samehadaku");
    expect(providers).toContain("animekompi");
    expect(g720?.servers.some((s) => s.title.includes("Berkasdrive (Animekompi)"))).toBe(true);
  });
});
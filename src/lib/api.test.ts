import { describe, it, expect } from "vitest";
import { sanitizeWatchServers } from "./api";
import type { EpisodeData } from "./types";

describe("sanitizeWatchServers", () => {
  it("filters out blocklisted servers like desustream/odstream/otakuwatch", () => {
    const mockEpisode: EpisodeData = {
      title: "Test Episode",
      animeId: "test-slug",
      defaultStreamingUrl: "",
      server: {
        qualities: [
          {
            title: "720p",
            serverList: [
              { serverId: "srv-1", title: "Mega", href: "https://mega.nz" },
              { serverId: "srv-2", title: "odstream", href: "https://odstream.com" },
              { serverId: "srv-3", title: "desustream", href: "https://desustream.info" },
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
    expect(groups[0].servers).toHaveLength(1);
    expect(groups[0].servers[0].title).toBe("Mega");
  });

  it("synthesizes 1080p group when not natively present but download url is available", () => {
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
              { title: "Mega", url: "https://mega.nz/file/abc#key" },
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
    expect(g1080?.servers).toHaveLength(2);
    expect(g1080?.servers[0].kind).toBe("ext");
    expect(g1080?.servers[0].href).toBe("https://filedon.co/view/123");
  });
});
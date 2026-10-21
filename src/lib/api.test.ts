import { describe, it, expect } from "vitest";
import { sanitizeWatchServers } from "./api";
import type { EpisodeData } from "./types";

describe("sanitizeWatchServers", () => {
  it("keeps Mega as the only native streaming server", () => {
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
    ]);
  });

  it("adds only the Mega 1080p server when it is available", () => {
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
    expect(g1080?.servers).toEqual([
      {
        kind: "ext",
        serverId: "ext:https://mega.nz/file/abc#key",
        title: "Mega",
        href: "https://mega.nz/file/abc#key",
      },
    ]);
  });
});
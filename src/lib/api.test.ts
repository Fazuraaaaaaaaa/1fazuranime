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
    // Filedon accompanied Mega, and the second Mega from MP4 1080p was deduped (no 2 Megas)
    expect(g1080?.servers).toEqual([
      {
        kind: "ext",
        serverId: "ext:https://filedon.co/view/123",
        title: "Filedon",
        href: "https://filedon.co/view/123",
      },
      {
        kind: "ext",
        serverId: "ext:https://mega.nz/file/abc#key1",
        title: "Mega",
        href: "https://mega.nz/file/abc#key1",
      },
    ]);
  });
});
import { describe, expect, it } from "vitest";

import {
  buildContentHash,
  buildMediaId,
  computeFreshness,
} from "../../src/application/lookup/media-lookup-helpers.js";
import type { ClockPort } from "../../src/ports/shared/clock-port.js";

const fixedClock: ClockPort = {
  now: () => new Date("2026-01-01T00:00:00.000Z")
};

describe("movie lookup helpers", () => {
  it("computes deterministic hashes", () => {
    const first = buildContentHash({ title: "Fight Club" });
    const second = buildContentHash({ title: "Fight Club" });
    expect(first).toBe(second);
  });

  it("computes freshness windows", () => {
    const freshness = computeFreshness(fixedClock, 3600);
    expect(freshness.cacheTtlSeconds).toBe(3600);
    expect(freshness.lastFetchedAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("builds different media ids for movie and tv lookups", () => {
    const movieId = buildMediaId("tmdb", "movie", { type: "tmdbId", value: "550" });
    const tvId = buildMediaId("tmdb", "tv", { type: "tmdbId", value: "550" });

    expect(movieId).not.toBe(tvId);
  });
});

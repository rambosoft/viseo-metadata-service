import { describe, expect, it, vi } from "vitest";

import { TmdbMetadataProvider } from "../../src/adapters/provider-tmdb/tmdb-metadata-provider.js";
import type { ClockPort } from "../../src/ports/shared/clock-port.js";

const fixedClock: ClockPort = {
  now: () => new Date("2026-01-01T00:00:00.000Z")
};

describe("TmdbMetadataProvider", () => {
  it("normalizes a TV record from TMDB", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          id: 1396,
          name: "Breaking Bad",
          original_name: "Breaking Bad",
          overview: "A chemistry teacher turns to crime.",
          first_air_date: "2008-01-20",
          number_of_seasons: 5,
          number_of_episodes: 62,
          status: "Ended",
          vote_average: 8.9,
          genres: [{ id: 18, name: "Drama" }],
          poster_path: "/poster.jpg",
          backdrop_path: "/backdrop.jpg"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );

    const provider = new TmdbMetadataProvider(
      fetchImpl as typeof fetch,
      {
        baseUrl: "https://api.themoviedb.org/3",
        imageBaseUrl: "https://image.tmdb.org/t/p/w500",
        apiKey: "secret",
        timeoutMs: 1000,
        movieTtlSeconds: 3600,
        tvTtlSeconds: 7200
      },
      fixedClock
    );

    const result = await provider.lookupByIdentifier({
      tenantId: "tenant_1",
      kind: "tv",
      identifier: { type: "tmdbId", value: "1396" },
      language: "en" as never
    });

    expect(result?.record.kind).toBe("tv");
    expect(result?.record.canonicalTitle).toBe("Breaking Bad");
    if (result?.record.kind === "tv") {
      expect(result.record.seasonCount).toBe(5);
      expect(result.record.episodeCount).toBe(62);
    }
  });

  it("maps upstream failure to provider unavailable", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 503 }));

    const provider = new TmdbMetadataProvider(
      fetchImpl as typeof fetch,
      {
        baseUrl: "https://api.themoviedb.org/3",
        imageBaseUrl: "https://image.tmdb.org/t/p/w500",
        apiKey: "secret",
        timeoutMs: 1000,
        movieTtlSeconds: 3600,
        tvTtlSeconds: 7200
      },
      fixedClock
    );

    await expect(
      provider.lookupByIdentifier({
        tenantId: "tenant_1",
        kind: "tv",
        identifier: { type: "tmdbId", value: "1396" },
        language: "en" as never
      })
    ).rejects.toThrow("TMDB unavailable");
  });
});

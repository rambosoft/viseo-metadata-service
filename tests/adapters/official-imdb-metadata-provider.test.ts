import { describe, expect, it } from "vitest";

import { OfficialImdbMetadataProvider } from "../../src/adapters/provider-imdb/official-imdb-metadata-provider.js";
import type { ImdbGraphqlClientPort } from "../../src/adapters/provider-imdb/imdb-graphql-client.js";
import type { ClockPort } from "../../src/ports/shared/clock-port.js";

const fixedClock: ClockPort = {
  now: () => new Date("2026-01-01T00:00:00.000Z"),
};

describe("OfficialImdbMetadataProvider", () => {
  it("normalizes an IMDb fallback movie record", async () => {
    const graphQlClient: ImdbGraphqlClientPort = {
      async execute<T>() {
        return {
          title: {
            id: "tt7654321",
            titleText: { text: "Fallback Movie" },
            originalTitleText: { text: "Fallback Movie" },
            titleType: { text: "movie", canHaveEpisodes: false },
            ratingsSummary: { aggregateRating: 7.7, voteCount: 100 },
            releaseDate: { year: 2001, month: 9, day: 9 },
            runtime: { seconds: 6000 },
            titleGenres: { genres: [{ genre: { text: "Thriller" } }] },
            plots: { edges: [{ node: { plotText: { plainText: "IMDb-only movie." } } }] },
            credits: { edges: [] },
          },
        } as T;
      },
    };

    const provider = new OfficialImdbMetadataProvider(graphQlClient, fixedClock, {
      movieTtlSeconds: 3600,
      tvTtlSeconds: 3600,
      staleServeWindowSeconds: 86400,
    });

    const lookup = await provider.lookupByImdbId({
      tenantId: "tenant_1",
      kind: "movie",
      imdbId: "tt7654321",
      language: "en" as never,
    });

    expect(lookup?.rating).toBe(7.7);
    expect(lookup?.genres).toEqual(["Thriller"]);

    const fallbackRecord = provider.buildFallbackRecord("tenant_1", lookup!);
    expect(fallbackRecord.identifiers.imdbId).toBe("tt7654321");
    expect(fallbackRecord.kind).toBe("movie");
    expect(fallbackRecord.rating).toBe(7.7);
  });

  it("rejects a mismatched kind", async () => {
    const graphQlClient: ImdbGraphqlClientPort = {
      async execute<T>() {
        return {
          title: {
            id: "tt0903747",
            titleText: { text: "Breaking Bad" },
            titleType: { text: "tvSeries", canHaveEpisodes: true },
          },
        } as T;
      },
    };

    const provider = new OfficialImdbMetadataProvider(graphQlClient, fixedClock, {
      movieTtlSeconds: 3600,
      tvTtlSeconds: 3600,
      staleServeWindowSeconds: 86400,
    });

    const lookup = await provider.lookupByImdbId({
      tenantId: "tenant_1",
      kind: "movie",
      imdbId: "tt0903747",
      language: "en" as never,
    });

    expect(lookup).toBeNull();
  });
});

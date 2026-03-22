import { describe, expect, it } from "vitest";

import { CompositeMetadataProvider } from "../../src/adapters/providers-composite/composite-metadata-provider.js";
import type { MediaRecord } from "../../src/core/media/types.js";
import type { ImdbEnrichmentProviderPort } from "../../src/ports/providers/imdb-enrichment-provider-port.js";
import type { MetadataProviderPort } from "../../src/ports/providers/metadata-provider-port.js";

function buildTmdbMovieRecord(): MediaRecord {
  return {
    mediaId: "med_tmdb_movie" as never,
    tenantId: "tenant_1" as never,
    kind: "movie",
    canonicalTitle: "Fight Club",
    genres: ["Drama"],
    cast: [],
    images: {},
    identifiers: {
      mediaId: "med_tmdb_movie" as never,
      tmdbId: "550",
      imdbId: "tt0137523",
    },
    providerRefs: [
      {
        provider: "tmdb",
        providerRecordId: "550",
        normalizedAt: "2026-01-01T00:00:00.000Z",
        hash: "tmdb-hash",
        payload: {},
      },
    ],
    contentHash: "tmdb-hash",
    freshness: {
      lastFetchedAt: "2026-01-01T00:00:00.000Z",
      cacheTtlSeconds: 3600,
      staleAfter: "2026-01-01T01:00:00.000Z",
      refreshAfter: "2026-01-01T00:45:00.000Z",
      serveStaleUntil: "2026-01-02T01:00:00.000Z",
    },
    schemaVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    releaseDate: "1999-10-15",
    releaseYear: 1999,
    runtimeMinutes: 139,
    rating: 8.4,
  };
}

describe("CompositeMetadataProvider", () => {
  it("overrides TMDB rating with IMDb enrichment", async () => {
    const tmdbProvider: MetadataProviderPort = {
      lookupByIdentifier: async () => ({
        provider: "tmdb",
        record: buildTmdbMovieRecord(),
      }),
      search: async () => ({
        provider: "tmdb",
        sourceProviders: ["tmdb"],
        items: [],
      }),
    };
    const imdbProvider: ImdbEnrichmentProviderPort & {
      buildFallbackRecord: (tenantId: string, lookup: Awaited<ReturnType<ImdbEnrichmentProviderPort["lookupByImdbId"]>>) => MediaRecord;
    } = {
      lookupByImdbId: async () => ({
        provider: "imdb",
        kind: "movie",
        imdbId: "tt0137523",
        title: "Fight Club",
        genres: ["Drama"],
        cast: [],
        images: {},
        rating: 8.8,
        providerRef: {
          provider: "imdb",
          providerRecordId: "tt0137523",
          normalizedAt: "2026-01-01T00:01:00.000Z",
          hash: "imdb-hash",
          payload: {},
        },
      }),
      buildFallbackRecord: () => buildTmdbMovieRecord(),
    };

    const provider = new CompositeMetadataProvider(tmdbProvider, imdbProvider);
    const result = await provider.lookupByIdentifier({
      tenantId: "tenant_1",
      kind: "movie",
      identifier: { type: "imdbId", value: "tt0137523" },
      language: "en" as never,
    });

    expect(result?.provider).toBe("tmdb");
    expect(result?.record.rating).toBe(8.8);
    expect(result?.record.providerRefs.map((ref) => ref.provider)).toEqual([
      "tmdb",
      "imdb",
    ]);
  });

  it("returns an IMDb fallback record when TMDB misses an imdbId lookup", async () => {
    const tmdbProvider: MetadataProviderPort = {
      lookupByIdentifier: async () => null,
      search: async () => ({
        provider: "tmdb",
        sourceProviders: ["tmdb"],
        items: [],
      }),
    };
    const fallbackRecord = {
      ...buildTmdbMovieRecord(),
      mediaId: "med_imdb_fallback" as never,
      identifiers: {
        mediaId: "med_imdb_fallback" as never,
        imdbId: "tt7654321",
      },
      providerRefs: [
        {
          provider: "imdb",
          providerRecordId: "tt7654321",
          normalizedAt: "2026-01-01T00:01:00.000Z",
          hash: "imdb-hash",
          payload: {},
        },
      ],
      rating: 7.7,
    } satisfies MediaRecord;
    const imdbProvider: ImdbEnrichmentProviderPort & {
      buildFallbackRecord: () => MediaRecord;
    } = {
      lookupByImdbId: async () => ({
        provider: "imdb",
        kind: "movie",
        imdbId: "tt7654321",
        title: "Fallback Movie",
        genres: ["Thriller"],
        cast: [],
        images: {},
        rating: 7.7,
        providerRef: {
          provider: "imdb",
          providerRecordId: "tt7654321",
          normalizedAt: "2026-01-01T00:01:00.000Z",
          hash: "imdb-hash",
          payload: {},
        },
      }),
      buildFallbackRecord: () => fallbackRecord,
    };

    const provider = new CompositeMetadataProvider(tmdbProvider, imdbProvider);
    const result = await provider.lookupByIdentifier({
      tenantId: "tenant_1",
      kind: "movie",
      identifier: { type: "imdbId", value: "tt7654321" },
      language: "en" as never,
    });

    expect(result?.provider).toBe("imdb");
    expect(result?.record.mediaId).toBe("med_imdb_fallback");
    expect(result?.record.identifiers.imdbId).toBe("tt7654321");
  });
});

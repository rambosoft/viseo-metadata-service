import Redis from "ioredis-mock";
import { describe, expect, it } from "vitest";

import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../../src/adapters/redis-store/redis-media-snapshot-store.js";
import type { MediaRecord } from "../../src/core/media/types.js";
import { buildSearchRequestFingerprint } from "../../src/application/search/media-search-helpers.js";

function buildMovieRecord(): MediaRecord {
  return {
    mediaId: "med_1" as never,
    tenantId: "tenant_1" as never,
    kind: "movie",
    canonicalTitle: "Fight Club",
    genres: ["Drama"],
    cast: [],
    images: {},
    identifiers: {
      mediaId: "med_1" as never,
      tmdbId: "550",
      imdbId: "tt0137523"
    },
    providerRefs: [
      {
        provider: "tmdb",
        providerRecordId: "550",
        normalizedAt: "2026-01-01T00:00:00.000Z",
        hash: "hash",
        payload: {}
      }
    ],
    contentHash: "hash",
    freshness: {
      lastFetchedAt: "2026-01-01T00:00:00.000Z",
      cacheTtlSeconds: 3600,
      staleAfter: "2026-01-01T01:00:00.000Z",
      refreshAfter: "2026-01-01T00:45:00.000Z"
    },
    schemaVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z"
  };
}

function buildTvRecord(): MediaRecord {
  return {
    mediaId: "med_tv_1" as never,
    tenantId: "tenant_1" as never,
    kind: "tv",
    canonicalTitle: "Breaking Bad",
    genres: ["Crime", "Drama"],
    cast: [],
    images: {},
    identifiers: {
      mediaId: "med_tv_1" as never,
      tmdbId: "1396",
      imdbId: "tt0903747"
    },
    providerRefs: [
      {
        provider: "tmdb",
        providerRecordId: "1396",
        normalizedAt: "2026-01-01T00:00:00.000Z",
        hash: "hash-tv",
        payload: {}
      }
    ],
    contentHash: "hash-tv",
    freshness: {
      lastFetchedAt: "2026-01-01T00:00:00.000Z",
      cacheTtlSeconds: 3600,
      staleAfter: "2026-01-01T01:00:00.000Z",
      refreshAfter: "2026-01-01T00:45:00.000Z"
    },
    schemaVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    firstAirDate: "2008-01-20",
    firstAirYear: 2008,
    seasonCount: 5,
    episodeCount: 62,
    status: "Ended"
  };
}

describe("RedisMediaSnapshotStore", () => {
  it("stores and resolves a movie snapshot by tmdbId", async () => {
    const redis = new Redis();
    const store = new RedisMediaSnapshotStore(redis as never, new RedisKeyBuilder("md"), 3600, 900, 21600);
    const record = buildMovieRecord();

    await store.putSnapshot(record);

    const found = await store.getLookup(record.tenantId, "movie", {
      type: "tmdbId",
      value: "550"
    });

    expect(found?.record.canonicalTitle).toBe("Fight Club");
  });

  it("stores and resolves a TV snapshot by imdbId", async () => {
    const redis = new Redis();
    const store = new RedisMediaSnapshotStore(redis as never, new RedisKeyBuilder("md"), 3600, 900, 21600);
    const record = buildTvRecord();

    await store.putSnapshot(record);

    const found = await store.getLookup(record.tenantId, "tv", {
      type: "imdbId",
      value: "tt0903747"
    });

    expect(found?.record.kind).toBe("tv");
    expect(found?.record.canonicalTitle).toBe("Breaking Bad");
  });

  it("stores and resolves a search snapshot", async () => {
    const redis = new Redis();
    const store = new RedisMediaSnapshotStore(redis as never, new RedisKeyBuilder("md"), 3600, 900, 21600);
    const record = buildMovieRecord();
    const fingerprint = buildSearchRequestFingerprint({
      tenantId: "tenant_1",
      q: "Fight Club",
      lang: "en" as never,
      page: 1,
      pageSize: 20
    });

    await store.putSearchSnapshot(fingerprint, {
      tenantId: "tenant_1" as never,
      query: "fight club",
      lang: "en" as never,
      page: 1,
      pageSize: 20,
      total: 1,
      items: [
        {
          mediaId: record.mediaId as never,
          tenantId: record.tenantId as never,
          kind: "movie",
          title: "Fight Club",
          genres: ["Drama"],
          images: {},
          identifiers: {
            mediaId: record.mediaId as never,
            tmdbId: "550"
          }
        }
      ],
      sourceProviders: ["tmdb"],
      generatedAt: "2026-01-01T00:00:00.000Z",
      expiresAt: "2026-01-01T00:15:00.000Z"
    });

    const found = await store.getSearchSnapshot("tenant_1" as never, fingerprint);

    expect(found?.snapshot.total).toBe(1);
    expect(found?.snapshot.items[0]?.title).toBe("Fight Club");
  });

  it("indexes lookup snapshots for deterministic local search", async () => {
    const redis = new Redis();
    const store = new RedisMediaSnapshotStore(redis as never, new RedisKeyBuilder("md"), 3600, 900, 21600);
    await store.putSnapshot(buildMovieRecord());
    await store.putSnapshot(buildTvRecord());

    const found = await store.searchLocalIndex("tenant_1" as never, {
      q: "Breaking",
      kind: "tv",
      lang: "en" as never,
      page: 1,
      pageSize: 20
    });

    expect(found.total).toBe(1);
    expect(found.items[0]?.title).toBe("Breaking Bad");
  });
});

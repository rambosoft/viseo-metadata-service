import Redis from "ioredis-mock";
import { describe, expect, it } from "vitest";

import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../../src/adapters/redis-store/redis-media-snapshot-store.js";
import type { MediaRecord } from "../../src/core/media/types.js";

function buildRecord(): MediaRecord {
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

describe("RedisMediaSnapshotStore", () => {
  it("stores and resolves a movie snapshot by tmdbId", async () => {
    const redis = new Redis();
    const store = new RedisMediaSnapshotStore(redis as never, new RedisKeyBuilder("md"), 3600);
    const record = buildRecord();

    await store.putMovieSnapshot(record);

    const found = await store.getMovieLookup(record.tenantId, {
      type: "tmdbId",
      value: "550"
    });

    expect(found?.record.canonicalTitle).toBe("Fight Club");
  });
});

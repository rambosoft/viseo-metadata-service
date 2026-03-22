import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Redis } from "ioredis";

import { RedisRateLimiter } from "../../src/adapters/rate-limit/redis-rate-limiter.js";
import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../../src/adapters/redis-store/redis-media-snapshot-store.js";
import { buildSearchRequestFingerprint } from "../../src/application/search/media-search-helpers.js";
import type { MediaRecord } from "../../src/core/media/types.js";
import type { ClockPort } from "../../src/ports/shared/clock-port.js";

const redisUrl = process.env.REDIS_URL;
const fixedClock: ClockPort = {
  now: () => new Date("2026-01-01T00:00:00.000Z"),
};

function buildMovieRecord(prefix: string): MediaRecord {
  return {
    mediaId: `${prefix}_med_1` as never,
    tenantId: `${prefix}_tenant_1` as never,
    kind: "movie",
    canonicalTitle: "Fight Club",
    genres: ["Drama"],
    cast: [],
    images: {},
    identifiers: {
      mediaId: `${prefix}_med_1` as never,
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
      refreshAfter: "2026-01-01T00:45:00.000Z",
      serveStaleUntil: "2026-01-02T01:00:00.000Z",
    },
    schemaVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    releaseDate: "1999-10-15",
    releaseYear: 1999,
    runtimeMinutes: 139
  };
}

describe.skipIf(redisUrl === undefined || redisUrl.length === 0)(
  "real redis integration",
  () => {
    const prefix = `md_int_${Date.now()}`;
    const redis = new Redis(redisUrl as string, {
      keyPrefix: "",
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1
    });

    beforeAll(async () => {
      await redis.ping();
    });

    afterAll(async () => {
      await redis.quit();
    });

    it("stores and resolves snapshots against a real Redis instance", async () => {
      const store = new RedisMediaSnapshotStore(
        redis,
        new RedisKeyBuilder(prefix),
        fixedClock,
        604800,
        900,
        21600,
      );
      const record = buildMovieRecord(prefix);

      await store.putSnapshot(record);

      const found = await store.getLookup(record.tenantId, "movie", {
        type: "tmdbId",
        value: "550"
      });

      expect(found?.record.canonicalTitle).toBe("Fight Club");
    });

    it("stores and resolves search data against a real Redis instance", async () => {
      const store = new RedisMediaSnapshotStore(
        redis,
        new RedisKeyBuilder(prefix),
        fixedClock,
        604800,
        900,
        21600,
      );
      const record = buildMovieRecord(prefix);
      await store.putSnapshot(record);

      const local = await store.searchLocalIndex(record.tenantId, {
        q: "Fight Club",
        kind: "movie",
        lang: "en" as never,
        page: 1,
        pageSize: 20
      });

      expect(local.total).toBe(1);

      const fingerprint = buildSearchRequestFingerprint({
        tenantId: record.tenantId,
        q: "Fight Club",
        kind: "movie",
        lang: "en" as never,
        page: 1,
        pageSize: 20
      });

      await store.putSearchSnapshot(fingerprint, {
        tenantId: record.tenantId,
        query: "fight club",
        kind: "movie",
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

      const snapshot = await store.getSearchSnapshot(record.tenantId, fingerprint);
      expect(snapshot?.snapshot.total).toBe(1);
    });

    it("enforces rate limiting against a real Redis instance", async () => {
      const limiter = new RedisRateLimiter(redis, new RedisKeyBuilder(prefix), {
        windowSeconds: 60,
        maxRequests: 1
      });

      await limiter.consume({
        tenantId: `${prefix}_tenant_2` as never,
        principalId: "user_1",
        route: "/api/v1/media/tv"
      });

      await expect(
        limiter.consume({
          tenantId: `${prefix}_tenant_2` as never,
          principalId: "user_1",
          route: "/api/v1/media/tv"
        })
      ).rejects.toThrow("Rate limit exceeded");
    });
  }
);

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Queue, QueueEvents } from "bullmq";
import { Redis } from "ioredis";
import request from "supertest";

import { BullMqRefreshQueue } from "../../src/adapters/refresh/bullmq-refresh-queue.js";
import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../../src/adapters/redis-store/redis-media-snapshot-store.js";
import { buildSearchRequestFingerprint } from "../../src/application/search/media-search-helpers.js";
import { createBullMqConnection } from "../../src/bootstrap/create-bullmq-connection.js";
import { createRuntime } from "../../src/bootstrap/create-runtime.js";
import { createWorkerRuntime } from "../../src/bootstrap/create-worker-runtime.js";
import type { MediaRecord } from "../../src/core/media/types.js";
import type { AppConfig } from "../../src/config/env.js";
import type { ClockPort } from "../../src/ports/shared/clock-port.js";
import type { ImdbGraphqlClientPort } from "../../src/adapters/provider-imdb/imdb-graphql-client.js";

const redisUrl = process.env.REDIS_URL;
const fixedClock: ClockPort = {
  now: () => new Date("2026-01-01T00:00:00.000Z"),
};

function buildConfig(prefix: string, queueName: string): AppConfig {
  return {
    server: {
      nodeEnv: "test",
      port: 3000,
      requestBodyLimitBytes: 16384,
      logLevel: "error",
    },
    redis: {
      url: redisUrl as string,
      keyPrefix: prefix,
    },
    rateLimit: {
      windowSeconds: 60,
      maxRequests: 120,
    },
    auth: {
      serviceUrl: "http://127.0.0.1:4010",
      timeoutMs: 1000,
      cacheTtlSeconds: 300,
    },
    tmdb: {
      baseUrl: "https://api.themoviedb.org/3",
      imageBaseUrl: "https://image.tmdb.org/t/p/w500",
      apiKey: "test-token",
      timeoutMs: 1000,
      movieTtlSeconds: 3600,
      tvTtlSeconds: 3600,
      staleServeWindowSeconds: 86400,
      canonicalRecordTtlSeconds: 604800,
    },
    imdb: {
      apiUrl: "https://api-fulfill.dataexchange.us-east-1.amazonaws.com/v1",
      apiKey: "test-imdb-token",
      timeoutMs: 1000,
      awsRegion: "us-east-1",
      dataSetId: "dataset",
      revisionId: "revision",
      assetId: "asset",
    },
    coordination: {
      lookupTtlSeconds: 5,
      lookupWaitMs: 500,
    },
    search: {
      cacheTtlSeconds: 900,
      indexTtlSeconds: 21600,
    },
    refresh: {
      queueName,
      jobAttempts: 3,
      jobBackoffMs: 1000,
      workerConcurrency: 1,
      dedupTtlSeconds: 60,
      workerShutdownTimeoutMs: 30000,
    },
  };
}

const fakeImdbGraphqlClient: ImdbGraphqlClientPort = {
  async execute<T>() {
    return {
      title: {
        id: "tt0137523",
        titleText: { text: "Fight Club" },
        originalTitleText: { text: "Fight Club" },
        titleType: { text: "movie", canHaveEpisodes: false },
        ratingsSummary: { aggregateRating: 8.8, voteCount: 1000 },
        releaseDate: { year: 1999, month: 10, day: 15 },
        runtime: { seconds: 8340 },
        titleGenres: { genres: [{ genre: { text: "Drama" } }] },
        plots: { edges: [{ node: { plotText: { plainText: "IMDb plot" } } }] },
        credits: { edges: [] },
      },
    } as T;
  },
};

function buildMovieRecord(prefix: string): MediaRecord {
  return {
    mediaId: `${prefix}_med_1` as never,
    tenantId: `${prefix}_tenant_1` as never,
    kind: "movie",
    canonicalTitle: "Stale Fight Club",
    genres: ["Drama"],
    cast: [],
    images: {},
    identifiers: {
      mediaId: `${prefix}_med_1` as never,
      tmdbId: "550",
      imdbId: "tt0137523",
    },
    providerRefs: [
      {
        provider: "tmdb",
        providerRecordId: "550",
        normalizedAt: "2025-12-31T23:00:00.000Z",
        hash: "old-hash",
        payload: {},
      },
    ],
    contentHash: "old-hash",
    freshness: {
      lastFetchedAt: "2025-12-31T23:00:00.000Z",
      cacheTtlSeconds: 3600,
      staleAfter: "2025-12-31T23:30:00.000Z",
      refreshAfter: "2025-12-31T23:15:00.000Z",
      serveStaleUntil: "2026-01-02T00:00:00.000Z",
    },
    schemaVersion: 1,
    createdAt: "2025-12-31T23:00:00.000Z",
    updatedAt: "2025-12-31T23:00:00.000Z",
    releaseDate: "1999-10-15",
    releaseYear: 1999,
    runtimeMinutes: 139,
  };
}

function createProviderFetchStub() {
  return async (input: RequestInfo | URL) => {
    const url = String(input);

    if (url.includes("/movie/550")) {
      return new Response(
        JSON.stringify({
          id: 550,
          imdb_id: "tt0137523",
          title: "Fight Club",
          original_title: "Fight Club",
          overview: "Provider refreshed payload",
          release_date: "1999-10-15",
          runtime: 139,
          vote_average: 8.4,
          genres: [{ id: 18, name: "Drama" }],
          poster_path: "/poster.jpg",
          backdrop_path: "/backdrop.jpg",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("auth.example.com")) {
      return new Response(
        JSON.stringify({
          principalId: "user_1",
          tenantId: "tenant_1",
          scopes: ["metadata:read"],
          expiresAt: "2099-01-01T00:00:00.000Z",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response("{}", { status: 404 });
  };
}

async function waitForCompletion(queue: Queue, events: QueueEvents, jobId: string) {
  const job = await queue.getJob(jobId);
  if (job === null) {
    throw new Error(`Job not found: ${jobId}`);
  }
  await job.waitUntilFinished(events, 10000);
}

describe.skipIf(redisUrl === undefined || redisUrl.length === 0)(
  "real runtime integration",
  () => {
    const prefix = `md_rt_${Date.now()}`;
    const queueName = `metadata-refresh-${Date.now()}`;
    const config = buildConfig(prefix, queueName);
    let redis: Redis;
    let queue: Queue;
    let queueEvents: QueueEvents;
    let snapshotStore: RedisMediaSnapshotStore;
    let refreshQueue: BullMqRefreshQueue;
    let workerRuntime: ReturnType<typeof createWorkerRuntime>;

    beforeAll(async () => {
      redis = new Redis(redisUrl as string, {
        keyPrefix: "",
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
      });
      queue = new Queue(queueName, {
        connection: createBullMqConnection(config.redis),
      });
      queueEvents = new QueueEvents(queueName, {
        connection: createBullMqConnection(config.redis),
      });
      snapshotStore = new RedisMediaSnapshotStore(
        redis,
        new RedisKeyBuilder(prefix),
        fixedClock,
        604800,
        900,
        21600,
      );
      refreshQueue = new BullMqRefreshQueue(queue as never);
      workerRuntime = createWorkerRuntime(
        config,
        createProviderFetchStub() as typeof fetch,
        { imdbGraphqlClient: fakeImdbGraphqlClient },
      );

      await redis.ping();
      await queueEvents.waitUntilReady();
    });

    afterAll(async () => {
      await workerRuntime.close();
      await queueEvents.close();
      await queue.close();
      await redis.quit();
    });

    it("processes refresh, cleanup, and warmup jobs through real BullMQ and Redis", async () => {
      const record = buildMovieRecord(prefix);
      await snapshotStore.putSnapshot(record);

      const refresh = await refreshQueue.enqueueRecordRefresh({
        jobType: "refresh_media_record",
        tenantId: record.tenantId,
        requestedAt: "2026-01-01T00:00:00.000Z",
        kind: record.kind,
        mediaId: record.mediaId,
        identifiers: record.identifiers,
        language: "en" as never,
        source: "stale_lookup",
      });
      await waitForCompletion(queue, queueEvents, refresh.jobId);

      const refreshed = await snapshotStore.getLookup(record.tenantId, "movie", {
        type: "mediaId",
        value: record.mediaId,
      });
      expect(refreshed?.record.canonicalTitle).toBe("Fight Club");

      const cleanup = await refreshQueue.enqueueExpiredCacheCleanup({
        jobType: "cleanup_expired_cache",
        tenantId: record.tenantId,
        requestedAt: "2026-01-01T00:05:00.000Z",
        kind: record.kind,
        mediaId: record.mediaId,
        identifiers: record.identifiers,
        source: "maintenance",
      });
      await waitForCompletion(queue, queueEvents, cleanup.jobId);

      const localAfterCleanup = await snapshotStore.searchLocalIndex(record.tenantId, {
        q: "Fight Club",
        kind: "movie",
        lang: "en" as never,
        page: 1,
        pageSize: 20,
      });
      expect(localAfterCleanup.total).toBe(0);

      const warmup = await refreshQueue.enqueueHotRecordWarmup({
        jobType: "warm_hot_record",
        tenantId: record.tenantId,
        requestedAt: "2026-01-01T00:10:00.000Z",
        kind: record.kind,
        mediaId: record.mediaId,
        identifiers: record.identifiers,
        language: "en" as never,
        source: "manual",
      });
      await waitForCompletion(queue, queueEvents, warmup.jobId);

      const localAfterWarmup = await snapshotStore.searchLocalIndex(record.tenantId, {
        q: "Fight Club",
        kind: "movie",
        lang: "en" as never,
        page: 1,
        pageSize: 20,
      });
      expect(localAfterWarmup.total).toBe(1);
    });

    it("reports ready health against live Redis and BullMQ connections", async () => {
      const runtime = createRuntime(config, createProviderFetchStub() as typeof fetch, {
        imdbGraphqlClient: fakeImdbGraphqlClient,
      });

      try {
        const response = await request(runtime.app).get("/health/ready").expect(200);
        expect(response.body.status).toBe("ready");
        expect(response.body.dependencies).toEqual({
          redis: "up",
          bullmq: "up",
        });
      } finally {
        await runtime.close();
      }
    });

    it("stores and resolves search snapshots against live Redis in the expanded infra suite", async () => {
      const record = buildMovieRecord(prefix);
      await snapshotStore.putSnapshot(record);

      const fingerprint = buildSearchRequestFingerprint({
        tenantId: record.tenantId,
        q: "Fight Club",
        kind: "movie",
        lang: "en" as never,
        page: 1,
        pageSize: 20,
      });

      await snapshotStore.putSearchSnapshot(fingerprint, {
        tenantId: record.tenantId,
        query: "Fight Club",
        kind: "movie",
        lang: "en" as never,
        page: 1,
        pageSize: 20,
        total: 1,
        items: [
          {
            mediaId: record.mediaId,
            tenantId: record.tenantId,
            kind: "movie",
            title: "Fight Club",
            genres: ["Drama"],
            images: {},
            identifiers: {
              mediaId: record.mediaId,
              tmdbId: "550",
            },
          },
        ],
        sourceProviders: ["tmdb"],
        generatedAt: "2026-01-01T00:00:00.000Z",
        expiresAt: "2026-01-01T00:15:00.000Z",
      });

      const snapshot = await snapshotStore.getSearchSnapshot(record.tenantId, fingerprint);
      expect(snapshot?.snapshot.total).toBe(1);
    });
  },
);

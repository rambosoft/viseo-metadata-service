import Redis from "ioredis-mock";
import request from "supertest";
import { performance } from "node:perf_hooks";
import { describe, expect, it, vi } from "vitest";

import { HttpAuthValidationAdapter } from "../../src/adapters/auth-http/http-auth-validation-adapter.js";
import { RedisLookupCoordinator } from "../../src/adapters/coordination/redis-lookup-coordinator.js";
import { PrometheusMetrics } from "../../src/adapters/observability/prometheus-metrics.js";
import { TmdbMetadataProvider } from "../../src/adapters/provider-tmdb/tmdb-metadata-provider.js";
import { AllowAllRateLimiter } from "../../src/adapters/rate-limit/allow-all-rate-limiter.js";
import { NoopRefreshQueue } from "../../src/adapters/refresh/noop-refresh-queue.js";
import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../../src/adapters/redis-store/redis-media-snapshot-store.js";
import { MediaLookupService } from "../../src/application/lookup/media-lookup-service.js";
import { MediaSearchService } from "../../src/application/search/media-search-service.js";
import { createApp } from "../../src/bootstrap/create-app.js";
import { createReadinessCheck } from "../../src/bootstrap/create-readiness-check.js";
import { createLogger } from "../../src/bootstrap/logger.js";
import type { MediaRecord } from "../../src/core/media/types.js";
import type { RefreshQueuePort } from "../../src/ports/refresh/refresh-queue-port.js";
import type { ClockPort } from "../../src/ports/shared/clock-port.js";

const fixedClock: ClockPort = {
  now: () => new Date("2026-01-01T00:00:00.000Z"),
};
const HOT_PATH_REQUEST_COUNT = 20;
const HOT_LOOKUP_BUDGET_MS = 500;
const HOT_SEARCH_BUDGET_MS = 500;
const STALE_LOOKUP_BUDGET_MS = 500;
const CONCURRENT_LOOKUP_BUDGET_MS = 800;

function toRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.toString();
  }
  return input.url;
}

function buildStaleMovieRecord(): MediaRecord {
  return {
    mediaId: "med_stale_movie" as never,
    tenantId: "tenant_1" as never,
    kind: "movie",
    canonicalTitle: "Fight Club",
    genres: ["Drama"],
    cast: [],
    images: {},
    identifiers: {
      mediaId: "med_stale_movie" as never,
      tmdbId: "550",
      imdbId: "tt0137523",
    },
    providerRefs: [
      {
        provider: "tmdb",
        providerRecordId: "550",
        normalizedAt: "2025-12-31T23:00:00.000Z",
        hash: "hash",
        payload: {},
      },
    ],
    contentHash: "hash",
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

function createFetchStub() {
  return vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
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

    if (url.includes("/movie/550")) {
      return new Response(
        JSON.stringify({
          id: 550,
          imdb_id: "tt0137523",
          title: "Fight Club",
          original_title: "Fight Club",
          overview: "Movie result",
          release_date: "1999-10-15",
          runtime: 139,
          vote_average: 8.4,
          genres: [{ id: 18, name: "Drama" }],
          poster_path: "/fight.jpg",
          backdrop_path: "/fight-backdrop.jpg",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/search/movie")) {
      return new Response(
        JSON.stringify({
          page: 1,
          total_results: 1,
          results: [
            {
              id: 550,
              title: "Fight Club",
              original_title: "Fight Club",
              overview: "Movie result",
              release_date: "1999-10-15",
              vote_average: 8.4,
              genre_ids: [18],
              poster_path: "/fight.jpg",
              backdrop_path: "/fight-backdrop.jpg",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/search/multi")) {
      return new Response(
        JSON.stringify({
          page: 1,
          total_results: 1,
          results: [
            {
              media_type: "movie",
              id: 550,
              title: "Fight Club",
              original_title: "Fight Club",
              overview: "Movie result",
              release_date: "1999-10-15",
              vote_average: 8.4,
              genre_ids: [18],
              poster_path: "/fight.jpg",
              backdrop_path: "/fight-backdrop.jpg",
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    return new Response("{}", { status: 404 });
  });
}

function createPerformanceApp(options?: { refreshQueue?: RefreshQueuePort; fetchImpl?: ReturnType<typeof createFetchStub> }) {
  const metrics = new PrometheusMetrics();
  const redis = new Redis();
  const keyBuilder = new RedisKeyBuilder("md_perf");
  const snapshotStore = new RedisMediaSnapshotStore(
    redis as never,
    keyBuilder,
    fixedClock,
    604800,
    900,
    21600,
  );
  const fetchImpl = options?.fetchImpl ?? createFetchStub();
  const auth = new HttpAuthValidationAdapter(
    fetchImpl as typeof fetch,
    redis as never,
    keyBuilder,
    {
      serviceUrl: "https://auth.example.com",
      timeoutMs: 1000,
      cacheTtlSeconds: 3600,
    },
    metrics,
  );
  const provider = new TmdbMetadataProvider(
    fetchImpl as typeof fetch,
    {
      baseUrl: "https://api.themoviedb.org/3",
      imageBaseUrl: "https://image.tmdb.org/t/p/w500",
      apiKey: "secret",
      timeoutMs: 1000,
      movieTtlSeconds: 3600,
      tvTtlSeconds: 3600,
      staleServeWindowSeconds: 86400,
      canonicalRecordTtlSeconds: 604800,
    },
    fixedClock,
  );
  const rateLimiter = new AllowAllRateLimiter();
  const lookupCoordinator = new RedisLookupCoordinator(
    redis as never,
    keyBuilder,
    5,
    500,
  );
  const mediaLookupService = new MediaLookupService(
    auth,
    snapshotStore,
    provider,
    rateLimiter,
    options?.refreshQueue ?? new NoopRefreshQueue(),
    lookupCoordinator,
    createLogger("info"),
    metrics,
  );
  const mediaSearchService = new MediaSearchService(
    auth,
    snapshotStore,
    provider,
    rateLimiter,
    fixedClock,
    900,
    metrics,
  );

  const app = createApp({
    logger: createLogger("info"),
    mediaLookupService,
    mediaSearchService,
    snapshotStore,
    requestBodyLimitBytes: 16384,
    metricsPort: metrics,
    metricsEndpoint: {
      contentType: metrics.contentType,
      render: () => metrics.render(),
    },
    readinessCheck: createReadinessCheck({
      redis: async () => true,
      bullmq: async () => true,
    }),
  });

  return { app, redis, fetchImpl, snapshotStore };
}

describe("hot path performance", () => {
  it("serves repeated hot-cache movie lookups quickly", async () => {
    const { app, redis } = createPerformanceApp();

    await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);

    const startedAt = performance.now();
    for (let index = 0; index < HOT_PATH_REQUEST_COUNT; index += 1) {
      await request(app)
        .get("/api/v1/media/movie?tmdbId=550")
        .set("Authorization", "Bearer token")
        .expect(200);
    }
    const elapsedMs = performance.now() - startedAt;
    redis.disconnect();

    expect(elapsedMs).toBeLessThan(HOT_LOOKUP_BUDGET_MS);
  });

  it("serves repeated cached search pages quickly", async () => {
    const { app, redis } = createPerformanceApp();

    await request(app)
      .get("/api/v1/media/search?q=fight")
      .set("Authorization", "Bearer token")
      .expect(200);

    const startedAt = performance.now();
    for (let index = 0; index < HOT_PATH_REQUEST_COUNT; index += 1) {
      await request(app)
        .get("/api/v1/media/search?q=fight")
        .set("Authorization", "Bearer token")
        .expect(200);
    }
    const elapsedMs = performance.now() - startedAt;
    redis.disconnect();

    expect(elapsedMs).toBeLessThan(HOT_SEARCH_BUDGET_MS);
  });

  it("serves repeated stale-but-servable lookups quickly without refetching on the request path", async () => {
    const refreshQueue: RefreshQueuePort = {
      enqueueRecordRefresh: vi.fn(async (job) => ({
        enqueued: true,
        jobId: `refresh:${job.mediaId}`,
      })),
      enqueueExpiredCacheCleanup: vi.fn(async (job) => ({
        enqueued: true,
        jobId: `cleanup:${job.mediaId}`,
      })),
      enqueueHotRecordWarmup: vi.fn(async (job) => ({
        enqueued: true,
        jobId: `warmup:${job.mediaId}`,
      })),
    };
    const { app, redis, fetchImpl, snapshotStore } = createPerformanceApp({
      refreshQueue,
    });

    await snapshotStore.putSnapshot(buildStaleMovieRecord());

    const startedAt = performance.now();
    for (let index = 0; index < HOT_PATH_REQUEST_COUNT; index += 1) {
      await request(app)
        .get("/api/v1/media/movie?tmdbId=550")
        .set("Authorization", "Bearer token")
        .expect(200);
    }
    const elapsedMs = performance.now() - startedAt;
    redis.disconnect();

    expect(elapsedMs).toBeLessThan(STALE_LOOKUP_BUDGET_MS);
    expect(
      fetchImpl.mock.calls.filter(([input]) => toRequestUrl(input).includes("/movie/550")),
    ).toHaveLength(0);
  });

  it("keeps concurrent duplicate misses bounded under single-flight coordination", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
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

      if (url.includes("/movie/550")) {
        await new Promise((resolve) => setTimeout(resolve, 100));
        return new Response(
          JSON.stringify({
            id: 550,
            imdb_id: "tt0137523",
            title: "Fight Club",
            original_title: "Fight Club",
            overview: "Movie result",
            release_date: "1999-10-15",
            runtime: 139,
            vote_average: 8.4,
            genres: [{ id: 18, name: "Drama" }],
            poster_path: "/fight.jpg",
            backdrop_path: "/fight-backdrop.jpg",
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response("{}", { status: 404 });
    });
    const { app, redis } = createPerformanceApp({ fetchImpl });

    const startedAt = performance.now();
    const responses = await Promise.all(
      Array.from({ length: 10 }, () =>
        request(app)
          .get("/api/v1/media/movie?tmdbId=550")
          .set("Authorization", "Bearer token"),
      ),
    );
    const elapsedMs = performance.now() - startedAt;
    redis.disconnect();

    for (const response of responses) {
      expect(response.status).toBe(200);
    }
    expect(elapsedMs).toBeLessThan(CONCURRENT_LOOKUP_BUDGET_MS);
  });
});

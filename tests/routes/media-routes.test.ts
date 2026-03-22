import Redis from "ioredis-mock";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HttpAuthValidationAdapter } from "../../src/adapters/auth-http/http-auth-validation-adapter.js";
import { RedisLookupCoordinator } from "../../src/adapters/coordination/redis-lookup-coordinator.js";
import { PrometheusMetrics } from "../../src/adapters/observability/prometheus-metrics.js";
import { AllowAllRateLimiter } from "../../src/adapters/rate-limit/allow-all-rate-limiter.js";
import { RedisRateLimiter } from "../../src/adapters/rate-limit/redis-rate-limiter.js";
import { NoopRefreshQueue } from "../../src/adapters/refresh/noop-refresh-queue.js";
import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../../src/adapters/redis-store/redis-media-snapshot-store.js";
import { MediaLookupService } from "../../src/application/lookup/media-lookup-service.js";
import { MediaSearchService } from "../../src/application/search/media-search-service.js";
import { createApp } from "../../src/bootstrap/create-app.js";
import { createMetadataProvider } from "../../src/bootstrap/create-metadata-provider.js";
import { createReadinessCheck } from "../../src/bootstrap/create-readiness-check.js";
import { createLogger } from "../../src/bootstrap/logger.js";
import type { MediaRecord } from "../../src/core/media/types.js";
import type { ImdbGraphqlClientPort } from "../../src/adapters/provider-imdb/imdb-graphql-client.js";
import type { RefreshQueuePort } from "../../src/ports/refresh/refresh-queue-port.js";
import type { ClockPort } from "../../src/ports/shared/clock-port.js";

const fixedClock: ClockPort = {
  now: () => new Date("2026-01-01T00:00:00.000Z")
};
const testRedisClients: Array<InstanceType<typeof Redis>> = [];
type ImdbGraphqlExecuteArgs = Parameters<ImdbGraphqlClientPort["execute"]>[0];

const fakeImdbGraphqlClient: ImdbGraphqlClientPort = {
  async execute<T>(args: ImdbGraphqlExecuteArgs) {
    const imdbId = typeof args.variables?.id === "string" ? args.variables.id : "";
    if (imdbId === "tt0903747") {
      return {
        title: {
          id: imdbId,
          titleText: { text: "Breaking Bad" },
          originalTitleText: { text: "Breaking Bad" },
          titleType: { text: "tvSeries", canHaveEpisodes: true },
          ratingsSummary: { aggregateRating: 9.5, voteCount: 1200 },
          releaseDate: { year: 2008, month: 1, day: 20 },
          runtime: { seconds: 0 },
          titleGenres: { genres: [{ genre: { text: "Drama" } }] },
          plots: { edges: [{ node: { plotText: { plainText: "IMDb TV plot" } } }] },
          credits: { edges: [] },
        },
      } as T;
    }

    if (imdbId === "tt7654321") {
      return {
        title: {
          id: imdbId,
          titleText: { text: "Fallback Movie" },
          originalTitleText: { text: "Fallback Movie" },
          titleType: { text: "movie", canHaveEpisodes: false },
          ratingsSummary: { aggregateRating: 7.7, voteCount: 400 },
          releaseDate: { year: 2001, month: 9, day: 9 },
          runtime: { seconds: 6000 },
          titleGenres: { genres: [{ genre: { text: "Thriller" } }] },
          plots: { edges: [{ node: { plotText: { plainText: "IMDb-only movie." } } }] },
          credits: { edges: [] },
        },
      } as T;
    }

    return {
      title: {
        id: "tt0137523",
        titleText: { text: "Fight Club" },
        originalTitleText: { text: "Fight Club" },
        titleType: { text: "movie", canHaveEpisodes: false },
        ratingsSummary: { aggregateRating: 8.8, voteCount: 1500 },
        releaseDate: { year: 1999, month: 10, day: 15 },
        runtime: { seconds: 8340 },
        titleGenres: { genres: [{ genre: { text: "Drama" } }] },
        plots: { edges: [{ node: { plotText: { plainText: "IMDb movie plot" } } }] },
        credits: { edges: [] },
      },
    } as T;
  },
};

function createTestApp(
  fetchImpl: typeof fetch,
  options?: {
    imdbEnabled?: boolean;
    rateLimitMaxRequests?: number;
    refreshQueue?: RefreshQueuePort;
    readinessCheck?: ReturnType<typeof createReadinessCheck>;
  }
) {
  const redis = new Redis();
  testRedisClients.push(redis);
  const metrics = new PrometheusMetrics();
  const keyBuilder = new RedisKeyBuilder(`md_${Math.random().toString(16).slice(2)}`);
  const snapshotStore = new RedisMediaSnapshotStore(
    redis as never,
    keyBuilder,
    fixedClock,
    604800,
    900,
    21600,
  );
  const auth = new HttpAuthValidationAdapter(
    fetchImpl,
    redis as never,
    keyBuilder,
    {
      serviceUrl: "https://auth.example.com",
      timeoutMs: 1000,
      cacheTtlSeconds: 3600
    },
    metrics,
  );
  const provider = createMetadataProvider(
    {
      server: {
        nodeEnv: "test",
        port: 3000,
        requestBodyLimitBytes: 16384,
        logLevel: "info",
      },
      redis: {
        url: "redis://localhost:6379",
        keyPrefix: `md_rt_${Math.random().toString(16).slice(2)}`,
      },
      rateLimit: {
        windowSeconds: 60,
        maxRequests: options?.rateLimitMaxRequests ?? 120,
      },
      auth: {
        serviceUrl: "https://auth.example.com",
        timeoutMs: 1000,
        cacheTtlSeconds: 3600,
      },
      tmdb: {
        baseUrl: "https://api.themoviedb.org/3",
        imageBaseUrl: "https://image.tmdb.org/t/p/w500",
        apiKey: "secret",
        timeoutMs: 1000,
        movieTtlSeconds: 3600,
        tvTtlSeconds: 3600,
        staleServeWindowSeconds: 86400,
        canonicalRecordTtlSeconds: 604800,
      },
      imdb:
        options?.imdbEnabled === false
          ? null
          : {
              apiUrl: "https://api-fulfill.dataexchange.us-east-1.amazonaws.com/v1",
              apiKey: "secret",
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
        queueName: "metadata-refresh-test",
        jobAttempts: 3,
        jobBackoffMs: 1000,
        workerConcurrency: 1,
        dedupTtlSeconds: 60,
        workerShutdownTimeoutMs: 30000,
      },
    },
    fetchImpl,
    fixedClock,
    options?.imdbEnabled === false ? undefined : { imdbGraphqlClient: fakeImdbGraphqlClient },
  );
  const rateLimiter =
    options?.rateLimitMaxRequests !== undefined
      ? new RedisRateLimiter(redis as never, keyBuilder, {
          windowSeconds: 60,
          maxRequests: options.rateLimitMaxRequests
        }, metrics)
      : new AllowAllRateLimiter();
  const lookupCoordinator = new RedisLookupCoordinator(
    redis as never,
    keyBuilder,
    5,
    500,
  );
  const service = new MediaLookupService(
    auth,
    snapshotStore,
    provider,
    rateLimiter,
    options?.refreshQueue ?? new NoopRefreshQueue(),
    lookupCoordinator,
    createLogger("info"),
    metrics,
  );
  const searchService = new MediaSearchService(
    auth,
    snapshotStore,
    provider,
    rateLimiter,
    fixedClock,
    900,
    metrics,
  );
  const readinessCheck =
    options?.readinessCheck ??
    createReadinessCheck({
      redis: async () => snapshotStore.isHealthy(),
      bullmq: async () => true,
    });
  return {
    app: createApp({
      logger: createLogger("info"),
      mediaLookupService: service,
      mediaSearchService: searchService,
      snapshotStore,
      requestBodyLimitBytes: 16384,
      metricsPort: metrics,
      metricsEndpoint: {
        contentType: metrics.contentType,
        render: () => metrics.render(),
      },
      readinessCheck,
    }),
    fetchImpl,
    snapshotStore,
    metrics,
  };
}

afterEach(() => {
  while (testRedisClients.length > 0) {
    testRedisClients.pop()?.disconnect();
  }
});

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
          expiresAt: "2099-01-01T00:00:00.000Z"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    if (url.includes("/movie/550")) {
      return new Response(
        JSON.stringify({
          id: 550,
          imdb_id: "tt0137523",
          title: "Fight Club",
          original_title: "Fight Club",
          overview: "An insomniac office worker crosses paths with a soap maker.",
          release_date: "1999-10-15",
          runtime: 139,
          vote_average: 8.4,
          genres: [{ id: 18, name: "Drama" }],
          poster_path: "/poster.jpg",
          backdrop_path: "/backdrop.jpg"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    if (url.includes("/tv/1396/external_ids")) {
      return new Response(
        JSON.stringify({
          imdb_id: "tt0903747",
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    }

    if (url.includes("/tv/1396")) {
      return new Response(
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
      );
    }

    if (url.includes("/find/")) {
      if (url.includes("tt7654321")) {
        return new Response(
          JSON.stringify({
            movie_results: [],
            tv_results: [],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({
          movie_results: [{ id: 550 }],
          tv_results: [{ id: 1396 }]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
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
              overview: "Movie search result",
              release_date: "1999-10-15",
              vote_average: 8.4,
              genre_ids: [18],
              poster_path: "/fight.jpg",
              backdrop_path: "/fight-backdrop.jpg"
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    if (url.includes("/search/tv")) {
      return new Response(
        JSON.stringify({
          page: 1,
          total_results: 1,
          results: [
            {
              id: 1396,
              name: "Breaking Bad",
              original_name: "Breaking Bad",
              overview: "TV search result",
              first_air_date: "2008-01-20",
              vote_average: 8.9,
              genre_ids: [18],
              poster_path: "/bb.jpg",
              backdrop_path: "/bb-backdrop.jpg"
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    if (url.includes("/search/multi")) {
      return new Response(
        JSON.stringify({
          page: 1,
          total_results: 2,
          results: [
            {
              media_type: "movie",
              id: 550,
              title: "Fight Club",
              original_title: "Fight Club",
              overview: "Movie search result",
              release_date: "1999-10-15",
              vote_average: 8.4,
              genre_ids: [18],
              poster_path: "/fight.jpg",
              backdrop_path: "/fight-backdrop.jpg"
            },
            {
              media_type: "tv",
              id: 1396,
              name: "Breaking Bad",
              original_name: "Breaking Bad",
              overview: "TV search result",
              first_air_date: "2008-01-20",
              vote_average: 8.9,
              genre_ids: [18],
              poster_path: "/bb.jpg",
              backdrop_path: "/bb-backdrop.jpg"
            }
          ]
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    }

    return new Response("{}", { status: 404 });
  });
}

describe("media routes", () => {
  it("returns a movie for tmdbId", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.title).toBe("Fight Club");
    expect(response.body.meta.source).toBe("provider");
    expect(response.body.data.rating).toBe(8.8);
  });

  it("boots in TMDB-only mode when IMDb config is absent", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch, {
      imdbEnabled: false,
    });

    const response = await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.title).toBe("Fight Club");
    expect(response.body.data.rating).toBe(8.4);
  });

  it("returns a TV show for tmdbId", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/tv?tmdbId=1396")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.title).toBe("Breaking Bad");
    expect(response.body.data.firstAirYear).toBe(2008);
    expect(response.body.meta.tenantId).toBe("tenant_1");
    expect(response.body.data.rating).toBe(9.5);
  });

  it("returns validation failure for multiple identifiers", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/tv?tmdbId=1396&imdbId=tt0903747")
      .set("Authorization", "Bearer token")
      .expect(400);

    expect(response.body.error.code).toBe("validation_failed");
  });

  it("returns the OpenAPI shell", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/openapi.json")
      .expect(200);

    expect(response.body.openapi).toBe("3.1.0");
    expect(response.body.paths["/api/v1/media/movie"]).toBeDefined();
    expect(response.body.paths["/api/v1/media/tv"]).toBeDefined();
    expect(response.body.paths["/api/v1/media/search"]).toBeDefined();
    expect(response.body.paths["/metrics"]).toBeDefined();
    expect(response.body.paths["/docs"]).toBeDefined();
  });

  it("serves interactive docs", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app).get("/docs").expect(200);

    expect(response.headers["content-type"]).toContain("text/html");
    expect(response.text).toContain("SwaggerUIBundle");
    expect(response.text).toContain("/openapi.json");
  });

  it("returns Prometheus metrics", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);

    const response = await request(app)
      .get("/metrics")
      .expect(200);

    expect(response.headers["content-type"]).toContain("text/plain");
    expect(response.text).toContain("http_requests_total");
    expect(response.text).toContain("metadata_lookup_cache_total");
  });

  it("returns 401 for invalid token", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 }));
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/tv?tmdbId=1396")
      .set("Authorization", "Bearer token")
      .expect(401);

    expect(response.body.error.code).toBe("authentication_failed");
  });

  it("returns 403 when the auth service denies authorization", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 403 }));
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/tv?tmdbId=1396")
      .set("Authorization", "Bearer token")
      .expect(403);

    expect(response.body.error.code).toBe("authorization_failed");
  });

  it("returns 429 when the route rate limit is exceeded", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch, {
      rateLimitMaxRequests: 1
    });

    await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);

    const second = await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(429);

    expect(second.body.error.code).toBe("rate_limited");
  });

  it("hits the TV provider only once on repeated lookup because cache is used", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    await request(app)
      .get("/api/v1/media/tv?tmdbId=1396")
      .set("Authorization", "Bearer token")
      .expect(200);
    const second = await request(app)
      .get("/api/v1/media/tv?tmdbId=1396")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(second.body.meta.source).toBe("cache");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("serves stale movie data and enqueues refresh when a servable canonical record exists", async () => {
    const fetchImpl = createFetchStub();
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
    const { app, snapshotStore } = createTestApp(fetchImpl as typeof fetch, {
      refreshQueue,
    });
    await snapshotStore.putSnapshot(buildStaleMovieRecord());

    const response = await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.meta.source).toBe("cache");
    expect(response.body.meta.stale).toBe(true);
    expect(refreshQueue.enqueueRecordRefresh).toHaveBeenCalledTimes(1);
  });

  it("deduplicates concurrent provider misses across requests", async () => {
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
            overview: "Delayed provider result",
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

      return new Response("{}", { status: 404 });
    });
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const [first, second] = await Promise.all([
      request(app)
        .get("/api/v1/media/movie?tmdbId=550")
        .set("Authorization", "Bearer token"),
      request(app)
        .get("/api/v1/media/movie?tmdbId=550")
        .set("Authorization", "Bearer token"),
    ]);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(
      fetchImpl.mock.calls.filter(([input]) => String(input).includes("/movie/550")),
    ).toHaveLength(1);
  });

  it("returns provider-backed search results", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/search?q=fight")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.meta.source).toBe("provider");
    expect(response.body.data.items).toHaveLength(2);
  });

  it("falls back to an IMDb-backed movie record when TMDB cannot resolve an imdbId", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/movie?imdbId=tt7654321")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.title).toBe("Fallback Movie");
    expect(response.body.data.rating).toBe(7.7);
    expect(response.body.data.identifiers.imdbId).toBe("tt7654321");
  });

  it("returns 404 for unresolved imdbId lookups when IMDb is disabled", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch, {
      imdbEnabled: false,
    });

    const response = await request(app)
      .get("/api/v1/media/movie?imdbId=tt7654321")
      .set("Authorization", "Bearer token")
      .expect(404);

    expect(response.body.error.code).toBe("not_found");
  });

  it("returns cached search results on repeat query", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    await request(app)
      .get("/api/v1/media/search?q=fight")
      .set("Authorization", "Bearer token")
      .expect(200);
    const second = await request(app)
      .get("/api/v1/media/search?q=fight")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(second.body.meta.source).toBe("cache");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("serves search results from the local index when lookup snapshots already exist", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);

    const response = await request(app)
      .get("/api/v1/media/search?q=fight club&kind=movie")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.meta.source).toBe("index");
    expect(response.body.data.items[0].title).toBe("Fight Club");
  });

  it("returns mixed movie and tv results when kind is omitted", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/search?q=fight")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.items.map((item: { kind: string }) => item.kind)).toEqual([
      "movie",
      "tv"
    ]);
  });

  it("validates search query parameters", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/search?q=&page=0&pageSize=51")
      .set("Authorization", "Bearer token")
      .expect(400);

    expect(response.body.error.code).toBe("validation_failed");
  });

  it("returns provider error when the TV provider fails and no cache exists", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("auth.example.com")) {
        return new Response(
          JSON.stringify({
            principalId: "user_1",
            tenantId: "tenant_1",
            scopes: ["metadata:read"],
            expiresAt: "2099-01-01T00:00:00.000Z"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response("{}", { status: 503 });
    });
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/tv?tmdbId=1396")
      .set("Authorization", "Bearer token")
      .expect(502);

    expect(response.body.error.code).toBe("provider_unavailable");
  });

  it("returns provider error when search fails with no cache or index fallback", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("auth.example.com")) {
        return new Response(
          JSON.stringify({
            principalId: "user_1",
            tenantId: "tenant_1",
            scopes: ["metadata:read"],
            expiresAt: "2099-01-01T00:00:00.000Z"
          }),
          { status: 200, headers: { "content-type": "application/json" } }
        );
      }

      return new Response("{}", { status: 503 });
    });
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/search?q=fight")
      .set("Authorization", "Bearer token")
      .expect(502);

    expect(response.body.error.code).toBe("provider_unavailable");
  });

  it("reports live and ready health", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch);

    await request(app).get("/health/live").expect(200);
    await request(app).get("/health/ready").expect(200);
  });

  it("reports degraded readiness when a dependency is down", async () => {
    const fetchImpl = createFetchStub();
    const { app } = createTestApp(fetchImpl as typeof fetch, {
      readinessCheck: createReadinessCheck({
        redis: async () => true,
        bullmq: async () => false,
      }),
    });

    const response = await request(app).get("/health/ready").expect(503);

    expect(response.body.status).toBe("degraded");
    expect(response.body.dependencies).toEqual({
      redis: "up",
      bullmq: "down",
    });
  });
});

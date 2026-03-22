import Redis from "ioredis-mock";
import request from "supertest";
import { describe, expect, it, vi } from "vitest";

import { HttpAuthValidationAdapter } from "../../src/adapters/auth-http/http-auth-validation-adapter.js";
import { TmdbMetadataProvider } from "../../src/adapters/provider-tmdb/tmdb-metadata-provider.js";
import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../../src/adapters/redis-store/redis-media-snapshot-store.js";
import { MovieLookupService } from "../../src/application/lookup/movie-lookup-service.js";
import { createApp } from "../../src/bootstrap/create-app.js";
import { createLogger } from "../../src/bootstrap/logger.js";
import type { ClockPort } from "../../src/ports/shared/clock-port.js";

const fixedClock: ClockPort = {
  now: () => new Date("2026-01-01T00:00:00.000Z")
};

function createTestApp(fetchImpl: typeof fetch) {
  const redis = new Redis();
  const keyBuilder = new RedisKeyBuilder(`md_${Math.random().toString(16).slice(2)}`);
  const snapshotStore = new RedisMediaSnapshotStore(redis as never, keyBuilder, 3600);
  const auth = new HttpAuthValidationAdapter(
    fetchImpl,
    redis as never,
    keyBuilder,
    {
      serviceUrl: "https://auth.example.com",
      timeoutMs: 1000,
      cacheTtlSeconds: 3600
    }
  );
  const provider = new TmdbMetadataProvider(
    fetchImpl,
    {
      baseUrl: "https://api.themoviedb.org/3",
      imageBaseUrl: "https://image.tmdb.org/t/p/w500",
      apiKey: "secret",
      timeoutMs: 1000,
      movieTtlSeconds: 3600
    },
    fixedClock
  );
  const service = new MovieLookupService(auth, snapshotStore, provider, fixedClock);
  return {
    app: createApp({
      logger: createLogger("info"),
      movieLookupService: service,
      snapshotStore
    }),
    fetchImpl
  };
}

describe("GET /api/v1/media/movie", () => {
  it("returns a movie for tmdbId", async () => {
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
    });

    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(response.body.data.title).toBe("Fight Club");
    expect(response.body.meta.source).toBe("provider");
  });

  it("returns validation failure for multiple identifiers", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          principalId: "user_1",
          tenantId: "tenant_1",
          scopes: ["metadata:read"],
          expiresAt: "2099-01-01T00:00:00.000Z"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/movie?tmdbId=550&imdbId=tt0137523")
      .set("Authorization", "Bearer token")
      .expect(400);

    expect(response.body.error.code).toBe("validation_failed");
  });

  it("returns 401 for invalid token", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 401 }));
    const { app } = createTestApp(fetchImpl as typeof fetch);

    const response = await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(401);

    expect(response.body.error.code).toBe("authentication_failed");
  });

  it("hits provider only once on repeated lookup because cache is used", async () => {
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

      return new Response(
        JSON.stringify({
          id: 550,
          imdb_id: "tt0137523",
          title: "Fight Club",
          release_date: "1999-10-15",
          runtime: 139,
          vote_average: 8.4,
          genres: []
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      );
    });
    const { app } = createTestApp(fetchImpl as typeof fetch);

    await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);
    const second = await request(app)
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(200);

    expect(second.body.meta.source).toBe("cache");
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("returns provider error when provider fails and no cache exists", async () => {
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
      .get("/api/v1/media/movie?tmdbId=550")
      .set("Authorization", "Bearer token")
      .expect(502);

    expect(response.body.error.code).toBe("provider_unavailable");
  });

  it("reports live and ready health", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          principalId: "user_1",
          tenantId: "tenant_1",
          scopes: ["metadata:read"],
          expiresAt: "2099-01-01T00:00:00.000Z"
        }),
        { status: 200, headers: { "content-type": "application/json" } }
      )
    );
    const { app } = createTestApp(fetchImpl as typeof fetch);

    await request(app).get("/health/live").expect(200);
    await request(app).get("/health/ready").expect(200);
  });
});

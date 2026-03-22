import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/config/env.js";

describe("loadConfig", () => {
  it("parses valid environment", () => {
    const config = loadConfig({
      REDIS_URL: "redis://localhost:6379",
      AUTH_SERVICE_URL: "https://auth.example.com",
      TMDB_API_KEY: "secret",
      IMDB_API_KEY: "imdb-secret",
      IMDB_DATA_SET_ID: "dataset",
      IMDB_REVISION_ID: "revision",
      IMDB_ASSET_ID: "asset",
    });

    expect(config.server.port).toBe(3000);
    expect(config.server.requestBodyLimitBytes).toBe(16384);
    expect(config.redis.keyPrefix).toBe("md");
    expect(config.rateLimit.maxRequests).toBe(120);
    expect(config.tmdb.baseUrl).toBe("https://api.themoviedb.org/3");
    expect(config.imdb?.apiUrl).toBe("https://api-fulfill.dataexchange.us-east-1.amazonaws.com/v1");
    expect(config.tmdb.tvTtlSeconds).toBe(3600);
    expect(config.search.cacheTtlSeconds).toBe(900);
    expect(config.search.indexTtlSeconds).toBe(21600);
  });

  it("allows TMDB-only startup when IMDb values are omitted", () => {
    const config = loadConfig({
      REDIS_URL: "redis://localhost:6379",
      AUTH_SERVICE_URL: "https://auth.example.com",
      TMDB_API_KEY: "secret",
    });

    expect(config.imdb).toBeNull();
  });

  it("throws when IMDb is partially configured", () => {
    expect(() =>
      loadConfig({
        REDIS_URL: "redis://localhost:6379",
        AUTH_SERVICE_URL: "https://auth.example.com",
        TMDB_API_KEY: "secret",
        IMDB_API_KEY: "imdb-secret",
      })
    ).toThrow(/IMDb support requires/);
  });

  it("throws when required values are missing", () => {
    expect(() =>
      loadConfig({
        REDIS_URL: "redis://localhost:6379"
      })
    ).toThrow();
  });
});

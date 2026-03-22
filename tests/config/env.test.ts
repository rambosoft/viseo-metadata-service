import { describe, expect, it } from "vitest";

import { loadConfig } from "../../src/config/env.js";

describe("loadConfig", () => {
  it("parses valid environment", () => {
    const config = loadConfig({
      REDIS_URL: "redis://localhost:6379",
      AUTH_SERVICE_URL: "https://auth.example.com",
      TMDB_API_KEY: "secret"
    });

    expect(config.server.port).toBe(3000);
    expect(config.server.requestBodyLimitBytes).toBe(16384);
    expect(config.redis.keyPrefix).toBe("md");
    expect(config.rateLimit.maxRequests).toBe(120);
    expect(config.tmdb.baseUrl).toBe("https://api.themoviedb.org/3");
    expect(config.tmdb.tvTtlSeconds).toBe(3600);
    expect(config.search.cacheTtlSeconds).toBe(900);
    expect(config.search.indexTtlSeconds).toBe(21600);
  });

  it("throws when required values are missing", () => {
    expect(() =>
      loadConfig({
        REDIS_URL: "redis://localhost:6379"
      })
    ).toThrow();
  });
});

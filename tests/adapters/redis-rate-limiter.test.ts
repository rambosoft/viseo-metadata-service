import Redis from "ioredis-mock";
import { describe, expect, it } from "vitest";

import { RedisRateLimiter } from "../../src/adapters/rate-limit/redis-rate-limiter.js";
import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";

describe("RedisRateLimiter", () => {
  it("allows requests within the configured window budget", async () => {
    const redis = new Redis();
    const limiter = new RedisRateLimiter(
      redis as never,
      new RedisKeyBuilder("md_rate_limit_allow"),
      { windowSeconds: 60, maxRequests: 2 }
    );

    await expect(
      limiter.consume({
        tenantId: "tenant_1" as never,
        principalId: "user_1",
        route: "/api/v1/media/movie"
      })
    ).resolves.toBeUndefined();
    await expect(
      limiter.consume({
        tenantId: "tenant_1" as never,
        principalId: "user_1",
        route: "/api/v1/media/movie"
      })
    ).resolves.toBeUndefined();
  });

  it("rejects requests beyond the configured limit", async () => {
    const redis = new Redis();
    const limiter = new RedisRateLimiter(
      redis as never,
      new RedisKeyBuilder("md_rate_limit_reject"),
      { windowSeconds: 60, maxRequests: 1 }
    );

    await limiter.consume({
      tenantId: "tenant_1" as never,
      principalId: "user_1",
      route: "/api/v1/media/movie"
    });

    await expect(
      limiter.consume({
        tenantId: "tenant_1" as never,
        principalId: "user_1",
        route: "/api/v1/media/movie"
      })
    ).rejects.toThrow("Rate limit exceeded");
  });
});

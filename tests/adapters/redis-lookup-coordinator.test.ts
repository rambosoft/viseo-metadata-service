import Redis from "ioredis-mock";
import { describe, expect, it } from "vitest";

import { RedisLookupCoordinator } from "../../src/adapters/coordination/redis-lookup-coordinator.js";
import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";

describe("RedisLookupCoordinator", () => {
  it("allows only one lease holder per lookup key until release", async () => {
    const redis = new Redis();
    const coordinator = new RedisLookupCoordinator(
      redis as never,
      new RedisKeyBuilder("md"),
      5,
      50,
      5,
    );
    const key = {
      tenantId: "tenant_1" as never,
      kind: "movie" as const,
      identifier: {
        type: "tmdbId" as const,
        value: "550",
      },
    };

    const first = await coordinator.tryAcquire(key);
    const second = await coordinator.tryAcquire(key);

    expect(first).not.toBeNull();
    expect(second).toBeNull();

    await coordinator.release(first!);
    const third = await coordinator.tryAcquire(key);

    expect(third).not.toBeNull();
  });
});

import { describe, expect, it } from "vitest";

import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";

describe("RedisKeyBuilder", () => {
  it("builds tenant-aware movie lookup keys", () => {
    const builder = new RedisKeyBuilder("md");

    const key = builder.movieLookup("tenant_1" as never, {
      type: "tmdbId",
      value: "550"
    });

    expect(key).toBe("md:v1:tenant:tenant_1:movie:lookup:tmdbId:550");
  });
});

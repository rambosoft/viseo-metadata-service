import { describe, expect, it } from "vitest";

import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";

describe("RedisKeyBuilder", () => {
  it("builds tenant-aware movie lookup keys", () => {
    const builder = new RedisKeyBuilder("md");

    const key = builder.mediaLookupHot("tenant_1" as never, "movie", {
      type: "tmdbId",
      value: "550"
    });

    expect(key).toBe("md:v1:tenant:tenant_1:movie:lookup:hot:tmdbId:550");
  });

  it("keeps TV lookup keys distinct from movie keys", () => {
    const builder = new RedisKeyBuilder("md");

    const movieKey = builder.mediaLookupHot("tenant_1" as never, "movie", {
      type: "tmdbId",
      value: "550"
    });
    const tvKey = builder.mediaLookupHot("tenant_1" as never, "tv", {
      type: "tmdbId",
      value: "550"
    });

    expect(movieKey).not.toBe(tvKey);
    expect(tvKey).toBe("md:v1:tenant:tenant_1:tv:lookup:hot:tmdbId:550");
  });
});

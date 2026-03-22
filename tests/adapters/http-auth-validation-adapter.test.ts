import Redis from "ioredis-mock";
import { describe, expect, it, vi } from "vitest";

import { HttpAuthValidationAdapter } from "../../src/adapters/auth-http/http-auth-validation-adapter.js";
import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";

describe("HttpAuthValidationAdapter", () => {
  it("caches validated auth context", async () => {
    const redis = new Redis();
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          principalId: "user_1",
          tenantId: "tenant_1",
          scopes: ["metadata:read"],
          expiresAt: "2099-01-01T00:00:00.000Z"
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" }
        }
      )
    );

    const adapter = new HttpAuthValidationAdapter(
      fetchImpl as typeof fetch,
      redis as never,
      new RedisKeyBuilder("md"),
      {
        serviceUrl: "https://auth.example.com",
        timeoutMs: 1000,
        cacheTtlSeconds: 3600
      }
    );

    const first = await adapter.validateToken("token");
    const second = await adapter.validateToken("token");

    expect(first.tenantId).toBe("tenant_1");
    expect(second.tenantId).toBe("tenant_1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

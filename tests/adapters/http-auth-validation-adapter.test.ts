import Redis from "ioredis-mock";
import { describe, expect, it, vi } from "vitest";

import { HttpAuthValidationAdapter } from "../../src/adapters/auth-http/http-auth-validation-adapter.js";
import { RedisKeyBuilder } from "../../src/adapters/redis-store/redis-key-builder.js";
import { AuthenticationError, AuthorizationError } from "../../src/core/shared/errors.js";

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

  it("evicts corrupted cached auth payloads before falling back to the auth service", async () => {
    const redis = new Redis();
    const keyBuilder = new RedisKeyBuilder("md");
    await redis.set(
      keyBuilder.authToken("token"),
      JSON.stringify({
        principalId: "",
        tenantId: "",
        scopes: [],
        expiresAt: "",
      }),
    );
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          principalId: "user_1",
          tenantId: "tenant_1",
          scopes: ["metadata:read"],
          expiresAt: "2099-01-01T00:00:00.000Z",
        }),
        {
          status: 200,
          headers: { "content-type": "application/json" },
        },
      ),
    );

    const adapter = new HttpAuthValidationAdapter(
      fetchImpl as typeof fetch,
      redis as never,
      keyBuilder,
      {
        serviceUrl: "https://auth.example.com",
        timeoutMs: 1000,
        cacheTtlSeconds: 3600,
      },
    );

    const result = await adapter.validateToken("token");

    expect(result.tenantId).toBe("tenant_1");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("maps upstream 401 to authentication_failed and 403 to authorization_failed", async () => {
    const redis401 = new Redis();
    const redis403 = new Redis();
    const auth401 = new HttpAuthValidationAdapter(
      vi.fn(async () => new Response("{}", { status: 401 })) as typeof fetch,
      redis401 as never,
      new RedisKeyBuilder("md_401"),
      {
        serviceUrl: "https://auth.example.com",
        timeoutMs: 1000,
        cacheTtlSeconds: 3600,
      },
    );
    const auth403 = new HttpAuthValidationAdapter(
      vi.fn(async () => new Response("{}", { status: 403 })) as typeof fetch,
      redis403 as never,
      new RedisKeyBuilder("md_403"),
      {
        serviceUrl: "https://auth.example.com",
        timeoutMs: 1000,
        cacheTtlSeconds: 3600,
      },
    );

    await expect(auth401.validateToken("token")).rejects.toBeInstanceOf(AuthenticationError);
    await expect(auth403.validateToken("token")).rejects.toBeInstanceOf(AuthorizationError);
  });
});

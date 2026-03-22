import type { Redis as RedisClient } from "ioredis";

import { AuthenticationError, DependencyUnavailableError } from "../../core/shared/errors.js";
import type { AuthContext } from "../../core/auth/types.js";
import type { AuthValidationPort } from "../../ports/auth/auth-validation-port.js";
import { toTenantId } from "../../application/lookup/media-lookup-helpers.js";
import { RedisKeyBuilder } from "../redis-store/redis-key-builder.js";
import { cachedAuthContextSchema } from "../redis-store/redis-schemas.js";

type FetchLike = typeof fetch;

type AuthConfig = Readonly<{
  serviceUrl: string;
  timeoutMs: number;
  cacheTtlSeconds: number;
}>;

export class HttpAuthValidationAdapter implements AuthValidationPort {
  public constructor(
    private readonly fetchImpl: FetchLike,
    private readonly redis: Pick<RedisClient, "get" | "setex">,
    private readonly keyBuilder: RedisKeyBuilder,
    private readonly authConfig: AuthConfig
  ) {}

  public async validateToken(token: string): Promise<AuthContext> {
    const cacheKey = this.keyBuilder.authToken(token);
    const cached = await this.redis.get(cacheKey);
    if (cached !== null) {
      try {
        return this.toAuthContext(cachedAuthContextSchema.parse(JSON.parse(cached)));
      } catch {
        // ignore corrupted cache and fallback to auth service
      }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.authConfig.timeoutMs);

    try {
      const response = await this.fetchImpl(`${this.authConfig.serviceUrl}/validate`, {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          "content-type": "application/json"
        },
        body: JSON.stringify({ token }),
        signal: controller.signal
      });

      if (response.status === 401 || response.status === 403) {
        throw new AuthenticationError();
      }

      if (!response.ok) {
        throw new DependencyUnavailableError("Auth service unavailable");
      }

      const parsed = cachedAuthContextSchema.parse(await response.json());
      const ttlSeconds = this.buildCacheTtl(parsed.expiresAt);
      if (ttlSeconds > 0) {
        await this.redis.setex(cacheKey, ttlSeconds, JSON.stringify(parsed));
      }
      return this.toAuthContext(parsed);
    } catch (error) {
      if (error instanceof AuthenticationError || error instanceof DependencyUnavailableError) {
        throw error;
      }
      throw new DependencyUnavailableError("Auth service unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildCacheTtl(expiresAtIso: string): number {
    const expiryMs = new Date(expiresAtIso).getTime() - Date.now();
    const expirySeconds = Math.floor(expiryMs / 1000);
    return Math.max(0, Math.min(expirySeconds, this.authConfig.cacheTtlSeconds));
  }

  private toAuthContext(parsed: {
    principalId: string;
    tenantId: string;
    scopes: string[];
    expiresAt: string;
  }): AuthContext {
    return {
      principalId: parsed.principalId,
      tenantId: toTenantId(parsed.tenantId),
      scopes: parsed.scopes,
      expiresAt: parsed.expiresAt
    };
  }
}

import type { Redis as RedisClient } from "ioredis";

import { RateLimitedError } from "../../core/shared/errors.js";
import { RedisKeyBuilder } from "../redis-store/redis-key-builder.js";
import type {
  ConsumeRateLimitArgs,
  RateLimiterPort,
} from "../../ports/rate-limit/rate-limiter-port.js";

type RateLimiterRedisClient = Pick<RedisClient, "set" | "incr" | "ttl" | "expire">;

type RedisRateLimiterConfig = Readonly<{
  windowSeconds: number;
  maxRequests: number;
}>;

export class RedisRateLimiter implements RateLimiterPort {
  public constructor(
    private readonly redis: RateLimiterRedisClient,
    private readonly keyBuilder: RedisKeyBuilder,
    private readonly config: RedisRateLimiterConfig,
  ) {}

  public async consume(args: ConsumeRateLimitArgs): Promise<void> {
    const key = this.keyBuilder.rateLimitWindow(
      args.tenantId,
      args.principalId,
      args.route,
    );

    await this.redis.set(key, "0", "EX", this.config.windowSeconds, "NX");
    const currentCount = await this.redis.incr(key);

    const ttlSeconds = await this.redis.ttl(key);
    if (ttlSeconds < 0) {
      await this.redis.expire(key, this.config.windowSeconds);
    }

    if (currentCount > this.config.maxRequests) {
      throw new RateLimitedError("Rate limit exceeded");
    }
  }
}

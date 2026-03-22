import { HttpAuthValidationAdapter } from "../adapters/auth-http/http-auth-validation-adapter.js";
import { TmdbMetadataProvider } from "../adapters/provider-tmdb/tmdb-metadata-provider.js";
import { RedisRateLimiter } from "../adapters/rate-limit/redis-rate-limiter.js";
import { RedisKeyBuilder } from "../adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../adapters/redis-store/redis-media-snapshot-store.js";
import { MediaLookupService } from "../application/lookup/media-lookup-service.js";
import { MediaSearchService } from "../application/search/media-search-service.js";
import type { AppConfig } from "../config/env.js";
import { createApp } from "./create-app.js";
import { createLogger } from "./logger.js";
import { createRedisClient } from "./create-redis-client.js";
import { SystemClock } from "./system-clock.js";

export function createRuntime(config: AppConfig, fetchImpl: typeof fetch = fetch) {
  const logger = createLogger(config.server.logLevel);
  const clock = new SystemClock();
  const redis = createRedisClient(config.redis);
  const keyBuilder = new RedisKeyBuilder(config.redis.keyPrefix);

  const snapshotStore = new RedisMediaSnapshotStore(
    redis,
    keyBuilder,
    Math.max(config.tmdb.movieTtlSeconds, config.tmdb.tvTtlSeconds),
    config.search.cacheTtlSeconds,
    config.search.indexTtlSeconds,
  );
  const authValidationPort = new HttpAuthValidationAdapter(
    fetchImpl,
    redis,
    keyBuilder,
    config.auth
  );
  const metadataProviderPort = new TmdbMetadataProvider(fetchImpl, config.tmdb, clock);
  const rateLimiterPort = new RedisRateLimiter(redis, keyBuilder, config.rateLimit);
  const mediaLookupService = new MediaLookupService(
    authValidationPort,
    snapshotStore,
    metadataProviderPort,
    rateLimiterPort
  );
  const mediaSearchService = new MediaSearchService(
    authValidationPort,
    snapshotStore,
    metadataProviderPort,
    rateLimiterPort,
    clock,
    config.search.cacheTtlSeconds,
  );

  const app = createApp({
    logger,
    mediaLookupService,
    mediaSearchService,
    snapshotStore,
    requestBodyLimitBytes: config.server.requestBodyLimitBytes
  });

  return {
    app,
    logger,
    redis
  };
}

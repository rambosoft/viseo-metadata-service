import { Queue } from "bullmq";

import { RedisLookupCoordinator } from "../adapters/coordination/redis-lookup-coordinator.js";
import { HttpAuthValidationAdapter } from "../adapters/auth-http/http-auth-validation-adapter.js";
import { NoopMetrics } from "../adapters/observability/noop-metrics.js";
import { TmdbMetadataProvider } from "../adapters/provider-tmdb/tmdb-metadata-provider.js";
import { RedisRateLimiter } from "../adapters/rate-limit/redis-rate-limiter.js";
import { BullMqRefreshQueue } from "../adapters/refresh/bullmq-refresh-queue.js";
import { RedisKeyBuilder } from "../adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../adapters/redis-store/redis-media-snapshot-store.js";
import { MediaLookupService } from "../application/lookup/media-lookup-service.js";
import { MediaSearchService } from "../application/search/media-search-service.js";
import type { AppConfig } from "../config/env.js";
import { createApp } from "./create-app.js";
import { createBullMqConnection } from "./create-bullmq-connection.js";
import { createLogger } from "./logger.js";
import { createRedisClient } from "./create-redis-client.js";
import { SystemClock } from "./system-clock.js";

export function createRuntime(config: AppConfig, fetchImpl: typeof fetch = fetch) {
  const logger = createLogger(config.server.logLevel);
  const metrics = new NoopMetrics();
  const clock = new SystemClock();
  const redis = createRedisClient(config.redis);
  const keyBuilder = new RedisKeyBuilder(config.redis.keyPrefix);
  const refreshQueue = new Queue(config.refresh.queueName, {
    connection: createBullMqConnection(config.redis),
    defaultJobOptions: {
      attempts: config.refresh.jobAttempts,
      backoff: {
        type: "fixed",
        delay: config.refresh.jobBackoffMs,
      },
      removeOnComplete: {
        age: config.refresh.dedupTtlSeconds,
      },
      removeOnFail: {
        age: config.refresh.dedupTtlSeconds * 10,
      },
    },
  });

  const snapshotStore = new RedisMediaSnapshotStore(
    redis,
    keyBuilder,
    clock,
    config.tmdb.canonicalRecordTtlSeconds,
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
  const refreshQueuePort = new BullMqRefreshQueue(refreshQueue);
  const lookupCoordinatorPort = new RedisLookupCoordinator(
    redis,
    keyBuilder,
    config.coordination.lookupTtlSeconds,
    config.coordination.lookupWaitMs,
  );
  const mediaLookupService = new MediaLookupService(
    authValidationPort,
    snapshotStore,
    metadataProviderPort,
    rateLimiterPort,
    refreshQueuePort,
    lookupCoordinatorPort,
    logger,
    metrics,
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
    async close() {
      await refreshQueue.close();
      redis.disconnect();
    },
  };
}

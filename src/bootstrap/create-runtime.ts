import { Queue, QueueEvents } from "bullmq";

import { RedisLookupCoordinator } from "../adapters/coordination/redis-lookup-coordinator.js";
import { HttpAuthValidationAdapter } from "../adapters/auth-http/http-auth-validation-adapter.js";
import { PrometheusMetrics } from "../adapters/observability/prometheus-metrics.js";
import { TmdbMetadataProvider } from "../adapters/provider-tmdb/tmdb-metadata-provider.js";
import { RedisRateLimiter } from "../adapters/rate-limit/redis-rate-limiter.js";
import { BullMqRefreshQueue } from "../adapters/refresh/bullmq-refresh-queue.js";
import { RedisKeyBuilder } from "../adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../adapters/redis-store/redis-media-snapshot-store.js";
import { MediaLookupService } from "../application/lookup/media-lookup-service.js";
import { MediaSearchService } from "../application/search/media-search-service.js";
import type { AppConfig } from "../config/env.js";
import { attachRedisLifecycleLogging } from "./attach-redis-lifecycle-logging.js";
import { isBullMqHealthy } from "./bullmq-health.js";
import { createApp } from "./create-app.js";
import { createBullMqConnection } from "./create-bullmq-connection.js";
import { createReadinessCheck } from "./create-readiness-check.js";
import { createLogger } from "./logger.js";
import { createRedisClient } from "./create-redis-client.js";
import { SystemClock } from "./system-clock.js";

export function createRuntime(config: AppConfig, fetchImpl: typeof fetch = fetch) {
  const logger = createLogger(config.server.logLevel);
  const metrics = new PrometheusMetrics();
  const clock = new SystemClock();
  const redis = createRedisClient(config.redis, logger, "api-redis");
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
  const refreshQueueEvents = new QueueEvents(config.refresh.queueName, {
    connection: createBullMqConnection(config.redis),
  });
  void refreshQueue.client.then((client) => {
    attachRedisLifecycleLogging(client, logger, "api-refresh-queue");
  });
  void refreshQueueEvents.client.then((client) => {
    attachRedisLifecycleLogging(client, logger, "api-refresh-queue-events");
  });

  refreshQueueEvents.on("completed", ({ jobId }) => {
    const jobType = toJobType(jobId);
    logger.info({ jobId, jobType }, "Metadata queue event completed");
    metrics.increment("metadata_job_succeeded", {
      job_type: jobType,
      kind: "unknown",
      reason: "none",
    });
  });
  refreshQueueEvents.on("failed", ({ jobId }) => {
    const jobType = toJobType(jobId);
    logger.error({ jobId, jobType }, "Metadata queue event failed");
    metrics.increment("metadata_job_failed", {
      job_type: jobType,
      kind: "unknown",
      reason: "none",
    });
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
    config.auth,
    metrics,
  );
  const metadataProviderPort = new TmdbMetadataProvider(fetchImpl, config.tmdb, clock);
  const rateLimiterPort = new RedisRateLimiter(redis, keyBuilder, config.rateLimit, metrics);
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
    metrics,
  );
  const readinessCheck = createReadinessCheck({
    redis: async () => snapshotStore.isHealthy(),
    bullmq: async () => isBullMqHealthy(refreshQueue),
  });

  const app = createApp({
    logger,
    mediaLookupService,
    mediaSearchService,
    snapshotStore,
    requestBodyLimitBytes: config.server.requestBodyLimitBytes,
    metricsPort: metrics,
    metricsEndpoint: {
      contentType: metrics.contentType,
      render: () => metrics.render(),
    },
    readinessCheck,
  });

  return {
    app,
    logger,
    async close() {
      await refreshQueueEvents.close();
      await refreshQueue.close();
      redis.disconnect();
    },
  };
}

function toJobType(jobId: string): string {
  if (jobId.startsWith("refresh:")) {
    return "refresh_media_record";
  }
  if (jobId.startsWith("cleanup:")) {
    return "cleanup_expired_cache";
  }
  if (jobId.startsWith("warmup:")) {
    return "warm_hot_record";
  }
  return "unknown";
}

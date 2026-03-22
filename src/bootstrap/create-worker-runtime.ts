import { PrometheusMetrics } from "../adapters/observability/prometheus-metrics.js";
import { createBullMqRefreshWorker } from "../adapters/refresh/create-bullmq-refresh-worker.js";
import { TmdbMetadataProvider } from "../adapters/provider-tmdb/tmdb-metadata-provider.js";
import { RedisKeyBuilder } from "../adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../adapters/redis-store/redis-media-snapshot-store.js";
import { CacheCleanupService } from "../application/refresh/cache-cleanup-service.js";
import { HotRecordWarmupService } from "../application/refresh/hot-record-warmup-service.js";
import { MediaRefreshService } from "../application/refresh/media-refresh-service.js";
import type { MetadataQueueJob } from "../ports/refresh/refresh-queue-port.js";
import type { AppConfig } from "../config/env.js";
import { attachRedisLifecycleLogging } from "./attach-redis-lifecycle-logging.js";
import { createBullMqConnection } from "./create-bullmq-connection.js";
import { createLogger } from "./logger.js";
import { createRedisClient } from "./create-redis-client.js";
import { SystemClock } from "./system-clock.js";

export function createWorkerRuntime(
  config: AppConfig,
  fetchImpl: typeof fetch = fetch,
) {
  const logger = createLogger(config.server.logLevel);
  const metrics = new PrometheusMetrics();
  const clock = new SystemClock();
  const redis = createRedisClient(config.redis, logger, "worker-redis");
  const keyBuilder = new RedisKeyBuilder(config.redis.keyPrefix);
  const snapshotStore = new RedisMediaSnapshotStore(
    redis,
    keyBuilder,
    clock,
    config.tmdb.canonicalRecordTtlSeconds,
    config.search.cacheTtlSeconds,
    config.search.indexTtlSeconds,
  );
  const metadataProviderPort = new TmdbMetadataProvider(fetchImpl, config.tmdb, clock);
  const refreshService = new MediaRefreshService(
    snapshotStore,
    metadataProviderPort,
    logger,
    metrics,
  );
  const cleanupService = new CacheCleanupService(snapshotStore, logger, metrics);
  const warmupService = new HotRecordWarmupService(
    snapshotStore,
    metadataProviderPort,
    logger,
    metrics,
  );
  const worker = createBullMqRefreshWorker({
    queueName: config.refresh.queueName,
    workerOptions: {
      connection: createBullMqConnection(config.redis),
      concurrency: config.refresh.workerConcurrency,
    },
    process: async (job: MetadataQueueJob) => {
      switch (job.jobType) {
        case "refresh_media_record":
          await refreshService.execute(job);
          return;
        case "cleanup_expired_cache":
          await cleanupService.execute(job);
          return;
        case "warm_hot_record":
          await warmupService.execute(job);
          return;
      }
    },
  });
  void worker.client.then((client) => {
    attachRedisLifecycleLogging(client, logger, "worker-refresh-queue");
  });

  worker.on("completed", (job) => {
    logger.info(
      {
        jobId: job.id,
        jobType: job.data.jobType,
        tenantId: job.data.tenantId,
        mediaId: job.data.mediaId,
        kind: job.data.kind,
      },
      "Metadata worker completed job",
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        jobType: job?.data.jobType,
        tenantId: job?.data.tenantId,
        mediaId: job?.data.mediaId,
        kind: job?.data.kind,
        err: error,
      },
      "Metadata worker failed job",
    );
  });

  return {
    logger,
    async close() {
      await worker.close();
      redis.disconnect();
    },
    worker,
  };
}

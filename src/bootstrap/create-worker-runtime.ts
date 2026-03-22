import { createBullMqRefreshWorker } from "../adapters/refresh/create-bullmq-refresh-worker.js";
import { NoopMetrics } from "../adapters/observability/noop-metrics.js";
import { TmdbMetadataProvider } from "../adapters/provider-tmdb/tmdb-metadata-provider.js";
import { RedisKeyBuilder } from "../adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../adapters/redis-store/redis-media-snapshot-store.js";
import { MediaRefreshService } from "../application/refresh/media-refresh-service.js";
import type { AppConfig } from "../config/env.js";
import { createBullMqConnection } from "./create-bullmq-connection.js";
import { createLogger } from "./logger.js";
import { createRedisClient } from "./create-redis-client.js";
import { SystemClock } from "./system-clock.js";

export function createWorkerRuntime(
  config: AppConfig,
  fetchImpl: typeof fetch = fetch,
) {
  const logger = createLogger(config.server.logLevel);
  const metrics = new NoopMetrics();
  const clock = new SystemClock();
  const redis = createRedisClient(config.redis);
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
  const worker = createBullMqRefreshWorker({
    queueName: config.refresh.queueName,
    workerOptions: {
      connection: createBullMqConnection(config.redis),
      concurrency: config.refresh.workerConcurrency,
    },
    process: async (job) => {
      await refreshService.execute(job);
    },
  });

  worker.on("completed", (job) => {
    logger.info(
      {
        jobId: job.id,
        tenantId: job.data.tenantId,
        mediaId: job.data.mediaId,
        kind: job.data.kind,
      },
      "Refresh worker completed job",
    );
  });

  worker.on("failed", (job, error) => {
    logger.error(
      {
        jobId: job?.id,
        tenantId: job?.data.tenantId,
        mediaId: job?.data.mediaId,
        kind: job?.data.kind,
        err: error,
      },
      "Refresh worker failed job",
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

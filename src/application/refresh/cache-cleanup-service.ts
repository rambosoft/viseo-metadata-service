import type { CleanupExpiredCacheJob } from "../../ports/refresh/refresh-queue-port.js";
import type { LoggerPort } from "../../ports/observability/logger-port.js";
import type { MetricsPort } from "../../ports/observability/metrics-port.js";
import type { MediaSnapshotStorePort } from "../../ports/storage/media-snapshot-store-port.js";

const noopLogger: LoggerPort = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const noopMetrics: MetricsPort = {
  increment: () => undefined,
  observe: () => undefined,
};

export class CacheCleanupService {
  public constructor(
    private readonly snapshotStorePort: MediaSnapshotStorePort,
    private readonly logger: LoggerPort = noopLogger,
    private readonly metrics: MetricsPort = noopMetrics,
  ) {}

  public async execute(job: CleanupExpiredCacheJob): Promise<{ removed: number }> {
    const result = await this.snapshotStorePort.cleanupDerivedState({
      tenantId: job.tenantId,
      kind: job.kind,
      mediaId: job.mediaId,
      identifiers: job.identifiers,
    });

    this.logger.info(
      {
        tenantId: job.tenantId,
        kind: job.kind,
        mediaId: job.mediaId,
        removed: result.removed,
      },
      "Cleanup completed successfully",
    );
    this.metrics.increment("metadata_job_succeeded", {
      job_type: job.jobType,
      kind: job.kind,
      reason: "none",
    });

    return result;
  }
}

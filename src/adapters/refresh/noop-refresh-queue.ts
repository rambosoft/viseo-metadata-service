import type {
  CleanupExpiredCacheJob,
  QueueEnqueueResult,
  RefreshMediaJob,
  RefreshQueuePort,
  WarmHotRecordJob,
} from "../../ports/refresh/refresh-queue-port.js";

export class NoopRefreshQueue implements RefreshQueuePort {
  public async enqueueRecordRefresh(job: RefreshMediaJob): Promise<QueueEnqueueResult> {
    return {
      enqueued: false,
      jobId: `noop:${job.mediaId}`,
    };
  }

  public async enqueueExpiredCacheCleanup(
    job: CleanupExpiredCacheJob,
  ): Promise<QueueEnqueueResult> {
    return {
      enqueued: false,
      jobId: `noop:cleanup:${job.mediaId}`,
    };
  }

  public async enqueueHotRecordWarmup(job: WarmHotRecordJob): Promise<QueueEnqueueResult> {
    return {
      enqueued: false,
      jobId: `noop:warmup:${job.mediaId}`,
    };
  }
}

import type { Queue } from "bullmq";

import type {
  CleanupExpiredCacheJob,
  MetadataQueueJob,
  QueueEnqueueResult,
  RefreshMediaJob,
  RefreshQueuePort,
  WarmHotRecordJob,
} from "../../ports/refresh/refresh-queue-port.js";
import {
  cleanupExpiredCacheJobSchema,
  refreshMediaJobSchema,
  warmHotRecordJobSchema,
} from "../../application/refresh/refresh-job-schema.js";

const REFRESH_JOB_NAME = "refresh-media-record";
const CLEANUP_JOB_NAME = "cleanup-expired-cache";
const WARMUP_JOB_NAME = "warm-hot-record";

export function buildRefreshJobId(job: RefreshMediaJob): string {
  return `refresh:${job.tenantId}:${job.kind}:${job.mediaId}`;
}

export function buildCleanupJobId(job: CleanupExpiredCacheJob): string {
  return `cleanup:${job.tenantId}:${job.kind}:${job.mediaId}`;
}

export function buildWarmupJobId(job: WarmHotRecordJob): string {
  return `warmup:${job.tenantId}:${job.kind}:${job.mediaId}`;
}

export class BullMqRefreshQueue implements RefreshQueuePort {
  public constructor(private readonly queue: Queue<MetadataQueueJob>) {}

  public async enqueueRecordRefresh(job: RefreshMediaJob): Promise<QueueEnqueueResult> {
    return this.enqueueValidatedJob(
      refreshMediaJobSchema.parse(job) as RefreshMediaJob,
      REFRESH_JOB_NAME,
      buildRefreshJobId(job),
    );
  }

  public async enqueueExpiredCacheCleanup(
    job: CleanupExpiredCacheJob,
  ): Promise<QueueEnqueueResult> {
    return this.enqueueValidatedJob(
      cleanupExpiredCacheJobSchema.parse(job) as CleanupExpiredCacheJob,
      CLEANUP_JOB_NAME,
      buildCleanupJobId(job),
    );
  }

  public async enqueueHotRecordWarmup(job: WarmHotRecordJob): Promise<QueueEnqueueResult> {
    return this.enqueueValidatedJob(
      warmHotRecordJobSchema.parse(job) as WarmHotRecordJob,
      WARMUP_JOB_NAME,
      buildWarmupJobId(job),
    );
  }

  private async enqueueValidatedJob(
    job: MetadataQueueJob,
    jobName: string,
    jobId: string,
  ): Promise<QueueEnqueueResult> {
    const existing = await this.queue.getJob(jobId);
    if (existing !== null) {
      return { enqueued: false, jobId };
    }

    await this.queue.add(jobName, job, { jobId });
    return { enqueued: true, jobId };
  }
}

export { CLEANUP_JOB_NAME, REFRESH_JOB_NAME, WARMUP_JOB_NAME };

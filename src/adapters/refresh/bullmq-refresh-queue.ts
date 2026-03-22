import type { Queue } from "bullmq";

import type {
  RefreshEnqueueResult,
  RefreshMediaJob,
  RefreshQueuePort,
} from "../../ports/refresh/refresh-queue-port.js";

const REFRESH_JOB_NAME = "refresh-media-record";

export function buildRefreshJobId(job: RefreshMediaJob): string {
  return `refresh:${job.tenantId}:${job.kind}:${job.mediaId}`;
}

export class BullMqRefreshQueue implements RefreshQueuePort {
  public constructor(private readonly queue: Queue<RefreshMediaJob>) {}

  public async enqueueRecordRefresh(job: RefreshMediaJob): Promise<RefreshEnqueueResult> {
    const jobId = buildRefreshJobId(job);
    const existing = await this.queue.getJob(jobId);
    if (existing !== null) {
      return { enqueued: false, jobId };
    }

    await this.queue.add(REFRESH_JOB_NAME, job, { jobId });
    return { enqueued: true, jobId };
  }
}

export { REFRESH_JOB_NAME };

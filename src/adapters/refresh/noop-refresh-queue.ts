import type {
  RefreshEnqueueResult,
  RefreshMediaJob,
  RefreshQueuePort,
} from "../../ports/refresh/refresh-queue-port.js";

export class NoopRefreshQueue implements RefreshQueuePort {
  public async enqueueRecordRefresh(job: RefreshMediaJob): Promise<RefreshEnqueueResult> {
    return {
      enqueued: false,
      jobId: `noop:${job.mediaId}`,
    };
  }
}

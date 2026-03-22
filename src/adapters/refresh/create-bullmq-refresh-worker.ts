import { Worker, type WorkerOptions } from "bullmq";

import type { MetadataQueueJob } from "../../ports/refresh/refresh-queue-port.js";
import {
  cleanupExpiredCacheJobSchema,
  refreshMediaJobSchema,
  warmHotRecordJobSchema,
} from "../../application/refresh/refresh-job-schema.js";
import {
  CLEANUP_JOB_NAME,
  REFRESH_JOB_NAME,
  WARMUP_JOB_NAME,
} from "./bullmq-refresh-queue.js";

export function createBullMqRefreshWorker(args: {
  queueName: string;
  workerOptions: Omit<WorkerOptions, "connection"> & {
    connection: WorkerOptions["connection"];
  };
  process: (job: MetadataQueueJob) => Promise<void>;
}) {
  return new Worker<MetadataQueueJob>(
    args.queueName,
    async (job) => {
      switch (job.name) {
        case REFRESH_JOB_NAME: {
          const payload = refreshMediaJobSchema.parse(job.data);
          await args.process(payload as MetadataQueueJob);
          return;
        }
        case CLEANUP_JOB_NAME: {
          const payload = cleanupExpiredCacheJobSchema.parse(job.data);
          await args.process(payload as MetadataQueueJob);
          return;
        }
        case WARMUP_JOB_NAME: {
          const payload = warmHotRecordJobSchema.parse(job.data);
          await args.process(payload as MetadataQueueJob);
          return;
        }
        default:
          return;
      }
    },
    args.workerOptions,
  );
}

import { Worker, type WorkerOptions } from "bullmq";

import type { RefreshMediaJob } from "../../ports/refresh/refresh-queue-port.js";
import { refreshMediaJobSchema } from "../../application/refresh/refresh-job-schema.js";
import { REFRESH_JOB_NAME } from "./bullmq-refresh-queue.js";

export function createBullMqRefreshWorker(args: {
  queueName: string;
  workerOptions: Omit<WorkerOptions, "connection"> & {
    connection: WorkerOptions["connection"];
  };
  process: (job: RefreshMediaJob) => Promise<void>;
}) {
  return new Worker<RefreshMediaJob>(
    args.queueName,
    async (job) => {
      if (job.name !== REFRESH_JOB_NAME) {
        return;
      }
      const payload = refreshMediaJobSchema.parse(job.data);
      await args.process(payload as RefreshMediaJob);
    },
    args.workerOptions,
  );
}

import { createWorkerRuntime } from "./bootstrap/create-worker-runtime.js";
import { loadConfig } from "./config/env.js";

async function main() {
  const config = loadConfig();
  const runtime = createWorkerRuntime(config);

  runtime.logger.info(
    {
      queueName: config.refresh.queueName,
      concurrency: config.refresh.workerConcurrency,
    },
    "Refresh worker listening",
  );

  const shutdown = async () => {
    runtime.logger.info("Shutting down refresh worker");
    await runtime.close();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}

void main();

import { createWorkerRuntime } from "./bootstrap/create-worker-runtime.js";
import { runShutdownStage } from "./bootstrap/shutdown.js";
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
    await runShutdownStage(
      runtime.logger,
      "worker-runtime",
      config.refresh.workerShutdownTimeoutMs,
      () => runtime.close(),
    );
  };

  process.on("SIGINT", () => {
    void shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
  process.on("SIGTERM", () => {
    void shutdown()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  });
}

void main();

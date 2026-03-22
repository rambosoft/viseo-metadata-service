import { createServer } from "node:http";

import { createRuntime } from "./bootstrap/create-runtime.js";
import { runShutdownStage } from "./bootstrap/shutdown.js";
import { loadConfig } from "./config/env.js";

async function main() {
  const config = loadConfig();
  const runtime = createRuntime(config);
  const server = createServer(runtime.app);

  await new Promise<void>((resolve) => {
    server.listen(config.server.port, resolve);
  });

  runtime.logger.info({ port: config.server.port }, "Server listening");

  const shutdown = async () => {
    runtime.logger.info("Shutting down");
    await runShutdownStage(
      runtime.logger,
      "http-server",
      config.refresh.workerShutdownTimeoutMs,
      () =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => {
            if (error !== undefined) {
              reject(error);
              return;
            }
            resolve();
          });
        }),
    );
    await runShutdownStage(
      runtime.logger,
      "api-runtime",
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

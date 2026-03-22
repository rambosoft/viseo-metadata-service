import { createServer } from "node:http";

import { createRuntime } from "./bootstrap/create-runtime.js";
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
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error !== undefined) {
          reject(error);
          return;
        }
        resolve();
      });
    });
    runtime.redis.disconnect();
  };

  process.on("SIGINT", () => {
    void shutdown().finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void shutdown().finally(() => process.exit(0));
  });
}

void main();

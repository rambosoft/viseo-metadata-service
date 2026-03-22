import { setTimeout as delay } from "node:timers/promises";

import type { LoggerPort } from "../ports/observability/logger-port.js";

export async function runShutdownStage(
  logger: LoggerPort,
  stage: string,
  timeoutMs: number,
  work: () => Promise<void>,
): Promise<void> {
  logger.info({ stage, timeoutMs }, "Shutdown stage started");

  let timeoutHandle: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      work(),
      new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => {
          reject(new Error(`Shutdown stage timed out: ${stage}`));
        }, timeoutMs);
      }),
    ]);
    logger.info({ stage }, "Shutdown stage completed");
  } catch (error) {
    logger.error({ stage, err: error }, "Shutdown stage failed");
    throw error;
  } finally {
    if (timeoutHandle !== undefined) {
      clearTimeout(timeoutHandle);
    }
    await delay(0);
  }
}

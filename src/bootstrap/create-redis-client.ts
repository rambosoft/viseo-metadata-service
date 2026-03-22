import { Redis } from "ioredis";

import type { AppConfig } from "../config/env.js";
import type { LoggerPort } from "../ports/observability/logger-port.js";
import { attachRedisLifecycleLogging } from "./attach-redis-lifecycle-logging.js";

export function createRedisClient(
  redisConfig: AppConfig["redis"],
  logger?: LoggerPort,
  name = "redis",
) {
  const client = new Redis(redisConfig.url, {
    lazyConnect: false,
    keyPrefix: "",
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
  if (logger !== undefined) {
    attachRedisLifecycleLogging(client, logger, name);
  }
  return client;
}

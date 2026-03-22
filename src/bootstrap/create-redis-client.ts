import { Redis } from "ioredis";

import type { AppConfig } from "../config/env.js";

export function createRedisClient(redisConfig: AppConfig["redis"]) {
  return new Redis(redisConfig.url, {
    lazyConnect: false,
    keyPrefix: "",
    enableOfflineQueue: false,
    maxRetriesPerRequest: 1,
  });
}

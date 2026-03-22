import type { ConnectionOptions } from "bullmq";

import type { AppConfig } from "../config/env.js";

export function createBullMqConnection(
  redisConfig: AppConfig["redis"],
): ConnectionOptions {
  const url = new URL(redisConfig.url);
  const db = url.pathname.length > 1 ? Number(url.pathname.slice(1)) : 0;

  return {
    host: url.hostname,
    port: url.port.length > 0 ? Number(url.port) : 6379,
    ...(url.username.length > 0 ? { username: decodeURIComponent(url.username) } : {}),
    ...(url.password.length > 0 ? { password: decodeURIComponent(url.password) } : {}),
    ...(Number.isFinite(db) ? { db } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
  };
}

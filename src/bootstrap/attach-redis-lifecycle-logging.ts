import type { LoggerPort } from "../ports/observability/logger-port.js";

type RedisLike = {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
  status?: string;
};

export function attachRedisLifecycleLogging(
  redis: RedisLike,
  logger: LoggerPort,
  name: string,
): void {
  redis.on("connect", () => {
    logger.info({ dependency: name, status: redis.status }, "Redis dependency connected");
  });
  redis.on("ready", () => {
    logger.info({ dependency: name, status: redis.status }, "Redis dependency ready");
  });
  redis.on("close", () => {
    logger.warn({ dependency: name, status: redis.status }, "Redis dependency closed");
  });
  redis.on("reconnecting", () => {
    logger.warn(
      { dependency: name, status: redis.status },
      "Redis dependency reconnecting",
    );
  });
  redis.on("error", (error) => {
    logger.error(
      { dependency: name, status: redis.status, err: error },
      "Redis dependency error",
    );
  });
}

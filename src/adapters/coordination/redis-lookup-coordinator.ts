import { randomUUID } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";

import type { Redis as RedisClient } from "ioredis";

import type {
  LookupCoordinationKey,
  LookupCoordinatorPort,
  LookupLease,
} from "../../ports/coordination/lookup-coordinator-port.js";
import { RedisKeyBuilder } from "../redis-store/redis-key-builder.js";

export class RedisLookupCoordinator implements LookupCoordinatorPort {
  public constructor(
    private readonly redis: Pick<RedisClient, "del" | "get" | "set">,
    private readonly keyBuilder: RedisKeyBuilder,
    private readonly ttlSeconds: number,
    private readonly waitMs: number,
    private readonly pollMs = 50,
  ) {}

  public async tryAcquire(key: LookupCoordinationKey): Promise<LookupLease | null> {
    const redisKey = this.keyBuilder.lookupSingleFlight(
      key.tenantId,
      key.kind,
      key.identifier,
    );
    const token = randomUUID();
    const result = await this.redis.set(redisKey, token, "EX", this.ttlSeconds, "NX");

    if (result !== "OK") {
      return null;
    }

    return { key: redisKey, token };
  }

  public async waitForAvailability(key: LookupCoordinationKey): Promise<void> {
    const redisKey = this.keyBuilder.lookupSingleFlight(
      key.tenantId,
      key.kind,
      key.identifier,
    );
    const deadline = Date.now() + this.waitMs;

    while (Date.now() < deadline) {
      const current = await this.redis.get(redisKey);
      if (current === null) {
        return;
      }
      await delay(this.pollMs);
    }
  }

  public async release(lease: LookupLease): Promise<void> {
    const current = await this.redis.get(lease.key);
    if (current === lease.token) {
      await this.redis.del(lease.key);
    }
  }
}

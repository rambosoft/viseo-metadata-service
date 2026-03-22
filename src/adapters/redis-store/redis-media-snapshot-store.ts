import type { Redis as RedisClient } from "ioredis";

import { DependencyUnavailableError } from "../../core/shared/errors.js";
import type {
  MediaKind,
  MediaRecord,
  MovieMediaRecord,
  TenantId,
  TvMediaRecord,
} from "../../core/media/types.js";
import type { LookupIdentifier } from "../../ports/providers/metadata-provider-port.js";
import type {
  CachedMediaLookup,
  MediaSnapshotStorePort
} from "../../ports/storage/media-snapshot-store-port.js";
import { toMediaId, toTenantId } from "../../application/lookup/media-lookup-helpers.js";
import { RedisKeyBuilder } from "./redis-key-builder.js";
import { cachedMediaRecordSchema } from "./redis-schemas.js";

export class RedisMediaSnapshotStore implements MediaSnapshotStorePort {
  public constructor(
    private readonly redis: Pick<RedisClient, "get" | "setex" | "ping">,
    private readonly keyBuilder: RedisKeyBuilder,
    private readonly defaultTtlSeconds: number
  ) {}

  public async getLookup(
    tenantId: TenantId,
    kind: MediaKind,
    identifier: LookupIdentifier
  ): Promise<CachedMediaLookup | null> {
    const lookupKey = this.keyBuilder.mediaLookup(tenantId, kind, identifier);
    const recordKeyOrPayload = await this.redis.get(lookupKey);
    if (recordKeyOrPayload === null) {
      return null;
    }

    const maybeRecordJson = recordKeyOrPayload.startsWith("{")
      ? recordKeyOrPayload
      : await this.redis.get(recordKeyOrPayload);

    if (maybeRecordJson === null) {
      return null;
    }

    try {
      const parsed = cachedMediaRecordSchema.parse(JSON.parse(maybeRecordJson));
      return {
        record: this.rehydrateRecord(parsed),
        source: "cache"
      };
    } catch {
      return null;
    }
  }

  public async putSnapshot(record: MediaRecord): Promise<void> {
    const ttlSeconds = Math.max(record.freshness.cacheTtlSeconds, this.defaultTtlSeconds);
    const recordKey = this.keyBuilder.mediaRecord(record.tenantId, record.kind, record.mediaId);
    const serializedRecord = JSON.stringify(record);

    await this.redis.setex(recordKey, ttlSeconds, serializedRecord);
    await this.redis.setex(
      this.keyBuilder.mediaLookup(record.tenantId, record.kind, {
        type: "mediaId",
        value: record.mediaId
      }),
      ttlSeconds,
      recordKey
    );

    if (record.identifiers.tmdbId !== undefined) {
      await this.redis.setex(
        this.keyBuilder.mediaLookup(record.tenantId, record.kind, {
          type: "tmdbId",
          value: record.identifiers.tmdbId
        }),
        ttlSeconds,
        recordKey
      );
    }

    if (record.identifiers.imdbId !== undefined) {
      await this.redis.setex(
        this.keyBuilder.mediaLookup(record.tenantId, record.kind, {
          type: "imdbId",
          value: record.identifiers.imdbId
        }),
        ttlSeconds,
        recordKey
      );
    }
  }

  public async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === "PONG";
    } catch {
      throw new DependencyUnavailableError("Redis unavailable");
    }
  }

  private rehydrateRecord(
    parsed: typeof cachedMediaRecordSchema._type,
  ): MediaRecord {
    const baseRecord = {
      ...parsed,
      mediaId: toMediaId(parsed.mediaId),
      tenantId: toTenantId(parsed.tenantId),
      identifiers: {
        mediaId: toMediaId(parsed.identifiers.mediaId),
        ...(parsed.identifiers.tmdbId !== undefined ? { tmdbId: parsed.identifiers.tmdbId } : {}),
        ...(parsed.identifiers.imdbId !== undefined ? { imdbId: parsed.identifiers.imdbId } : {})
      }
    };

    if (parsed.kind === "movie") {
      return baseRecord as MovieMediaRecord;
    }

    return baseRecord as TvMediaRecord;
  }
}

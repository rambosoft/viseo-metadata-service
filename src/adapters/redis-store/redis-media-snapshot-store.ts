import type { Redis as RedisClient } from "ioredis";

import { DependencyUnavailableError } from "../../core/shared/errors.js";
import type {
  MediaKind,
  MediaRecord,
  MovieMediaRecord,
  TenantId,
  TvMediaRecord,
} from "../../core/media/types.js";
import type {
  LocalIndexSearchResult,
  SearchQuery,
  SearchRequestFingerprint,
  SearchResultItem,
  SearchSnapshot,
} from "../../core/search/types.js";
import { toSearchResultItem } from "../../core/search/search-item.js";
import type { LookupIdentifier } from "../../ports/providers/metadata-provider-port.js";
import type {
  CachedMediaLookup,
  CachedSearchSnapshot,
  MediaSnapshotStorePort
} from "../../ports/storage/media-snapshot-store-port.js";
import { toMediaId, toTenantId } from "../../application/lookup/media-lookup-helpers.js";
import {
  normalizeSearchText,
  scoreSearchItem,
  tokenizeSearchText,
} from "../../application/search/media-search-helpers.js";
import { RedisKeyBuilder } from "./redis-key-builder.js";
import {
  cachedMediaRecordSchema,
  cachedSearchIndexDocumentSchema,
  cachedSearchSnapshotSchema,
} from "./redis-schemas.js";

export class RedisMediaSnapshotStore implements MediaSnapshotStorePort {
  public constructor(
    private readonly redis: Pick<
      RedisClient,
      "expire" | "get" | "mget" | "ping" | "sadd" | "setex" | "smembers" | "srem"
    >,
    private readonly keyBuilder: RedisKeyBuilder,
    private readonly defaultTtlSeconds: number,
    private readonly searchSnapshotTtlSeconds: number,
    private readonly searchIndexTtlSeconds: number,
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

    await this.upsertSearchIndexItems([toSearchResultItem(record)]);
  }

  public async getSearchSnapshot(
    tenantId: TenantId,
    fingerprint: SearchRequestFingerprint,
  ): Promise<CachedSearchSnapshot | null> {
    const key = this.keyBuilder.searchSnapshot(tenantId, fingerprint);
    const payload = await this.redis.get(key);
    if (payload === null) {
      return null;
    }

    try {
      const parsed = cachedSearchSnapshotSchema.parse(JSON.parse(payload));
      return {
        snapshot: this.rehydrateSearchSnapshot(parsed),
        source: "cache",
      };
    } catch {
      return null;
    }
  }

  public async putSearchSnapshot(
    fingerprint: SearchRequestFingerprint,
    snapshot: SearchSnapshot,
  ): Promise<void> {
    const key = this.keyBuilder.searchSnapshot(snapshot.tenantId, fingerprint);
    await this.redis.setex(
      key,
      this.searchSnapshotTtlSeconds,
      JSON.stringify(snapshot),
    );
  }

  public async searchLocalIndex(
    tenantId: TenantId,
    query: SearchQuery,
  ): Promise<LocalIndexSearchResult> {
    const normalizedQuery = normalizeSearchText(query.q);
    const queryTokens = tokenizeSearchText(query.q);
    if (queryTokens.length === 0) {
      return {
        items: [],
        total: 0,
        source: "index",
      };
    }

    const kinds = query.kind !== undefined ? [query.kind] : (["movie", "tv"] as const);
    const candidateIds = new Set<string>();

    for (const kind of kinds) {
      for (const token of queryTokens) {
        const ids = await this.redis.smembers(
          this.keyBuilder.searchIndexToken(tenantId, kind, token),
        );
        for (const id of ids) {
          candidateIds.add(id);
        }
      }
    }

    if (candidateIds.size === 0) {
      return {
        items: [],
        total: 0,
        source: "index",
      };
    }

    const documentKeys = Array.from(candidateIds, (mediaId) =>
      this.keyBuilder.searchIndexDocument(tenantId, mediaId),
    );
    const documentPayloads = await this.redis.mget(...documentKeys);

    const scoredItems = documentPayloads.flatMap((payload) => {
      if (payload === null) {
        return [];
      }

      try {
        const parsed = cachedSearchIndexDocumentSchema.parse(JSON.parse(payload));
        const item = this.rehydrateSearchItem(parsed.item);
        return [
          {
            item,
            score: scoreSearchItem(item, normalizedQuery, queryTokens),
          },
        ];
      } catch {
        return [];
      }
    });

    const filtered = scoredItems
      .filter((entry) => entry.score > 0)
      .sort((left, right) => {
        if (left.score !== right.score) {
          return right.score - left.score;
        }
        const titleCompare = left.item.title.localeCompare(right.item.title);
        if (titleCompare !== 0) {
          return titleCompare;
        }
        return left.item.mediaId.localeCompare(right.item.mediaId);
      });

    const start = (query.page - 1) * query.pageSize;
    const end = start + query.pageSize;

    return {
      items: filtered.slice(start, end).map((entry) => entry.item),
      total: filtered.length,
      source: "index",
    };
  }

  public async upsertSearchIndexItems(items: readonly SearchResultItem[]): Promise<void> {
    for (const item of items) {
      const documentKey = this.keyBuilder.searchIndexDocument(item.tenantId, item.mediaId);
      const existingPayload = await this.redis.get(documentKey);
      if (existingPayload !== null) {
        try {
          const existing = cachedSearchIndexDocumentSchema.parse(JSON.parse(existingPayload));
          for (const token of existing.searchableTokens) {
            await this.redis.srem(
              this.keyBuilder.searchIndexToken(item.tenantId, existing.kind, token),
              item.mediaId,
            );
          }
        } catch {
          // Ignore corrupted index documents and replace them.
        }
      }

      const normalizedTitle = normalizeSearchText(item.title);
      const searchableTokens = Array.from(
        new Set([
          ...tokenizeSearchText(item.title),
          ...(item.originalTitle !== undefined ? tokenizeSearchText(item.originalTitle) : []),
        ]),
      );

      await this.redis.setex(
        documentKey,
        this.searchIndexTtlSeconds,
        JSON.stringify({
          mediaId: item.mediaId,
          tenantId: item.tenantId,
          kind: item.kind,
          item,
          normalizedTitle,
          searchableTokens,
        }),
      );

      for (const token of searchableTokens) {
        const tokenKey = this.keyBuilder.searchIndexToken(item.tenantId, item.kind, token);
        await this.redis.sadd(tokenKey, item.mediaId);
        await this.redis.expire(tokenKey, this.searchIndexTtlSeconds);
      }
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

  private rehydrateSearchSnapshot(
    parsed: typeof cachedSearchSnapshotSchema._type,
  ): SearchSnapshot {
    return {
      tenantId: toTenantId(parsed.tenantId),
      query: parsed.query,
      ...(parsed.kind !== undefined ? { kind: parsed.kind } : {}),
      lang: parsed.lang as SearchSnapshot["lang"],
      page: parsed.page,
      pageSize: parsed.pageSize,
      ...(parsed.total !== undefined ? { total: parsed.total } : {}),
      items: parsed.items.map((item) => this.rehydrateSearchItem(item)),
      sourceProviders: parsed.sourceProviders,
      generatedAt: parsed.generatedAt,
      expiresAt: parsed.expiresAt,
    };
  }

  private rehydrateSearchItem(
    parsed: typeof cachedSearchIndexDocumentSchema._type["item"],
  ): SearchResultItem {
    return {
      mediaId: toMediaId(parsed.mediaId),
      tenantId: toTenantId(parsed.tenantId),
      kind: parsed.kind,
      title: parsed.title,
      ...(parsed.originalTitle !== undefined
        ? { originalTitle: parsed.originalTitle }
        : {}),
      ...(parsed.description !== undefined ? { description: parsed.description } : {}),
      ...(parsed.releaseDate !== undefined ? { releaseDate: parsed.releaseDate } : {}),
      ...(parsed.releaseYear !== undefined ? { releaseYear: parsed.releaseYear } : {}),
      ...(parsed.firstAirDate !== undefined
        ? { firstAirDate: parsed.firstAirDate }
        : {}),
      ...(parsed.firstAirYear !== undefined
        ? { firstAirYear: parsed.firstAirYear }
        : {}),
      ...(parsed.rating !== undefined ? { rating: parsed.rating } : {}),
      genres: parsed.genres,
      images: {
        ...(parsed.images.posterUrl !== undefined
          ? { posterUrl: parsed.images.posterUrl }
          : {}),
        ...(parsed.images.backdropUrl !== undefined
          ? { backdropUrl: parsed.images.backdropUrl }
          : {}),
      },
      identifiers: {
        mediaId: toMediaId(parsed.identifiers.mediaId),
        ...(parsed.identifiers.tmdbId !== undefined
          ? { tmdbId: parsed.identifiers.tmdbId }
          : {}),
        ...(parsed.identifiers.imdbId !== undefined
          ? { imdbId: parsed.identifiers.imdbId }
          : {}),
      },
    };
  }
}

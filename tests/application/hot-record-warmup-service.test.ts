import { describe, expect, it, vi } from "vitest";

import { HotRecordWarmupService } from "../../src/application/refresh/hot-record-warmup-service.js";
import type { MediaRecord } from "../../src/core/media/types.js";

function buildRecord(): MediaRecord {
  return {
    mediaId: "med_1" as never,
    tenantId: "tenant_1" as never,
    kind: "movie",
    canonicalTitle: "Fight Club",
    genres: ["Drama"],
    cast: [],
    images: {},
    identifiers: {
      mediaId: "med_1" as never,
      tmdbId: "550",
      imdbId: "tt0137523",
    },
    providerRefs: [],
    contentHash: "hash",
    freshness: {
      lastFetchedAt: "2026-01-01T00:00:00.000Z",
      cacheTtlSeconds: 3600,
      staleAfter: "2026-01-01T01:00:00.000Z",
      refreshAfter: "2026-01-01T00:45:00.000Z",
      serveStaleUntil: "2026-01-02T01:00:00.000Z",
    },
    schemaVersion: 1,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    releaseDate: "1999-10-15",
    releaseYear: 1999,
    runtimeMinutes: 139,
  };
}

describe("HotRecordWarmupService", () => {
  it("promotes an existing canonical record into the hot cache without provider fetch", async () => {
    const record = buildRecord();
    const snapshotStore = {
      getLookup: vi.fn().mockResolvedValue({
        record,
        state: "stale_but_servable",
        source: "cache",
      }),
      promoteRecord: vi.fn().mockResolvedValue(undefined),
    };
    const provider = {
      lookupByIdentifier: vi.fn(),
    };
    const service = new HotRecordWarmupService(snapshotStore as never, provider as never);

    const result = await service.execute({
      jobType: "warm_hot_record",
      tenantId: "tenant_1" as never,
      requestedAt: "2026-01-01T00:00:00.000Z",
      source: "manual",
      kind: "movie",
      mediaId: "med_1",
      identifiers: record.identifiers,
      language: "en" as never,
    });

    expect(result).toEqual({ warmed: true, source: "canonical" });
    expect(snapshotStore.promoteRecord).toHaveBeenCalledWith(record);
    expect(provider.lookupByIdentifier).not.toHaveBeenCalled();
  });

  it("fetches from the provider when the canonical record is missing", async () => {
    const record = buildRecord();
    const snapshotStore = {
      getLookup: vi.fn().mockResolvedValue(null),
      putSnapshot: vi.fn().mockResolvedValue(undefined),
    };
    const provider = {
      lookupByIdentifier: vi.fn().mockResolvedValue({
        provider: "tmdb",
        record,
      }),
    };
    const service = new HotRecordWarmupService(snapshotStore as never, provider as never);

    const result = await service.execute({
      jobType: "warm_hot_record",
      tenantId: "tenant_1" as never,
      requestedAt: "2026-01-01T00:00:00.000Z",
      source: "manual",
      kind: "movie",
      mediaId: "med_1",
      identifiers: record.identifiers,
      language: "en" as never,
    });

    expect(result).toEqual({ warmed: true, source: "provider" });
    expect(snapshotStore.putSnapshot).toHaveBeenCalled();
  });
});

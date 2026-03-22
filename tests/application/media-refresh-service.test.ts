import { describe, expect, it, vi } from "vitest";

import { MediaRefreshService } from "../../src/application/refresh/media-refresh-service.js";
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

describe("MediaRefreshService", () => {
  it("refreshes a record through the provider and rewrites the snapshot", async () => {
    const snapshotStore = {
      getLookup: vi.fn().mockResolvedValue(null),
      putSnapshot: vi.fn().mockResolvedValue(undefined),
    };
    const record = buildRecord();
    const provider = {
      lookupByIdentifier: vi.fn().mockResolvedValue({
        provider: "tmdb",
        record,
      }),
    };
    const service = new MediaRefreshService(
      snapshotStore as never,
      provider as never,
    );

    const result = await service.execute({
      jobType: "refresh_media_record",
      tenantId: "tenant_1" as never,
      requestedAt: "2026-01-01T00:00:00.000Z",
      kind: "movie",
      mediaId: "med_1",
      identifiers: record.identifiers,
      language: "en" as never,
      source: "stale_lookup",
    });

    expect(result.updated).toBe(true);
    expect(result.outcome).toBe("rewritten");
    expect(snapshotStore.putSnapshot).toHaveBeenCalledWith(record);
  });

  it("skips refresh when no provider identifier is present", async () => {
    const snapshotStore = {
      getLookup: vi.fn().mockResolvedValue(null),
      putSnapshot: vi.fn().mockResolvedValue(undefined),
    };
    const provider = {
      lookupByIdentifier: vi.fn(),
    };
    const service = new MediaRefreshService(
      snapshotStore as never,
      provider as never,
    );

    const result = await service.execute({
      jobType: "refresh_media_record",
      tenantId: "tenant_1" as never,
      requestedAt: "2026-01-01T00:00:00.000Z",
      kind: "movie",
      mediaId: "med_1",
      identifiers: {
        mediaId: "med_1" as never,
      },
      language: "en" as never,
      source: "stale_lookup",
    });

    expect(result.updated).toBe(false);
    expect(result.outcome).toBe("unchanged");
    expect(provider.lookupByIdentifier).not.toHaveBeenCalled();
  });

  it("preserves identity and records an unchanged refresh when content hash matches", async () => {
    const current = buildRecord();
    const incoming = {
      ...buildRecord(),
      createdAt: "2026-02-01T00:00:00.000Z",
      updatedAt: "2026-02-01T00:00:00.000Z",
      freshness: {
        ...buildRecord().freshness,
        lastFetchedAt: "2026-02-01T00:00:00.000Z",
      },
    };
    const snapshotStore = {
      getLookup: vi.fn().mockResolvedValue({
        record: current,
        state: "stale_but_servable",
        source: "cache",
      }),
      putSnapshot: vi.fn().mockResolvedValue(undefined),
    };
    const provider = {
      lookupByIdentifier: vi.fn().mockResolvedValue({
        provider: "tmdb",
        record: incoming,
      }),
    };
    const service = new MediaRefreshService(
      snapshotStore as never,
      provider as never,
    );

    const result = await service.execute({
      jobType: "refresh_media_record",
      tenantId: "tenant_1" as never,
      requestedAt: "2026-01-01T00:00:00.000Z",
      kind: "movie",
      mediaId: "med_1",
      identifiers: current.identifiers,
      language: "en" as never,
      source: "stale_lookup",
    });

    expect(result.updated).toBe(false);
    expect(result.outcome).toBe("unchanged");
    expect(snapshotStore.putSnapshot).toHaveBeenCalledWith(
      expect.objectContaining({
        mediaId: current.mediaId,
        createdAt: current.createdAt,
        updatedAt: incoming.updatedAt,
        contentHash: current.contentHash,
      }),
    );
  });
});

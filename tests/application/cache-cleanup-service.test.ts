import { describe, expect, it, vi } from "vitest";

import { CacheCleanupService } from "../../src/application/refresh/cache-cleanup-service.js";

describe("CacheCleanupService", () => {
  it("delegates derived-state cleanup to the snapshot store", async () => {
    const snapshotStore = {
      cleanupDerivedState: vi.fn().mockResolvedValue({ removed: 4 }),
    };
    const service = new CacheCleanupService(snapshotStore as never);

    const result = await service.execute({
      jobType: "cleanup_expired_cache",
      tenantId: "tenant_1" as never,
      requestedAt: "2026-01-01T00:00:00.000Z",
      source: "maintenance",
      kind: "movie",
      mediaId: "med_1",
      identifiers: {
        mediaId: "med_1" as never,
        tmdbId: "550",
      },
    });

    expect(result.removed).toBe(4);
    expect(snapshotStore.cleanupDerivedState).toHaveBeenCalledWith({
      tenantId: "tenant_1",
      kind: "movie",
      mediaId: "med_1",
      identifiers: {
        mediaId: "med_1",
        tmdbId: "550",
      },
    });
  });
});

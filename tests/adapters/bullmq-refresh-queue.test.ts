import { describe, expect, it, vi } from "vitest";

import {
  BullMqRefreshQueue,
  buildCleanupJobId,
  buildRefreshJobId,
  buildWarmupJobId,
} from "../../src/adapters/refresh/bullmq-refresh-queue.js";

describe("BullMqRefreshQueue", () => {
  it("deduplicates refresh jobs by stable job id", async () => {
    const queue = {
      getJob: vi
        .fn()
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: "refresh:tenant_1:movie:med_1" }),
      add: vi.fn().mockResolvedValue({ id: "refresh:tenant_1:movie:med_1" }),
    };
    const adapter = new BullMqRefreshQueue(queue as never);
    const job = {
      jobType: "refresh_media_record" as const,
      tenantId: "tenant_1" as never,
      requestedAt: "2026-01-01T00:00:00.000Z",
      kind: "movie" as const,
      mediaId: "med_1",
      identifiers: {
        mediaId: "med_1" as never,
        tmdbId: "550",
      },
      language: "en" as never,
      source: "stale_lookup" as const,
    };

    const first = await adapter.enqueueRecordRefresh(job);
    const second = await adapter.enqueueRecordRefresh(job);

    expect(first.enqueued).toBe(true);
    expect(second.enqueued).toBe(false);
    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(buildRefreshJobId(job)).toBe("refresh:tenant_1:movie:med_1");
  });

  it("builds stable cleanup and warmup job ids", () => {
    const cleanupJob = {
      jobType: "cleanup_expired_cache" as const,
      tenantId: "tenant_1" as never,
      requestedAt: "2026-01-01T00:00:00.000Z",
      source: "maintenance" as const,
      kind: "movie" as const,
      mediaId: "med_1",
      identifiers: {
        mediaId: "med_1" as never,
        tmdbId: "550",
      },
    };
    const warmupJob = {
      jobType: "warm_hot_record" as const,
      tenantId: "tenant_1" as never,
      requestedAt: "2026-01-01T00:00:00.000Z",
      source: "manual" as const,
      kind: "tv" as const,
      mediaId: "med_tv_1",
      identifiers: {
        mediaId: "med_tv_1" as never,
        tmdbId: "1396",
      },
      language: "en" as never,
    };

    expect(buildCleanupJobId(cleanupJob)).toBe("cleanup:tenant_1:movie:med_1");
    expect(buildWarmupJobId(warmupJob)).toBe("warmup:tenant_1:tv:med_tv_1");
  });

  it("validates payloads before enqueueing", async () => {
    const queue = {
      getJob: vi.fn(),
      add: vi.fn(),
    };
    const adapter = new BullMqRefreshQueue(queue as never);

    await expect(() =>
      adapter.enqueueHotRecordWarmup({
        jobType: "warm_hot_record",
        tenantId: "tenant_1" as never,
        requestedAt: "2026-01-01T00:00:00.000Z",
        source: "manual",
        kind: "movie",
        mediaId: "",
        identifiers: {
          mediaId: "med_1" as never,
        },
        language: "en" as never,
      }),
    ).rejects.toThrow();
    expect(queue.add).not.toHaveBeenCalled();
  });
});

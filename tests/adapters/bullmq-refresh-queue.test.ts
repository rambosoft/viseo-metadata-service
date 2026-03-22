import { describe, expect, it, vi } from "vitest";

import {
  BullMqRefreshQueue,
  buildRefreshJobId,
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
      tenantId: "tenant_1" as never,
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
});

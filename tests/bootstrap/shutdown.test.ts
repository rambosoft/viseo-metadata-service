import { describe, expect, it, vi } from "vitest";

import { runShutdownStage } from "../../src/bootstrap/shutdown.js";

const logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

describe("runShutdownStage", () => {
  it("completes a shutdown stage within the timeout", async () => {
    await expect(
      runShutdownStage(logger, "test-stage", 100, async () => undefined),
    ).resolves.toBeUndefined();
  });

  it("fails a shutdown stage when it exceeds the timeout", async () => {
    await expect(
      runShutdownStage(logger, "slow-stage", 10, async () => {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }),
    ).rejects.toThrow("Shutdown stage timed out: slow-stage");
  });
});

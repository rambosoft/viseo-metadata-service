import { describe, expect, it } from "vitest";

import { createReadinessCheck } from "../../src/bootstrap/create-readiness-check.js";

describe("createReadinessCheck", () => {
  it("reports ready when all dependencies are healthy", async () => {
    const readinessCheck = createReadinessCheck({
      redis: async () => true,
      bullmq: async () => true,
    });

    await expect(readinessCheck()).resolves.toEqual({
      status: "ready",
      dependencies: {
        redis: "up",
        bullmq: "up",
      },
    });
  });

  it("reports degraded when a dependency check fails", async () => {
    const readinessCheck = createReadinessCheck({
      redis: async () => true,
      bullmq: async () => {
        throw new Error("boom");
      },
    });

    await expect(readinessCheck()).resolves.toEqual({
      status: "degraded",
      dependencies: {
        redis: "up",
        bullmq: "down",
      },
    });
  });
});

export type DependencyStatus = "up" | "down";

export type ReadinessReport = Readonly<{
  status: "ready" | "degraded";
  dependencies: Readonly<Record<string, DependencyStatus>>;
}>;

export function createReadinessCheck(
  dependencies: Readonly<Record<string, () => Promise<boolean>>>,
): () => Promise<ReadinessReport> {
  return async () => {
    const entries = await Promise.all(
      Object.entries(dependencies).map(async ([name, check]) => {
        try {
          const healthy = await check();
          return [name, healthy ? "up" : "down"] as const;
        } catch {
          return [name, "down"] as const;
        }
      }),
    );

    const dependencyState = Object.fromEntries(entries);
    const allUp = Object.values(dependencyState).every((state) => state === "up");

    return {
      status: allUp ? "ready" : "degraded",
      dependencies: dependencyState,
    };
  };
}

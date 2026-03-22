import type { MetricsPort, MetricsTags } from "../../ports/observability/metrics-port.js";

export class NoopMetrics implements MetricsPort {
  public increment(_metric: string, _tags?: MetricsTags): void {}

  public observe(_metric: string, _value: number, _tags?: MetricsTags): void {}
}

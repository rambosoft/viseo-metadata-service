export type MetricsTags = Readonly<Record<string, string | number | boolean>>;

export interface MetricsPort {
  increment(metric: string, tags?: MetricsTags): void;
  observe(metric: string, value: number, tags?: MetricsTags): void;
}

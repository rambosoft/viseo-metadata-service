import {
  Counter,
  Histogram,
  Registry,
  collectDefaultMetrics,
} from "prom-client";

import type { MetricsPort, MetricsTags } from "../../ports/observability/metrics-port.js";

export class PrometheusMetrics implements MetricsPort {
  private readonly registry = new Registry();

  private readonly httpRequestsTotal = new Counter({
    name: "http_requests_total",
    help: "Total number of HTTP requests served",
    labelNames: ["method", "route", "status_code"] as const,
    registers: [this.registry],
  });

  private readonly httpRequestDurationMs = new Histogram({
    name: "http_request_duration_ms",
    help: "HTTP request duration in milliseconds",
    labelNames: ["method", "route", "status_code"] as const,
    buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2000],
    registers: [this.registry],
  });

  private readonly metadataLookupCacheTotal = new Counter({
    name: "metadata_lookup_cache_total",
    help: "Lookup cache outcomes by media kind and freshness state",
    labelNames: ["kind", "state"] as const,
    registers: [this.registry],
  });

  private readonly metadataSearchSourceTotal = new Counter({
    name: "metadata_search_source_total",
    help: "Search result source outcomes",
    labelNames: ["source"] as const,
    registers: [this.registry],
  });

  private readonly authCacheRequestsTotal = new Counter({
    name: "auth_cache_requests_total",
    help: "Auth cache lookup outcomes",
    labelNames: ["outcome"] as const,
    registers: [this.registry],
  });

  private readonly authValidationResultsTotal = new Counter({
    name: "auth_validation_results_total",
    help: "Auth validation outcomes by upstream status",
    labelNames: ["status"] as const,
    registers: [this.registry],
  });

  private readonly providerLatencyMs = new Histogram({
    name: "provider_latency_ms",
    help: "Provider request latency in milliseconds",
    labelNames: ["provider", "operation", "success"] as const,
    buckets: [10, 25, 50, 100, 250, 500, 1000, 2000, 5000],
    registers: [this.registry],
  });

  private readonly providerFailuresTotal = new Counter({
    name: "provider_failures_total",
    help: "Provider failures by provider and operation",
    labelNames: ["provider", "operation"] as const,
    registers: [this.registry],
  });

  private readonly metadataRefreshEnqueueTotal = new Counter({
    name: "metadata_refresh_enqueue_total",
    help: "Refresh enqueue evaluations",
    labelNames: ["kind", "enqueued"] as const,
    registers: [this.registry],
  });

  private readonly metadataRefreshJobsTotal = new Counter({
    name: "metadata_refresh_jobs_total",
    help: "Refresh job outcomes",
    labelNames: ["kind", "outcome", "provider", "reason", "refresh_outcome"] as const,
    registers: [this.registry],
  });

  private readonly metadataJobsTotal = new Counter({
    name: "metadata_jobs_total",
    help: "Background job outcomes by job type",
    labelNames: ["job_type", "outcome", "kind", "reason"] as const,
    registers: [this.registry],
  });

  private readonly cachePayloadEvictionsTotal = new Counter({
    name: "cache_payload_evictions_total",
    help: "Corrupted cache payload evictions by scope and reason",
    labelNames: ["scope", "reason"] as const,
    registers: [this.registry],
  });

  private readonly rateLimitRejectionsTotal = new Counter({
    name: "rate_limit_rejections_total",
    help: "Rate limit rejections by route",
    labelNames: ["route"] as const,
    registers: [this.registry],
  });

  public constructor() {
    collectDefaultMetrics({ register: this.registry });
  }

  public increment(metric: string, tags: MetricsTags = {}): void {
    switch (metric) {
      case "http_request_total":
        this.httpRequestsTotal.inc({
          method: this.asString(tags.method),
          route: this.asString(tags.route),
          status_code: this.asString(tags.status_code),
        });
        return;
      case "metadata_lookup_cache_hit":
        this.metadataLookupCacheTotal.inc({
          kind: this.asString(tags.kind),
          state: this.asString(tags.state),
        });
        return;
      case "metadata_lookup_cache_miss":
        this.metadataLookupCacheTotal.inc({
          kind: this.asString(tags.kind),
          state: "miss",
        });
        return;
      case "metadata_search_source":
        this.metadataSearchSourceTotal.inc({
          source: this.asString(tags.source),
        });
        return;
      case "auth_cache_request":
        this.authCacheRequestsTotal.inc({
          outcome: this.asString(tags.outcome),
        });
        return;
      case "auth_validation_result":
        this.authValidationResultsTotal.inc({
          status: this.asString(tags.status),
        });
        return;
      case "metadata_provider_failure":
        this.providerFailuresTotal.inc({
          provider: this.asString(tags.provider),
          operation: this.asString(tags.operation),
        });
        return;
      case "metadata_refresh_enqueue_requested":
        this.metadataRefreshEnqueueTotal.inc({
          kind: this.asString(tags.kind),
          enqueued: this.asString(tags.enqueued),
        });
        return;
      case "metadata_refresh_succeeded":
        this.metadataRefreshJobsTotal.inc({
          kind: this.asString(tags.kind),
          outcome: "succeeded",
          provider: this.asString(tags.provider),
          reason: "none",
          refresh_outcome: this.asString(tags.refresh_outcome),
        });
        return;
      case "metadata_refresh_failed":
        this.metadataRefreshJobsTotal.inc({
          kind: this.asString(tags.kind),
          outcome: "failed",
          provider: "unknown",
          reason: "none",
          refresh_outcome: "unknown",
        });
        return;
      case "metadata_refresh_skipped":
        this.metadataRefreshJobsTotal.inc({
          kind: this.asString(tags.kind),
          outcome: "skipped",
          provider: "unknown",
          reason: this.asString(tags.reason),
          refresh_outcome: "unknown",
        });
        return;
      case "metadata_job_succeeded":
        this.metadataJobsTotal.inc({
          job_type: this.asString(tags.job_type),
          outcome: "succeeded",
          kind: this.asString(tags.kind),
          reason: this.asString(tags.reason),
        });
        return;
      case "metadata_job_failed":
        this.metadataJobsTotal.inc({
          job_type: this.asString(tags.job_type),
          outcome: "failed",
          kind: this.asString(tags.kind),
          reason: this.asString(tags.reason),
        });
        return;
      case "metadata_job_skipped":
        this.metadataJobsTotal.inc({
          job_type: this.asString(tags.job_type),
          outcome: "skipped",
          kind: this.asString(tags.kind),
          reason: this.asString(tags.reason),
        });
        return;
      case "cache_payload_evicted":
        this.cachePayloadEvictionsTotal.inc({
          scope: this.asString(tags.scope),
          reason: this.asString(tags.reason),
        });
        return;
      case "rate_limit_rejected":
        this.rateLimitRejectionsTotal.inc({
          route: this.asString(tags.route),
        });
        return;
      default:
        return;
    }
  }

  public observe(metric: string, value: number, tags: MetricsTags = {}): void {
    switch (metric) {
      case "http_request_duration_ms":
        this.httpRequestDurationMs.observe(
          {
            method: this.asString(tags.method),
            route: this.asString(tags.route),
            status_code: this.asString(tags.status_code),
          },
          value,
        );
        return;
      case "provider_latency_ms":
        this.providerLatencyMs.observe(
          {
            provider: this.asString(tags.provider),
            operation: this.asString(tags.operation),
            success: this.asString(tags.success),
          },
          value,
        );
        return;
      default:
        return;
    }
  }

  public async render(): Promise<string> {
    return this.registry.metrics();
  }

  public get contentType(): string {
    return this.registry.contentType;
  }

  private asString(value: string | number | boolean | undefined): string {
    if (value === undefined) {
      return "unknown";
    }
    return String(value);
  }
}

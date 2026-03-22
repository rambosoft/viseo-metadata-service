import { NotFoundError } from "../../core/shared/errors.js";
import type { LoggerPort } from "../../ports/observability/logger-port.js";
import type { MetricsPort } from "../../ports/observability/metrics-port.js";
import type { MetadataProviderPort } from "../../ports/providers/metadata-provider-port.js";
import type { MediaSnapshotStorePort } from "../../ports/storage/media-snapshot-store-port.js";
import type { RefreshMediaJob } from "../../ports/refresh/refresh-queue-port.js";

const noopLogger: LoggerPort = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const noopMetrics: MetricsPort = {
  increment: () => undefined,
  observe: () => undefined,
};

export class MediaRefreshService {
  public constructor(
    private readonly snapshotStorePort: MediaSnapshotStorePort,
    private readonly metadataProviderPort: MetadataProviderPort,
    private readonly logger: LoggerPort = noopLogger,
    private readonly metrics: MetricsPort = noopMetrics,
  ) {}

  public async execute(job: RefreshMediaJob): Promise<{ updated: boolean }> {
    const identifier =
      job.identifiers.tmdbId !== undefined
        ? { type: "tmdbId" as const, value: job.identifiers.tmdbId }
        : job.identifiers.imdbId !== undefined
          ? { type: "imdbId" as const, value: job.identifiers.imdbId }
          : null;

    if (identifier === null) {
      this.logger.warn(
        {
          tenantId: job.tenantId,
          mediaId: job.mediaId,
          kind: job.kind,
        },
        "Skipping refresh because no provider identifier is available",
      );
      this.metrics.increment("metadata_refresh_skipped", {
        kind: job.kind,
        reason: "missing_identifier",
      });
      return { updated: false };
    }

    const startedAt = Date.now();
    try {
      const providerResult = await this.metadataProviderPort.lookupByIdentifier({
        tenantId: job.tenantId,
        kind: job.kind,
        identifier,
        language: job.language,
      });
      this.metrics.observe("provider_latency_ms", Date.now() - startedAt, {
        provider: "tmdb",
        operation: "refresh_lookup",
        success: providerResult !== null,
      });

      if (providerResult === null) {
        this.logger.warn(
          {
            tenantId: job.tenantId,
            mediaId: job.mediaId,
            kind: job.kind,
          },
          "Refresh lookup returned no provider record",
        );
        this.metrics.increment("metadata_refresh_skipped", {
          kind: job.kind,
          reason: "provider_not_found",
        });
        return { updated: false };
      }

      await this.snapshotStorePort.putSnapshot(providerResult.record);
      this.logger.info(
        {
          tenantId: job.tenantId,
          mediaId: job.mediaId,
          kind: job.kind,
          provider: providerResult.provider,
        },
        "Refresh completed successfully",
      );
      this.metrics.increment("metadata_refresh_succeeded", {
        kind: job.kind,
        provider: providerResult.provider,
      });
      return { updated: true };
    } catch (error) {
      this.metrics.observe("provider_latency_ms", Date.now() - startedAt, {
        provider: "tmdb",
        operation: "refresh_lookup",
        success: false,
      });
      this.metrics.increment("metadata_refresh_failed", {
        kind: job.kind,
      });
      this.logger.error(
        {
          tenantId: job.tenantId,
          mediaId: job.mediaId,
          kind: job.kind,
          err: error,
        },
        "Refresh job failed",
      );
      throw error;
    }
  }
}

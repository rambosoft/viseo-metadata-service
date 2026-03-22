import type { LoggerPort } from "../../ports/observability/logger-port.js";
import type { MetricsPort } from "../../ports/observability/metrics-port.js";
import type { MetadataProviderPort } from "../../ports/providers/metadata-provider-port.js";
import type { MediaSnapshotStorePort } from "../../ports/storage/media-snapshot-store-port.js";
import type { RefreshMediaJob } from "../../ports/refresh/refresh-queue-port.js";
import type { MediaRecord } from "../../core/media/types.js";

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

  public async execute(job: RefreshMediaJob): Promise<{ updated: boolean; outcome: "rewritten" | "unchanged" }> {
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
      return { updated: false, outcome: "unchanged" };
    }

    const startedAt = Date.now();
    try {
      const current = await this.snapshotStorePort.getLookup(job.tenantId, job.kind, {
        type: "mediaId",
        value: job.mediaId,
      });
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
        return { updated: false, outcome: "unchanged" };
      }

      const mergedRecord =
        current !== null
          ? this.mergeRefreshedRecord(current.record, providerResult.record)
          : providerResult.record;
      const rewritten = current?.record.contentHash !== providerResult.record.contentHash;
      await this.snapshotStorePort.putSnapshot(mergedRecord);
      this.logger.info(
        {
          tenantId: job.tenantId,
          mediaId: job.mediaId,
          kind: job.kind,
          provider: providerResult.provider,
          refreshOutcome: rewritten ? "rewritten" : "unchanged",
        },
        "Refresh completed successfully",
      );
      this.metrics.increment("metadata_refresh_succeeded", {
        kind: job.kind,
        provider: providerResult.provider,
        refresh_outcome: rewritten ? "rewritten" : "unchanged",
      });
      return {
        updated: rewritten,
        outcome: rewritten ? "rewritten" : "unchanged",
      };
    } catch (error) {
      this.metrics.observe("provider_latency_ms", Date.now() - startedAt, {
        provider: "tmdb",
        operation: "refresh_lookup",
        success: false,
      });
      this.metrics.increment("metadata_provider_failure", {
        provider: "tmdb",
        operation: "refresh_lookup",
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

  private mergeRefreshedRecord(current: MediaRecord, incoming: MediaRecord): MediaRecord {
    const base = {
      ...incoming,
      mediaId: current.mediaId,
      createdAt: current.createdAt,
      identifiers: {
        ...current.identifiers,
        ...incoming.identifiers,
        mediaId: current.mediaId,
      },
    } satisfies MediaRecord;

    if (current.contentHash === incoming.contentHash) {
      return {
        ...current,
        freshness: incoming.freshness,
        providerRefs: incoming.providerRefs,
        updatedAt: incoming.updatedAt,
        identifiers: base.identifiers,
      } satisfies MediaRecord;
    }

    return base;
  }
}

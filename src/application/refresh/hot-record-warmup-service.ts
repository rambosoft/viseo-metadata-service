import type { MediaRecord } from "../../core/media/types.js";
import type { LoggerPort } from "../../ports/observability/logger-port.js";
import type { MetricsPort } from "../../ports/observability/metrics-port.js";
import type { MetadataProviderPort } from "../../ports/providers/metadata-provider-port.js";
import type { MediaSnapshotStorePort } from "../../ports/storage/media-snapshot-store-port.js";
import type { WarmHotRecordJob } from "../../ports/refresh/refresh-queue-port.js";

const noopLogger: LoggerPort = {
  info: () => undefined,
  warn: () => undefined,
  error: () => undefined,
};

const noopMetrics: MetricsPort = {
  increment: () => undefined,
  observe: () => undefined,
};

export class HotRecordWarmupService {
  public constructor(
    private readonly snapshotStorePort: MediaSnapshotStorePort,
    private readonly metadataProviderPort: MetadataProviderPort,
    private readonly logger: LoggerPort = noopLogger,
    private readonly metrics: MetricsPort = noopMetrics,
  ) {}

  public async execute(job: WarmHotRecordJob): Promise<{ warmed: boolean; source: "canonical" | "provider" | "skipped" }> {
    const cached = await this.snapshotStorePort.getLookup(job.tenantId, job.kind, {
      type: "mediaId",
      value: job.mediaId,
    });

    if (cached !== null) {
      await this.snapshotStorePort.promoteRecord(cached.record);
      this.metrics.increment("metadata_job_succeeded", {
        job_type: job.jobType,
        kind: job.kind,
        reason: "canonical",
      });
      this.logger.info(
        {
          tenantId: job.tenantId,
          mediaId: job.mediaId,
          kind: job.kind,
        },
        "Warmup promoted canonical record into hot cache",
      );
      return { warmed: true, source: "canonical" };
    }

    const identifier =
      job.identifiers.tmdbId !== undefined
        ? { type: "tmdbId" as const, value: job.identifiers.tmdbId }
        : job.identifiers.imdbId !== undefined
          ? { type: "imdbId" as const, value: job.identifiers.imdbId }
          : null;

    if (identifier === null) {
      this.metrics.increment("metadata_job_skipped", {
        job_type: job.jobType,
        kind: job.kind,
        reason: "missing_identifier",
      });
      this.logger.warn(
        {
          tenantId: job.tenantId,
          mediaId: job.mediaId,
          kind: job.kind,
        },
        "Warmup skipped because no provider identifier is available",
      );
      return { warmed: false, source: "skipped" };
    }

    const startedAt = Date.now();
    const providerResult = await this.metadataProviderPort.lookupByIdentifier({
      tenantId: job.tenantId,
      kind: job.kind,
      identifier,
      language: job.language,
    });
    this.metrics.observe("provider_latency_ms", Date.now() - startedAt, {
      provider: "tmdb",
      operation: "warmup_lookup",
      success: providerResult !== null,
    });

    if (providerResult === null) {
      this.metrics.increment("metadata_job_skipped", {
        job_type: job.jobType,
        kind: job.kind,
        reason: "provider_not_found",
      });
      return { warmed: false, source: "skipped" };
    }

    const warmedRecord = this.mergeRecordIdentity(job.mediaId, providerResult.record);
    await this.snapshotStorePort.putSnapshot(warmedRecord);
    this.metrics.increment("metadata_job_succeeded", {
      job_type: job.jobType,
      kind: job.kind,
      reason: "provider",
    });
    this.logger.info(
      {
        tenantId: job.tenantId,
        mediaId: job.mediaId,
        kind: job.kind,
        provider: providerResult.provider,
      },
      "Warmup refreshed record from provider",
    );
    return { warmed: true, source: "provider" };
  }

  private mergeRecordIdentity(mediaId: string, record: MediaRecord): MediaRecord {
    return {
      ...record,
      mediaId: mediaId as MediaRecord["mediaId"],
      identifiers: {
        ...record.identifiers,
        mediaId: mediaId as MediaRecord["mediaId"],
      },
    };
  }
}

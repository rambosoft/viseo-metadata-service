import {
  MEDIA_KIND_MOVIE,
  type MediaKind,
  type MediaRecord,
} from "../../core/media/types.js";
import { NotFoundError, ValidationError } from "../../core/shared/errors.js";
import type { AuthValidationPort } from "../../ports/auth/auth-validation-port.js";
import type { LookupCoordinatorPort } from "../../ports/coordination/lookup-coordinator-port.js";
import type { LoggerPort } from "../../ports/observability/logger-port.js";
import type { MetricsPort } from "../../ports/observability/metrics-port.js";
import type {
  LookupIdentifier,
  MetadataProviderPort,
} from "../../ports/providers/metadata-provider-port.js";
import type { RateLimiterPort } from "../../ports/rate-limit/rate-limiter-port.js";
import type { RefreshQueuePort } from "../../ports/refresh/refresh-queue-port.js";
import type { MediaSnapshotStorePort } from "../../ports/storage/media-snapshot-store-port.js";
import { toLocaleCode } from "./media-lookup-helpers.js";
import type { MediaLookupQuery } from "./media-lookup-schemas.js";

export type MediaLookupResult = Readonly<{
  record: MediaRecord;
  source: "cache" | "provider";
  stale: boolean;
  tenantId: string;
}>;

export class MediaLookupService {
  private static readonly noopRefreshQueue: RefreshQueuePort = {
    enqueueRecordRefresh: async (job) => ({
      enqueued: false,
      jobId: `noop:${job.mediaId}`,
    }),
    enqueueExpiredCacheCleanup: async (job) => ({
      enqueued: false,
      jobId: `noop:cleanup:${job.mediaId}`,
    }),
    enqueueHotRecordWarmup: async (job) => ({
      enqueued: false,
      jobId: `noop:warmup:${job.mediaId}`,
    }),
  };

  private static readonly noopLookupCoordinator: LookupCoordinatorPort = {
    tryAcquire: async () => ({ key: "noop", token: "noop" }),
    waitForAvailability: async () => undefined,
    release: async () => undefined,
  };

  private static readonly noopLogger: LoggerPort = {
    info: () => undefined,
    warn: () => undefined,
    error: () => undefined,
  };

  private static readonly noopMetrics: MetricsPort = {
    increment: () => undefined,
    observe: () => undefined,
  };

  public constructor(
    private readonly authValidationPort: AuthValidationPort,
    private readonly snapshotStorePort: MediaSnapshotStorePort,
    private readonly metadataProviderPort: MetadataProviderPort,
    private readonly rateLimiterPort: RateLimiterPort,
    private readonly refreshQueuePort: RefreshQueuePort = MediaLookupService.noopRefreshQueue,
    private readonly lookupCoordinatorPort: LookupCoordinatorPort = MediaLookupService.noopLookupCoordinator,
    private readonly logger: LoggerPort = MediaLookupService.noopLogger,
    private readonly metrics: MetricsPort = MediaLookupService.noopMetrics,
  ) {}

  public async execute(args: {
    kind: MediaKind;
    token: string;
    route: string;
    query: MediaLookupQuery;
  }): Promise<MediaLookupResult> {
    const authContext = await this.authValidationPort.validateToken(args.token);
    await this.rateLimiterPort.consume({
      tenantId: authContext.tenantId,
      principalId: authContext.principalId,
      route: args.route,
    });

    const identifier = this.resolveIdentifier(args.query);
    const language = toLocaleCode(args.query.lang);
    const coordinationKey = {
      tenantId: authContext.tenantId,
      kind: args.kind,
      identifier,
    };

    const cached = await this.snapshotStorePort.getLookup(
      authContext.tenantId,
      args.kind,
      identifier,
    );

    if (cached !== null) {
      this.metrics.increment("metadata_lookup_cache_hit", {
        kind: args.kind,
        state: cached.state,
      });
      if (cached.state === "stale_but_servable") {
        await this.enqueueRefresh(cached.record, language);
      }
      this.logger.info(
        {
          tenantId: authContext.tenantId,
          kind: args.kind,
          route: args.route,
          lookupIdentifier: identifier.type,
          cacheState: cached.state,
        },
        "Lookup served from cache",
      );
      return {
        record: cached.record,
        source: "cache",
        stale: cached.state === "stale_but_servable",
        tenantId: authContext.tenantId,
      };
    }

    this.metrics.increment("metadata_lookup_cache_miss", {
      kind: args.kind,
    });

    if (identifier.type === "mediaId") {
      throw new NotFoundError(this.buildNotFoundMessage(args.kind));
    }

    let lease = await this.lookupCoordinatorPort.tryAcquire(coordinationKey);
    if (lease === null) {
      await this.lookupCoordinatorPort.waitForAvailability(coordinationKey);
      const coordinatedResult = await this.snapshotStorePort.getLookup(
        authContext.tenantId,
        args.kind,
        identifier,
      );
      if (coordinatedResult !== null) {
        if (coordinatedResult.state === "stale_but_servable") {
          await this.enqueueRefresh(coordinatedResult.record, language);
        }
        return {
          record: coordinatedResult.record,
          source: "cache",
          stale: coordinatedResult.state === "stale_but_servable",
          tenantId: authContext.tenantId,
        };
      }
      lease = await this.lookupCoordinatorPort.tryAcquire(coordinationKey);
    }

    const providerStartedAt = Date.now();
    try {
      const providerResult = await this.metadataProviderPort.lookupByIdentifier({
        tenantId: authContext.tenantId,
        kind: args.kind,
        identifier,
        language,
      });
      this.metrics.observe("provider_latency_ms", Date.now() - providerStartedAt, {
        provider: providerResult?.provider ?? "composite",
        operation: "lookup",
        success: providerResult !== null,
      });

      if (providerResult === null) {
        throw new NotFoundError(this.buildNotFoundMessage(args.kind));
      }

      await this.snapshotStorePort.putSnapshot(providerResult.record);
      this.logger.info(
        {
          tenantId: authContext.tenantId,
          kind: args.kind,
          route: args.route,
          lookupIdentifier: identifier.type,
          provider: providerResult.provider,
        },
        "Lookup served from provider",
      );

      return {
        record: providerResult.record,
        source: "provider",
        stale: false,
        tenantId: authContext.tenantId,
      };
    } catch (error) {
      this.metrics.observe("provider_latency_ms", Date.now() - providerStartedAt, {
        provider: "composite",
        operation: "lookup",
        success: false,
      });
      this.metrics.increment("metadata_provider_failure", {
        provider: "composite",
        operation: "lookup",
      });

      const fallback = await this.snapshotStorePort.getLookup(
        authContext.tenantId,
        args.kind,
        identifier,
      );
      if (fallback?.state === "stale_but_servable") {
        await this.enqueueRefresh(fallback.record, language);
        this.logger.warn(
          {
            tenantId: authContext.tenantId,
            kind: args.kind,
            route: args.route,
            lookupIdentifier: identifier.type,
          },
          "Lookup served stale fallback after provider failure",
        );
        return {
          record: fallback.record,
          source: "cache",
          stale: true,
          tenantId: authContext.tenantId,
        };
      }
      throw error;
    } finally {
      if (lease !== null) {
        await this.lookupCoordinatorPort.release(lease);
      }
    }
  }

  private resolveIdentifier(query: MediaLookupQuery): LookupIdentifier {
    if (query.mediaId !== undefined) {
      return { type: "mediaId", value: query.mediaId };
    }
    if (query.tmdbId !== undefined) {
      return { type: "tmdbId", value: query.tmdbId };
    }
    if (query.imdbId !== undefined) {
      return { type: "imdbId", value: query.imdbId };
    }
    throw new ValidationError("Exactly one identifier must be provided");
  }

  private buildNotFoundMessage(kind: MediaKind): string {
    return kind === MEDIA_KIND_MOVIE ? "Movie not found" : "TV show not found";
  }

  private async enqueueRefresh(record: MediaRecord, language: ReturnType<typeof toLocaleCode>): Promise<void> {
    const result = await this.refreshQueuePort.enqueueRecordRefresh({
      jobType: "refresh_media_record",
      tenantId: record.tenantId,
      requestedAt: new Date().toISOString(),
      kind: record.kind,
      mediaId: record.mediaId,
      identifiers: record.identifiers,
      language,
      source: "stale_lookup",
    });

    this.metrics.increment("metadata_refresh_enqueue_requested", {
      kind: record.kind,
      enqueued: result.enqueued,
    });
    this.logger.info(
      {
        tenantId: record.tenantId,
        kind: record.kind,
        mediaId: record.mediaId,
        enqueued: result.enqueued,
        jobId: result.jobId,
      },
      "Refresh enqueue evaluated",
    );
  }
}

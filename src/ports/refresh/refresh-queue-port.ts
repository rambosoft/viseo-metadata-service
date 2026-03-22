import type { LocaleCode, MediaIdentifiers, MediaKind, TenantId } from "../../core/media/types.js";

type BaseMetadataJob = Readonly<{
  tenantId: TenantId;
  requestedAt: string;
  source: "stale_lookup" | "maintenance" | "manual";
}>;

export type RefreshMediaJob = BaseMetadataJob & Readonly<{
  jobType: "refresh_media_record";
  kind: MediaKind;
  mediaId: string;
  identifiers: MediaIdentifiers;
  language: LocaleCode;
}>;

export type CleanupExpiredCacheJob = BaseMetadataJob &
  Readonly<{
    jobType: "cleanup_expired_cache";
    kind: MediaKind;
    mediaId: string;
    identifiers: MediaIdentifiers;
  }>;

export type WarmHotRecordJob = BaseMetadataJob &
  Readonly<{
    jobType: "warm_hot_record";
    kind: MediaKind;
    mediaId: string;
    identifiers: MediaIdentifiers;
    language: LocaleCode;
  }>;

export type MetadataQueueJob =
  | RefreshMediaJob
  | CleanupExpiredCacheJob
  | WarmHotRecordJob;

export type QueueEnqueueResult = Readonly<{
  enqueued: boolean;
  jobId: string;
}>;

export interface RefreshQueuePort {
  enqueueRecordRefresh(job: RefreshMediaJob): Promise<QueueEnqueueResult>;
  enqueueExpiredCacheCleanup(job: CleanupExpiredCacheJob): Promise<QueueEnqueueResult>;
  enqueueHotRecordWarmup(job: WarmHotRecordJob): Promise<QueueEnqueueResult>;
}

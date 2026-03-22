import type { LocaleCode, MediaIdentifiers, MediaKind, TenantId } from "../../core/media/types.js";

export type RefreshMediaJob = Readonly<{
  tenantId: TenantId;
  kind: MediaKind;
  mediaId: string;
  identifiers: MediaIdentifiers;
  language: LocaleCode;
  source: "stale_lookup";
}>;

export type RefreshEnqueueResult = Readonly<{
  enqueued: boolean;
  jobId: string;
}>;

export interface RefreshQueuePort {
  enqueueRecordRefresh(job: RefreshMediaJob): Promise<RefreshEnqueueResult>;
}

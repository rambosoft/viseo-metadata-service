import type { MediaKind, MediaRecord, TenantId } from "../../core/media/types.js";
import type { LookupIdentifier } from "../providers/metadata-provider-port.js";

export type CachedMediaLookup = Readonly<{
  record: MediaRecord;
  source: "cache";
}>;

export interface MediaSnapshotStorePort {
  getLookup(
    tenantId: TenantId,
    kind: MediaKind,
    identifier: LookupIdentifier,
  ): Promise<CachedMediaLookup | null>;
  putSnapshot(record: MediaRecord): Promise<void>;
  isHealthy(): Promise<boolean>;
}

import type { MediaRecord, TenantId } from "../../core/media/types.js";
import type { LookupIdentifier } from "../providers/metadata-provider-port.js";

export type CachedMovieLookup = Readonly<{
  record: MediaRecord;
  source: "cache";
}>;

export interface MediaSnapshotStorePort {
  getMovieLookup(
    tenantId: TenantId,
    identifier: LookupIdentifier,
  ): Promise<CachedMovieLookup | null>;
  putMovieSnapshot(record: MediaRecord): Promise<void>;
  isHealthy(): Promise<boolean>;
}

import type { MediaKind, MediaRecord, TenantId } from "../../core/media/types.js";
import type {
  LocalIndexSearchResult,
  SearchQuery,
  SearchRequestFingerprint,
  SearchResultItem,
  SearchSnapshot,
} from "../../core/search/types.js";
import type { LookupIdentifier } from "../providers/metadata-provider-port.js";

export type CachedMediaLookup = Readonly<{
  record: MediaRecord;
  state: "fresh" | "stale_but_servable";
  source: "cache";
}>;

export type CachedSearchSnapshot = Readonly<{
  snapshot: SearchSnapshot;
  source: "cache";
}>;

export interface MediaSnapshotStorePort {
  getLookup(
    tenantId: TenantId,
    kind: MediaKind,
    identifier: LookupIdentifier,
  ): Promise<CachedMediaLookup | null>;
  putSnapshot(record: MediaRecord): Promise<void>;
  getSearchSnapshot(
    tenantId: TenantId,
    fingerprint: SearchRequestFingerprint,
  ): Promise<CachedSearchSnapshot | null>;
  putSearchSnapshot(
    fingerprint: SearchRequestFingerprint,
    snapshot: SearchSnapshot,
  ): Promise<void>;
  searchLocalIndex(
    tenantId: TenantId,
    query: SearchQuery,
  ): Promise<LocalIndexSearchResult>;
  upsertSearchIndexItems(items: readonly SearchResultItem[]): Promise<void>;
  isHealthy(): Promise<boolean>;
}

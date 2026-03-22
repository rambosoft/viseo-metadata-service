import type { AuthValidationPort } from "../../ports/auth/auth-validation-port.js";
import type { MetadataProviderPort } from "../../ports/providers/metadata-provider-port.js";
import type { RateLimiterPort } from "../../ports/rate-limit/rate-limiter-port.js";
import type { ClockPort } from "../../ports/shared/clock-port.js";
import type { MediaSnapshotStorePort } from "../../ports/storage/media-snapshot-store-port.js";
import { toLocaleCode } from "../lookup/media-lookup-helpers.js";
import {
  buildSearchRequestFingerprint,
  buildSearchSnapshot,
  canServePageFromLocalIndex,
} from "./media-search-helpers.js";
import type { MediaSearchQuery } from "./media-search-schemas.js";
import type { SearchResultItem, SearchSource } from "../../core/search/types.js";

export type MediaSearchResult = Readonly<{
  items: readonly SearchResultItem[];
  page: number;
  pageSize: number;
  total?: number;
  source: SearchSource;
  stale: boolean;
  tenantId: string;
}>;

export class MediaSearchService {
  public constructor(
    private readonly authValidationPort: AuthValidationPort,
    private readonly snapshotStorePort: MediaSnapshotStorePort,
    private readonly metadataProviderPort: MetadataProviderPort,
    private readonly rateLimiterPort: RateLimiterPort,
    private readonly clockPort: ClockPort,
    private readonly snapshotTtlSeconds: number,
  ) {}

  public async execute(args: {
    token: string;
    route: string;
    query: MediaSearchQuery;
  }): Promise<MediaSearchResult> {
    const authContext = await this.authValidationPort.validateToken(args.token);
    await this.rateLimiterPort.consume({
      tenantId: authContext.tenantId,
      principalId: authContext.principalId,
      route: args.route,
    });

    const searchQuery = {
      q: args.query.q,
      ...(args.query.kind !== undefined ? { kind: args.query.kind } : {}),
      lang: toLocaleCode(args.query.lang),
      page: args.query.page,
      pageSize: args.query.pageSize,
    };

    const fingerprint = buildSearchRequestFingerprint({
      tenantId: authContext.tenantId,
      q: searchQuery.q,
      ...(searchQuery.kind !== undefined ? { kind: searchQuery.kind } : {}),
      lang: searchQuery.lang,
      page: searchQuery.page,
      pageSize: searchQuery.pageSize,
    });

    const cached = await this.snapshotStorePort.getSearchSnapshot(
      authContext.tenantId,
      fingerprint,
    );
    if (cached !== null) {
      return {
        items: cached.snapshot.items,
        page: cached.snapshot.page,
        pageSize: cached.snapshot.pageSize,
        ...(cached.snapshot.total !== undefined ? { total: cached.snapshot.total } : {}),
        source: "cache",
        stale: false,
        tenantId: authContext.tenantId,
      };
    }

    const localIndexResult = await this.snapshotStorePort.searchLocalIndex(
      authContext.tenantId,
      searchQuery,
    );
    if (canServePageFromLocalIndex(localIndexResult, searchQuery)) {
      await this.snapshotStorePort.putSearchSnapshot(
        fingerprint,
        buildSearchSnapshot({
          tenantId: authContext.tenantId,
          query: searchQuery,
          items: localIndexResult.items,
          ...(localIndexResult.total !== undefined ? { total: localIndexResult.total } : {}),
          sourceProviders: ["local_index"],
          clock: this.clockPort,
          ttlSeconds: this.snapshotTtlSeconds,
        }),
      );

      return {
        items: localIndexResult.items,
        page: searchQuery.page,
        pageSize: searchQuery.pageSize,
        ...(localIndexResult.total !== undefined ? { total: localIndexResult.total } : {}),
        source: "index",
        stale: false,
        tenantId: authContext.tenantId,
      };
    }

    const providerResult = await this.metadataProviderPort.search({
      tenantId: authContext.tenantId,
      ...(searchQuery.kind !== undefined ? { kind: searchQuery.kind } : {}),
      query: searchQuery.q,
      language: searchQuery.lang,
      page: searchQuery.page,
      pageSize: searchQuery.pageSize,
    });

    await this.snapshotStorePort.upsertSearchIndexItems(providerResult.items);
    await this.snapshotStorePort.putSearchSnapshot(
      fingerprint,
      buildSearchSnapshot({
        tenantId: authContext.tenantId,
        query: searchQuery,
        items: providerResult.items,
        ...(providerResult.total !== undefined ? { total: providerResult.total } : {}),
        sourceProviders: providerResult.sourceProviders,
        clock: this.clockPort,
        ttlSeconds: this.snapshotTtlSeconds,
      }),
    );

    return {
      items: providerResult.items,
      page: searchQuery.page,
      pageSize: searchQuery.pageSize,
      ...(providerResult.total !== undefined ? { total: providerResult.total } : {}),
      source: "provider",
      stale: false,
      tenantId: authContext.tenantId,
    };
  }
}

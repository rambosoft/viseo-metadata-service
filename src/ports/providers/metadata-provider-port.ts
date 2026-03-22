import type {
  LocaleCode,
  MediaKind,
  MediaRecord,
  ProviderName,
} from "../../core/media/types.js";
import type { SearchResultItem } from "../../core/search/types.js";

export type LookupIdentifier =
  | Readonly<{ type: "mediaId"; value: string }>
  | Readonly<{ type: "tmdbId"; value: string }>
  | Readonly<{ type: "imdbId"; value: string }>;

export type LookupByIdentifierArgs = Readonly<{
  tenantId: string;
  kind: MediaKind;
  identifier: LookupIdentifier;
  language: LocaleCode;
}>;

export type ProviderLookupResult = Readonly<{
  provider: ProviderName;
  record: MediaRecord;
}>;

export type ProviderSearchArgs = Readonly<{
  tenantId: string;
  kind?: MediaKind;
  query: string;
  language: LocaleCode;
  page: number;
  pageSize: number;
}>;

export type ProviderSearchResult = Readonly<{
  provider: ProviderName;
  sourceProviders: readonly ProviderName[];
  items: readonly SearchResultItem[];
  total?: number;
}>;

export interface MetadataProviderPort {
  lookupByIdentifier(
    args: LookupByIdentifierArgs,
  ): Promise<ProviderLookupResult | null>;
  search(args: ProviderSearchArgs): Promise<ProviderSearchResult>;
}

import type {
  LocaleCode,
  MediaId,
  MediaIdentifiers,
  MediaKind,
  TenantId,
} from "../media/types.js";

export type SearchSource = "cache" | "index" | "provider";

export type SearchResultItem = Readonly<{
  mediaId: MediaId;
  tenantId: TenantId;
  kind: MediaKind;
  title: string;
  originalTitle?: string;
  description?: string;
  releaseDate?: string;
  releaseYear?: number;
  firstAirDate?: string;
  firstAirYear?: number;
  rating?: number;
  genres: readonly string[];
  images: Readonly<{
    posterUrl?: string;
    backdropUrl?: string;
  }>;
  identifiers: MediaIdentifiers;
}>;

export type SearchQuery = Readonly<{
  q: string;
  kind?: MediaKind;
  lang: LocaleCode;
  page: number;
  pageSize: number;
}>;

export type SearchSnapshot = Readonly<{
  tenantId: TenantId;
  query: string;
  kind?: MediaKind;
  lang: LocaleCode;
  page: number;
  pageSize: number;
  total?: number;
  items: readonly SearchResultItem[];
  sourceProviders: readonly string[];
  generatedAt: string;
  expiresAt: string;
}>;

export type SearchRequestFingerprint = string & {
  readonly __brand: "SearchRequestFingerprint";
};

export type LocalIndexSearchResult = Readonly<{
  items: readonly SearchResultItem[];
  total: number;
  source: "index";
}>;

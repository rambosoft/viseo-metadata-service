import type { Brand } from "../shared/brand.js";

export type TenantId = Brand<string, "TenantId">;
export type MediaId = Brand<string, "MediaId">;
export type LocaleCode = Brand<string, "LocaleCode">;

export const MEDIA_KIND_MOVIE = "movie";
export type MediaKind = typeof MEDIA_KIND_MOVIE;

export type ProviderName = "tmdb" | "imdb";

export type MediaIdentifiers = Readonly<{
  mediaId: MediaId;
  tmdbId?: string;
  imdbId?: string;
}>;

export type ProviderSnapshot = Readonly<{
  provider: ProviderName;
  providerRecordId: string;
  normalizedAt: string;
  hash: string;
  payload: Record<string, unknown>;
}>;

export type FreshnessState = Readonly<{
  lastFetchedAt: string;
  cacheTtlSeconds: number;
  staleAfter: string;
  refreshAfter: string;
}>;

export type MediaRecord = Readonly<{
  mediaId: MediaId;
  tenantId: TenantId;
  kind: MediaKind;
  canonicalTitle: string;
  originalTitle?: string;
  description?: string;
  genres: readonly string[];
  releaseDate?: string;
  releaseYear?: number;
  runtimeMinutes?: number;
  rating?: number;
  cast: ReadonlyArray<Readonly<{ name: string; role?: string }>>;
  images: Readonly<{
    posterUrl?: string;
    backdropUrl?: string;
  }>;
  identifiers: MediaIdentifiers;
  providerRefs: readonly ProviderSnapshot[];
  contentHash: string;
  freshness: FreshnessState;
  schemaVersion: 1;
  createdAt: string;
  updatedAt: string;
}>;

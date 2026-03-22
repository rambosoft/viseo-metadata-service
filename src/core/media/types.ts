import type { Brand } from "../shared/brand.js";

export type TenantId = Brand<string, "TenantId">;
export type MediaId = Brand<string, "MediaId">;
export type LocaleCode = Brand<string, "LocaleCode">;

export const MEDIA_KIND_MOVIE = "movie";
export const MEDIA_KIND_TV = "tv";
export type MediaKind = typeof MEDIA_KIND_MOVIE | typeof MEDIA_KIND_TV;

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
  serveStaleUntil: string;
}>;

type BaseMediaRecord = Readonly<{
  mediaId: MediaId;
  tenantId: TenantId;
  kind: MediaKind;
  canonicalTitle: string;
  originalTitle?: string;
  description?: string;
  genres: readonly string[];
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

export type MovieMediaRecord = BaseMediaRecord &
  Readonly<{
    kind: typeof MEDIA_KIND_MOVIE;
    releaseDate?: string;
    releaseYear?: number;
    runtimeMinutes?: number;
  }>;

export type TvMediaRecord = BaseMediaRecord &
  Readonly<{
    kind: typeof MEDIA_KIND_TV;
    firstAirDate?: string;
    firstAirYear?: number;
    seasonCount?: number;
    episodeCount?: number;
    status?: string;
  }>;

export type MediaRecord = MovieMediaRecord | TvMediaRecord;

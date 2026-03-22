import type {
  LocaleCode,
  MediaKind,
  ProviderSnapshot,
  ProviderName,
} from "../../core/media/types.js";

export type ImdbLookupArgs = Readonly<{
  tenantId: string;
  kind: MediaKind;
  imdbId: string;
  language: LocaleCode;
}>;

export type ImdbLookupRecord = Readonly<{
  provider: Extract<ProviderName, "imdb">;
  kind: MediaKind;
  imdbId: string;
  title: string;
  originalTitle?: string;
  description?: string;
  genres: readonly string[];
  releaseDate?: string;
  releaseYear?: number;
  firstAirDate?: string;
  firstAirYear?: number;
  runtimeMinutes?: number;
  seasonCount?: number;
  episodeCount?: number;
  status?: string;
  rating?: number;
  cast: ReadonlyArray<Readonly<{ name: string; role?: string }>>;
  images: Readonly<{
    posterUrl?: string;
    backdropUrl?: string;
  }>;
  providerRef: ProviderSnapshot;
}>;

export interface ImdbEnrichmentProviderPort {
  lookupByImdbId(args: ImdbLookupArgs): Promise<ImdbLookupRecord | null>;
}

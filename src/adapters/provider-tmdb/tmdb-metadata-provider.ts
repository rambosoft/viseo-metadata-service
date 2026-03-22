import {
  buildContentHash,
  buildMediaId,
  computeFreshness,
} from "../../application/lookup/media-lookup-helpers.js";
import { ProviderUnavailableError } from "../../core/shared/errors.js";
import type {
  MediaRecord,
  MovieMediaRecord,
  TvMediaRecord,
} from "../../core/media/types.js";
import type { MetadataProviderPort, ProviderLookupResult } from "../../ports/providers/metadata-provider-port.js";
import type { ClockPort } from "../../ports/shared/clock-port.js";
import {
  tmdbFindResponseSchema,
  tmdbMovieDetailsSchema,
  tmdbTvDetailsSchema,
} from "./tmdb-schemas.js";

type FetchLike = typeof fetch;

type TmdbConfig = Readonly<{
  baseUrl: string;
  apiKey: string;
  imageBaseUrl: string;
  timeoutMs: number;
  movieTtlSeconds: number;
  tvTtlSeconds: number;
}>;

export class TmdbMetadataProvider implements MetadataProviderPort {
  public constructor(
    private readonly fetchImpl: FetchLike,
    private readonly tmdbConfig: TmdbConfig,
    private readonly clockPort: ClockPort
  ) {}

  public async lookupByIdentifier(
    args: Parameters<MetadataProviderPort["lookupByIdentifier"]>[0]
  ): Promise<ProviderLookupResult | null> {
    if (args.identifier.type === "mediaId") {
      return null;
    }

    if (args.kind === "movie") {
      const payload =
        args.identifier.type === "tmdbId"
          ? await this.lookupMovieByTmdbId(args.identifier.value, args.language)
          : await this.lookupMovieByImdbId(args.identifier.value, args.language);

      if (payload === null) {
        return null;
      }

      return {
        provider: "tmdb",
        record: this.toMovieRecord(args.tenantId, payload)
      };
    }

    const payload =
      args.identifier.type === "tmdbId"
        ? await this.lookupTvByTmdbId(args.identifier.value, args.language)
        : await this.lookupTvByImdbId(args.identifier.value, args.language);

    if (payload === null) {
      return null;
    }

    return {
      provider: "tmdb",
      record: this.toTvRecord(
        args.tenantId,
        payload,
        args.identifier.type === "imdbId" ? args.identifier.value : undefined
      )
    };
  }

  private async lookupMovieByTmdbId(id: string, language: string) {
    return this.fetchTmdb(`/movie/${encodeURIComponent(id)}?language=${encodeURIComponent(language)}`);
  }

  private async lookupMovieByImdbId(id: string, language: string) {
    const findResult = await this.fetchTmdbFind(
      `/find/${encodeURIComponent(id)}?external_source=imdb_id&language=${encodeURIComponent(language)}`
    );
    const movie = findResult.movie_results[0];
    if (movie === undefined) {
      return null;
    }
    return this.fetchTmdb(`/movie/${movie.id}?language=${encodeURIComponent(language)}`);
  }

  private async lookupTvByTmdbId(id: string, language: string) {
    return this.fetchTmdbTv(`/tv/${encodeURIComponent(id)}?language=${encodeURIComponent(language)}`);
  }

  private async lookupTvByImdbId(id: string, language: string) {
    const findResult = await this.fetchTmdbFind(
      `/find/${encodeURIComponent(id)}?external_source=imdb_id&language=${encodeURIComponent(language)}`
    );
    const show = findResult.tv_results[0];
    if (show === undefined) {
      return null;
    }
    return this.fetchTmdbTv(`/tv/${show.id}?language=${encodeURIComponent(language)}`);
  }

  private toMovieRecord(tenantId: string, payload: typeof tmdbMovieDetailsSchema._type): MovieMediaRecord {
    const now = this.clockPort.now().toISOString();
    const mediaId = buildMediaId("tmdb", "movie", {
      type: "tmdbId",
      value: String(payload.id)
    });
    const contentHash = buildContentHash({
      title: payload.title,
      releaseDate: payload.release_date,
      runtime: payload.runtime,
      rating: payload.vote_average,
      genres: payload.genres.map((genre) => genre.name)
    });

    return {
      mediaId,
      tenantId: tenantId as MediaRecord["tenantId"],
      kind: "movie",
      canonicalTitle: payload.title,
      ...(payload.original_title !== undefined ? { originalTitle: payload.original_title } : {}),
      ...(payload.overview !== undefined ? { description: payload.overview } : {}),
      genres: payload.genres.map((genre) => genre.name),
      ...(payload.release_date !== undefined ? { releaseDate: payload.release_date } : {}),
      ...(
        payload.release_date !== undefined && payload.release_date.length >= 4
          ? { releaseYear: Number(payload.release_date.slice(0, 4)) }
          : {}
      ),
      ...(payload.runtime !== null && payload.runtime !== undefined ? { runtimeMinutes: payload.runtime } : {}),
      ...(payload.vote_average !== undefined ? { rating: payload.vote_average } : {}),
      cast: [],
      images: {
        ...(payload.poster_path ? { posterUrl: `${this.tmdbConfig.imageBaseUrl}${payload.poster_path}` } : {}),
        ...(payload.backdrop_path ? { backdropUrl: `${this.tmdbConfig.imageBaseUrl}${payload.backdrop_path}` } : {})
      },
      identifiers: {
        mediaId,
        tmdbId: String(payload.id),
        ...(payload.imdb_id ? { imdbId: payload.imdb_id } : {})
      },
      providerRefs: [
        {
          provider: "tmdb",
          providerRecordId: String(payload.id),
          normalizedAt: now,
          hash: contentHash,
          payload
        }
      ],
      contentHash,
      freshness: computeFreshness(this.clockPort, this.tmdbConfig.movieTtlSeconds),
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now
    };
  }

  private toTvRecord(
    tenantId: string,
    payload: typeof tmdbTvDetailsSchema._type,
    imdbId?: string
  ): TvMediaRecord {
    const now = this.clockPort.now().toISOString();
    const mediaId = buildMediaId("tmdb", "tv", {
      type: "tmdbId",
      value: String(payload.id)
    });
    const contentHash = buildContentHash({
      title: payload.name,
      firstAirDate: payload.first_air_date,
      seasonCount: payload.number_of_seasons,
      episodeCount: payload.number_of_episodes,
      rating: payload.vote_average,
      genres: payload.genres.map((genre) => genre.name)
    });

    return {
      mediaId,
      tenantId: tenantId as MediaRecord["tenantId"],
      kind: "tv",
      canonicalTitle: payload.name,
      ...(payload.original_name !== undefined ? { originalTitle: payload.original_name } : {}),
      ...(payload.overview !== undefined ? { description: payload.overview } : {}),
      genres: payload.genres.map((genre) => genre.name),
      ...(payload.first_air_date !== undefined ? { firstAirDate: payload.first_air_date } : {}),
      ...(
        payload.first_air_date !== undefined && payload.first_air_date.length >= 4
          ? { firstAirYear: Number(payload.first_air_date.slice(0, 4)) }
          : {}
      ),
      ...(payload.number_of_seasons !== undefined ? { seasonCount: payload.number_of_seasons } : {}),
      ...(payload.number_of_episodes !== undefined ? { episodeCount: payload.number_of_episodes } : {}),
      ...(payload.status !== undefined ? { status: payload.status } : {}),
      ...(payload.vote_average !== undefined ? { rating: payload.vote_average } : {}),
      cast: [],
      images: {
        ...(payload.poster_path ? { posterUrl: `${this.tmdbConfig.imageBaseUrl}${payload.poster_path}` } : {}),
        ...(payload.backdrop_path ? { backdropUrl: `${this.tmdbConfig.imageBaseUrl}${payload.backdrop_path}` } : {})
      },
      identifiers: {
        mediaId,
        tmdbId: String(payload.id),
        ...(imdbId !== undefined ? { imdbId } : {})
      },
      providerRefs: [
        {
          provider: "tmdb",
          providerRecordId: String(payload.id),
          normalizedAt: now,
          hash: contentHash,
          payload
        }
      ],
      contentHash,
      freshness: computeFreshness(this.clockPort, this.tmdbConfig.tvTtlSeconds),
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now
    };
  }

  private async fetchTmdb(path: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.tmdbConfig.timeoutMs);

    try {
      const response = await this.fetchImpl(
        `${this.tmdbConfig.baseUrl}${path}${path.includes("?") ? "&" : "?"}api_key=${this.tmdbConfig.apiKey}`,
        { signal: controller.signal }
      );
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new ProviderUnavailableError("TMDB unavailable");
      }
      return tmdbMovieDetailsSchema.parse(await response.json());
    } catch (error) {
      if (error instanceof ProviderUnavailableError) {
        throw error;
      }
      throw new ProviderUnavailableError("TMDB unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchTmdbTv(path: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.tmdbConfig.timeoutMs);

    try {
      const response = await this.fetchImpl(
        `${this.tmdbConfig.baseUrl}${path}${path.includes("?") ? "&" : "?"}api_key=${this.tmdbConfig.apiKey}`,
        { signal: controller.signal }
      );
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new ProviderUnavailableError("TMDB unavailable");
      }
      return tmdbTvDetailsSchema.parse(await response.json());
    } catch (error) {
      if (error instanceof ProviderUnavailableError) {
        throw error;
      }
      throw new ProviderUnavailableError("TMDB unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }

  private async fetchTmdbFind(path: string) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.tmdbConfig.timeoutMs);

    try {
      const response = await this.fetchImpl(
        `${this.tmdbConfig.baseUrl}${path}${path.includes("?") ? "&" : "?"}api_key=${this.tmdbConfig.apiKey}`,
        { signal: controller.signal }
      );
      if (!response.ok) {
        throw new ProviderUnavailableError("TMDB unavailable");
      }
      return tmdbFindResponseSchema.parse(await response.json());
    } catch (error) {
      if (error instanceof ProviderUnavailableError) {
        throw error;
      }
      throw new ProviderUnavailableError("TMDB unavailable");
    } finally {
      clearTimeout(timeout);
    }
  }
}

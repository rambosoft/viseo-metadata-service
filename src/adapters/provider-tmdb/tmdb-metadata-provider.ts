import {
  buildMediaId,
  buildRecordContentHash,
  computeFreshness,
} from "../../application/lookup/media-lookup-helpers.js";
import { ProviderUnavailableError } from "../../core/shared/errors.js";
import type {
  MediaRecord,
  MovieMediaRecord,
  TvMediaRecord,
} from "../../core/media/types.js";
import type {
  MetadataProviderPort,
  ProviderLookupResult,
  ProviderSearchResult,
} from "../../ports/providers/metadata-provider-port.js";
import type { ClockPort } from "../../ports/shared/clock-port.js";
import type { SearchResultItem } from "../../core/search/types.js";
import {
  tmdbFindResponseSchema,
  tmdbMovieDetailsSchema,
  tmdbMovieSearchItemSchema,
  tmdbMovieSearchResponseSchema,
  tmdbMultiSearchItemSchema,
  tmdbMultiSearchResponseSchema,
  tmdbTvSearchItemSchema,
  tmdbTvSearchResponseSchema,
  tmdbTvDetailsSchema,
  tmdbTvExternalIdsSchema,
} from "./tmdb-schemas.js";

type FetchLike = typeof fetch;

type TmdbConfig = Readonly<{
  baseUrl: string;
  apiKey: string;
  imageBaseUrl: string;
  timeoutMs: number;
  movieTtlSeconds: number;
  tvTtlSeconds: number;
  staleServeWindowSeconds: number;
  canonicalRecordTtlSeconds: number;
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
        payload.details,
        payload.imdbId ??
          (args.identifier.type === "imdbId" ? args.identifier.value : undefined)
      )
    };
  }

  public async search(
    args: Parameters<MetadataProviderPort["search"]>[0]
  ): Promise<ProviderSearchResult> {
    if (args.kind === "movie") {
      const response = await this.fetchTmdbMovieSearch(args.query, args.language, args.page);
      return {
        provider: "tmdb",
        sourceProviders: ["tmdb"],
        items: response.results.map((item) => this.toMovieSearchItem(args.tenantId, item)),
        ...(response.total_results !== undefined ? { total: response.total_results } : {}),
      };
    }

    if (args.kind === "tv") {
      const response = await this.fetchTmdbTvSearch(args.query, args.language, args.page);
      return {
        provider: "tmdb",
        sourceProviders: ["tmdb"],
        items: response.results.map((item) => this.toTvSearchItem(args.tenantId, item)),
        ...(response.total_results !== undefined ? { total: response.total_results } : {}),
      };
    }

    const response = await this.fetchTmdbMultiSearch(args.query, args.language, args.page);
    return {
      provider: "tmdb",
      sourceProviders: ["tmdb"],
      items: response.results.flatMap((item) => this.toMixedSearchItems(args.tenantId, item)),
      ...(response.total_results !== undefined ? { total: response.total_results } : {}),
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
    const [details, externalIds] = await Promise.all([
      this.fetchTmdbTv(`/tv/${encodeURIComponent(id)}?language=${encodeURIComponent(language)}`),
      this.fetchTmdbExternalIds(`/tv/${encodeURIComponent(id)}/external_ids`),
    ]);

    if (details === null) {
      return null;
    }

    return {
      details,
      imdbId:
        externalIds !== null &&
        externalIds.imdb_id !== null &&
        externalIds.imdb_id !== undefined
          ? externalIds.imdb_id
          : undefined,
    };
  }

  private async lookupTvByImdbId(id: string, language: string) {
    const findResult = await this.fetchTmdbFind(
      `/find/${encodeURIComponent(id)}?external_source=imdb_id&language=${encodeURIComponent(language)}`
    );
    const show = findResult.tv_results[0];
    if (show === undefined) {
      return null;
    }
    const details = await this.fetchTmdbTv(`/tv/${show.id}?language=${encodeURIComponent(language)}`);
    if (details === null) {
      return null;
    }
    return {
      details,
      imdbId: id,
    };
  }

  private toMovieRecord(tenantId: string, payload: typeof tmdbMovieDetailsSchema._type): MovieMediaRecord {
    const now = this.clockPort.now().toISOString();
    const mediaId = buildMediaId("tmdb", "movie", {
      type: "tmdbId",
      value: String(payload.id)
    });
    const record = {
      mediaId,
      tenantId: tenantId as MediaRecord["tenantId"],
      kind: "movie" as const,
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
          provider: "tmdb" as const,
          providerRecordId: String(payload.id),
          normalizedAt: now,
          hash: buildRecordContentHash({
            kind: "movie",
            canonicalTitle: payload.title,
            ...(payload.original_title !== undefined
              ? { originalTitle: payload.original_title }
              : {}),
            ...(payload.overview !== undefined ? { description: payload.overview } : {}),
            genres: payload.genres.map((genre) => genre.name),
            ...(payload.vote_average !== undefined ? { rating: payload.vote_average } : {}),
            cast: [],
            images: {
              ...(payload.poster_path
                ? { posterUrl: `${this.tmdbConfig.imageBaseUrl}${payload.poster_path}` }
                : {}),
              ...(payload.backdrop_path
                ? { backdropUrl: `${this.tmdbConfig.imageBaseUrl}${payload.backdrop_path}` }
                : {}),
            },
            ...(payload.release_date !== undefined ? { releaseDate: payload.release_date } : {}),
            ...(
              payload.release_date !== undefined && payload.release_date.length >= 4
                ? { releaseYear: Number(payload.release_date.slice(0, 4)) }
                : {}
            ),
            ...(payload.runtime !== null && payload.runtime !== undefined
              ? { runtimeMinutes: payload.runtime }
              : {}),
          }),
          payload
        }
      ],
      freshness: computeFreshness(
        this.clockPort,
        this.tmdbConfig.movieTtlSeconds,
        this.tmdbConfig.staleServeWindowSeconds,
      ),
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now
    } satisfies Omit<MovieMediaRecord, "contentHash">;

    return {
      ...record,
      contentHash: buildRecordContentHash(record),
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
    const record = {
      mediaId,
      tenantId: tenantId as MediaRecord["tenantId"],
      kind: "tv" as const,
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
          provider: "tmdb" as const,
          providerRecordId: String(payload.id),
          normalizedAt: now,
          hash: buildRecordContentHash({
            kind: "tv",
            canonicalTitle: payload.name,
            ...(payload.original_name !== undefined
              ? { originalTitle: payload.original_name }
              : {}),
            ...(payload.overview !== undefined ? { description: payload.overview } : {}),
            genres: payload.genres.map((genre) => genre.name),
            ...(payload.vote_average !== undefined ? { rating: payload.vote_average } : {}),
            cast: [],
            images: {
              ...(payload.poster_path
                ? { posterUrl: `${this.tmdbConfig.imageBaseUrl}${payload.poster_path}` }
                : {}),
              ...(payload.backdrop_path
                ? { backdropUrl: `${this.tmdbConfig.imageBaseUrl}${payload.backdrop_path}` }
                : {}),
            },
            ...(payload.first_air_date !== undefined
              ? { firstAirDate: payload.first_air_date }
              : {}),
            ...(
              payload.first_air_date !== undefined && payload.first_air_date.length >= 4
                ? { firstAirYear: Number(payload.first_air_date.slice(0, 4)) }
                : {}
            ),
            ...(payload.number_of_seasons !== undefined
              ? { seasonCount: payload.number_of_seasons }
              : {}),
            ...(payload.number_of_episodes !== undefined
              ? { episodeCount: payload.number_of_episodes }
              : {}),
            ...(payload.status !== undefined ? { status: payload.status } : {}),
          }),
          payload
        }
      ],
      freshness: computeFreshness(
        this.clockPort,
        this.tmdbConfig.tvTtlSeconds,
        this.tmdbConfig.staleServeWindowSeconds,
      ),
      schemaVersion: 1,
      createdAt: now,
      updatedAt: now
    } satisfies Omit<TvMediaRecord, "contentHash">;

    return {
      ...record,
      contentHash: buildRecordContentHash(record),
    };
  }

  private toMovieSearchItem(
    tenantId: string,
    payload: typeof tmdbMovieSearchItemSchema._type,
  ): SearchResultItem {
    const mediaId = buildMediaId("tmdb", "movie", {
      type: "tmdbId",
      value: String(payload.id)
    });

    return {
      mediaId,
      tenantId: tenantId as SearchResultItem["tenantId"],
      kind: "movie",
      title: payload.title,
      ...(payload.original_title !== undefined ? { originalTitle: payload.original_title } : {}),
      ...(payload.overview !== undefined ? { description: payload.overview } : {}),
      ...(payload.release_date !== undefined ? { releaseDate: payload.release_date } : {}),
      ...(
        payload.release_date !== undefined && payload.release_date.length >= 4
          ? { releaseYear: Number(payload.release_date.slice(0, 4)) }
          : {}
      ),
      ...(payload.vote_average !== undefined ? { rating: payload.vote_average } : {}),
      genres: [],
      images: {
        ...(payload.poster_path ? { posterUrl: `${this.tmdbConfig.imageBaseUrl}${payload.poster_path}` } : {}),
        ...(payload.backdrop_path ? { backdropUrl: `${this.tmdbConfig.imageBaseUrl}${payload.backdrop_path}` } : {})
      },
      identifiers: {
        mediaId,
        tmdbId: String(payload.id),
      }
    };
  }

  private toTvSearchItem(
    tenantId: string,
    payload: typeof tmdbTvSearchItemSchema._type,
  ): SearchResultItem {
    const mediaId = buildMediaId("tmdb", "tv", {
      type: "tmdbId",
      value: String(payload.id)
    });

    return {
      mediaId,
      tenantId: tenantId as SearchResultItem["tenantId"],
      kind: "tv",
      title: payload.name,
      ...(payload.original_name !== undefined ? { originalTitle: payload.original_name } : {}),
      ...(payload.overview !== undefined ? { description: payload.overview } : {}),
      ...(payload.first_air_date !== undefined ? { firstAirDate: payload.first_air_date } : {}),
      ...(
        payload.first_air_date !== undefined && payload.first_air_date.length >= 4
          ? { firstAirYear: Number(payload.first_air_date.slice(0, 4)) }
          : {}
      ),
      ...(payload.vote_average !== undefined ? { rating: payload.vote_average } : {}),
      genres: [],
      images: {
        ...(payload.poster_path ? { posterUrl: `${this.tmdbConfig.imageBaseUrl}${payload.poster_path}` } : {}),
        ...(payload.backdrop_path ? { backdropUrl: `${this.tmdbConfig.imageBaseUrl}${payload.backdrop_path}` } : {})
      },
      identifiers: {
        mediaId,
        tmdbId: String(payload.id),
      }
    };
  }

  private toMixedSearchItems(
    tenantId: string,
    payload: typeof tmdbMultiSearchItemSchema._type,
  ): SearchResultItem[] {
    if (payload.media_type === "movie") {
      const parsed = tmdbMovieSearchItemSchema.safeParse(payload);
      if (parsed.success) {
        return [this.toMovieSearchItem(tenantId, parsed.data)];
      }
    }

    if (payload.media_type === "tv") {
      const parsed = tmdbTvSearchItemSchema.safeParse(payload);
      if (parsed.success) {
        return [this.toTvSearchItem(tenantId, parsed.data)];
      }
    }

    return [];
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

  private async fetchTmdbMovieSearch(query: string, language: string, page: number) {
    return this.fetchSearch(
      `/search/movie?query=${encodeURIComponent(query)}&language=${encodeURIComponent(language)}&page=${page}`,
      tmdbMovieSearchResponseSchema
    );
  }

  private async fetchTmdbTvSearch(query: string, language: string, page: number) {
    return this.fetchSearch(
      `/search/tv?query=${encodeURIComponent(query)}&language=${encodeURIComponent(language)}&page=${page}`,
      tmdbTvSearchResponseSchema
    );
  }

  private async fetchTmdbMultiSearch(query: string, language: string, page: number) {
    return this.fetchSearch(
      `/search/multi?query=${encodeURIComponent(query)}&language=${encodeURIComponent(language)}&page=${page}`,
      tmdbMultiSearchResponseSchema
    );
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

  private async fetchTmdbExternalIds(path: string) {
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
      return tmdbTvExternalIdsSchema.parse(await response.json());
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

  private async fetchSearch<T>(
    path: string,
    schema: { parse(input: unknown): T }
  ): Promise<T> {
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
      return schema.parse(await response.json());
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

import { buildContentHash, buildMediaId, computeFreshness } from "../../application/lookup/movie-lookup-helpers.js";
import { ProviderUnavailableError } from "../../core/shared/errors.js";
import type { MediaRecord } from "../../core/media/types.js";
import type { MetadataProviderPort, ProviderLookupResult } from "../../ports/providers/metadata-provider-port.js";
import type { ClockPort } from "../../ports/shared/clock-port.js";
import { tmdbFindResponseSchema, tmdbMovieDetailsSchema } from "./tmdb-schemas.js";

type FetchLike = typeof fetch;

type TmdbConfig = Readonly<{
  baseUrl: string;
  apiKey: string;
  imageBaseUrl: string;
  timeoutMs: number;
  movieTtlSeconds: number;
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
    if (args.kind !== "movie") {
      return null;
    }

    if (args.identifier.type === "mediaId") {
      return null;
    }

    const payload =
      args.identifier.type === "tmdbId"
        ? await this.lookupMovieByTmdbId(args.identifier.value, args.language)
        : await this.lookupMovieByImdbId(args.identifier.value, args.language);

    if (payload === null) {
      return null;
    }

    const now = this.clockPort.now().toISOString();
    const mediaId = buildMediaId("tmdb", {
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

    const record: MediaRecord = {
      mediaId,
      tenantId: args.tenantId as MediaRecord["tenantId"],
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

    return {
      provider: "tmdb",
      record
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

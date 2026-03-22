import {
  buildMediaId,
  buildRecordContentHash,
  computeFreshness,
} from "../../application/lookup/media-lookup-helpers.js";
import type { MediaRecord } from "../../core/media/types.js";
import type { ImdbEnrichmentProviderPort, ImdbLookupRecord } from "../../ports/providers/imdb-enrichment-provider-port.js";
import type { ClockPort } from "../../ports/shared/clock-port.js";
import type { ImdbGraphqlClientPort } from "./imdb-graphql-client.js";
import { imdbTitleLookupResponseSchema } from "./imdb-schemas.js";

type ImdbFreshnessConfig = Readonly<{
  movieTtlSeconds: number;
  tvTtlSeconds: number;
  staleServeWindowSeconds: number;
}>;

const lookupTitleQuery = `
  query LookupTitle($id: ID!) {
    title(id: $id) {
      id
      titleText {
        text
      }
      originalTitleText {
        text
      }
      titleType {
        text
        canHaveEpisodes
      }
      ratingsSummary {
        aggregateRating
        voteCount
      }
      releaseDate {
        year
        month
        day
      }
      runtime {
        seconds
      }
      titleGenres {
        genres {
          genre {
            text
          }
        }
      }
      plots(first: 1) {
        edges {
          node {
            plotText {
              plainText
            }
          }
        }
      }
      credits(first: 5) {
        edges {
          node {
            name {
              nameText {
                text
              }
            }
          }
        }
      }
    }
  }
`;

export class OfficialImdbMetadataProvider implements ImdbEnrichmentProviderPort {
  public constructor(
    private readonly graphQlClient: ImdbGraphqlClientPort,
    private readonly clockPort: ClockPort,
    private readonly freshnessConfig: ImdbFreshnessConfig,
  ) {}

  public async lookupByImdbId(
    args: Parameters<ImdbEnrichmentProviderPort["lookupByImdbId"]>[0],
  ): Promise<ImdbLookupRecord | null> {
    const data = await this.graphQlClient.execute<{ title: unknown | null }>({
      query: lookupTitleQuery,
      variables: { id: args.imdbId },
    });
    const parsed = imdbTitleLookupResponseSchema.parse(data);
    if (parsed.title === null || parsed.title === undefined) {
      return null;
    }

    const normalizedKind = inferMediaKind(parsed.title.titleType?.canHaveEpisodes, parsed.title.titleType?.text);
    if (normalizedKind !== args.kind) {
      return null;
    }

    const normalizedAt = this.clockPort.now().toISOString();
    const description =
      parsed.title.plots?.edges[0]?.node.plotText?.plainText ?? undefined;
    const cast = parsed.title.credits?.edges.flatMap((edge) => {
      const name = edge.node.name?.nameText.text;
      return name !== undefined ? [{ name }] : [];
    }) ?? [];
    const genres =
      parsed.title.titleGenres?.genres.map((entry) => entry.genre.text) ?? [];
    const releaseDate = toIsoDate(parsed.title.releaseDate);
    const releaseYear = parsed.title.releaseDate?.year;
    const runtimeMinutes =
      parsed.title.runtime?.seconds !== undefined && parsed.title.runtime.seconds !== null
        ? Math.round(parsed.title.runtime.seconds / 60)
        : undefined;

    const normalizedPayload = {
      id: parsed.title.id,
      titleText: parsed.title.titleText.text,
      ...(parsed.title.originalTitleText?.text !== undefined
        ? { originalTitleText: parsed.title.originalTitleText.text }
        : {}),
      ...(parsed.title.titleType?.text !== undefined
        ? { titleType: parsed.title.titleType.text }
        : {}),
      ...(description !== undefined ? { description } : {}),
      ...(parsed.title.ratingsSummary?.aggregateRating !== undefined &&
      parsed.title.ratingsSummary.aggregateRating !== null
        ? { rating: parsed.title.ratingsSummary.aggregateRating }
        : {}),
      ...(releaseDate !== undefined ? { releaseDate } : {}),
      ...(releaseYear !== undefined ? { releaseYear } : {}),
      ...(runtimeMinutes !== undefined ? { runtimeMinutes } : {}),
      genres,
      cast,
    };

    return {
      provider: "imdb",
      kind: normalizedKind,
      imdbId: args.imdbId,
      title: parsed.title.titleText.text,
      ...(parsed.title.originalTitleText?.text !== undefined
        ? { originalTitle: parsed.title.originalTitleText.text }
        : {}),
      ...(description !== undefined ? { description } : {}),
      genres,
      ...(normalizedKind === "movie"
        ? {
            ...(releaseDate !== undefined ? { releaseDate } : {}),
            ...(releaseYear !== undefined ? { releaseYear } : {}),
            ...(runtimeMinutes !== undefined ? { runtimeMinutes } : {}),
          }
        : {
            ...(releaseDate !== undefined ? { firstAirDate: releaseDate } : {}),
            ...(releaseYear !== undefined ? { firstAirYear: releaseYear } : {}),
          }),
      ...(parsed.title.ratingsSummary?.aggregateRating !== undefined &&
      parsed.title.ratingsSummary.aggregateRating !== null
        ? { rating: parsed.title.ratingsSummary.aggregateRating }
        : {}),
      cast,
      images: {},
      providerRef: {
        provider: "imdb",
        providerRecordId: args.imdbId,
        normalizedAt,
        hash: buildRecordContentHash(
          normalizedKind === "movie"
            ? {
                kind: normalizedKind,
                canonicalTitle: parsed.title.titleText.text,
                ...(parsed.title.originalTitleText?.text !== undefined
                  ? { originalTitle: parsed.title.originalTitleText.text }
                  : {}),
                ...(description !== undefined ? { description } : {}),
                genres,
                ...(parsed.title.ratingsSummary?.aggregateRating !== undefined &&
                parsed.title.ratingsSummary.aggregateRating !== null
                  ? { rating: parsed.title.ratingsSummary.aggregateRating }
                  : {}),
                cast,
                images: {},
                ...(releaseDate !== undefined ? { releaseDate } : {}),
                ...(releaseYear !== undefined ? { releaseYear } : {}),
                ...(runtimeMinutes !== undefined ? { runtimeMinutes } : {}),
              }
            : {
                kind: normalizedKind,
                canonicalTitle: parsed.title.titleText.text,
                ...(parsed.title.originalTitleText?.text !== undefined
                  ? { originalTitle: parsed.title.originalTitleText.text }
                  : {}),
                ...(description !== undefined ? { description } : {}),
                genres,
                ...(parsed.title.ratingsSummary?.aggregateRating !== undefined &&
                parsed.title.ratingsSummary.aggregateRating !== null
                  ? { rating: parsed.title.ratingsSummary.aggregateRating }
                  : {}),
                cast,
                images: {},
                ...(releaseDate !== undefined ? { firstAirDate: releaseDate } : {}),
                ...(releaseYear !== undefined ? { firstAirYear: releaseYear } : {}),
              },
        ),
        payload: normalizedPayload,
      },
    };
  }

  public buildFallbackRecord(
    tenantId: string,
    lookup: ImdbLookupRecord,
  ): MediaRecord {
    const mediaId = buildMediaId("imdb", lookup.kind, {
      type: "imdbId",
      value: lookup.imdbId,
    });
    const createdAt = lookup.providerRef.normalizedAt;

    const baseRecord = {
      mediaId,
      tenantId: tenantId as MediaRecord["tenantId"],
      kind: lookup.kind,
      canonicalTitle: lookup.title,
      ...(lookup.originalTitle !== undefined ? { originalTitle: lookup.originalTitle } : {}),
      ...(lookup.description !== undefined ? { description: lookup.description } : {}),
      genres: lookup.genres,
      ...(lookup.rating !== undefined ? { rating: lookup.rating } : {}),
      cast: lookup.cast,
      images: lookup.images,
      identifiers: {
        mediaId,
        imdbId: lookup.imdbId,
      },
      providerRefs: [lookup.providerRef],
      freshness: computeFreshness(
        this.clockPort,
        lookup.kind === "movie"
          ? this.freshnessConfig.movieTtlSeconds
          : this.freshnessConfig.tvTtlSeconds,
        this.freshnessConfig.staleServeWindowSeconds,
      ),
      schemaVersion: 1 as const,
      createdAt,
      updatedAt: createdAt,
    };

    if (lookup.kind === "movie") {
      const record = {
        ...baseRecord,
        ...(lookup.releaseDate !== undefined ? { releaseDate: lookup.releaseDate } : {}),
        ...(lookup.releaseYear !== undefined ? { releaseYear: lookup.releaseYear } : {}),
        ...(lookup.runtimeMinutes !== undefined
          ? { runtimeMinutes: lookup.runtimeMinutes }
          : {}),
      };
      return {
        ...record,
        contentHash: buildRecordContentHash(record),
      } satisfies MediaRecord;
    }

    const record = {
      ...baseRecord,
      ...(lookup.firstAirDate !== undefined ? { firstAirDate: lookup.firstAirDate } : {}),
      ...(lookup.firstAirYear !== undefined ? { firstAirYear: lookup.firstAirYear } : {}),
      ...(lookup.seasonCount !== undefined ? { seasonCount: lookup.seasonCount } : {}),
      ...(lookup.episodeCount !== undefined ? { episodeCount: lookup.episodeCount } : {}),
      ...(lookup.status !== undefined ? { status: lookup.status } : {}),
    };
    return {
      ...record,
      contentHash: buildRecordContentHash(record),
    } satisfies MediaRecord;
  }
}

function inferMediaKind(
  canHaveEpisodes: boolean | undefined,
  titleTypeText: string | undefined,
): "movie" | "tv" {
  if (canHaveEpisodes === true) {
    return "tv";
  }
  if (titleTypeText !== undefined && titleTypeText.toLowerCase().includes("tv")) {
    return "tv";
  }
  return "movie";
}

function toIsoDate(
  releaseDate:
    | {
        year: number;
        month?: number | null | undefined;
        day?: number | null | undefined;
      }
    | null
    | undefined,
): string | undefined {
  if (releaseDate === undefined || releaseDate === null) {
    return undefined;
  }
  if (releaseDate.month === undefined || releaseDate.month === null) {
    return undefined;
  }
  if (releaseDate.day === undefined || releaseDate.day === null) {
    return undefined;
  }
  return `${String(releaseDate.year).padStart(4, "0")}-${String(releaseDate.month).padStart(2, "0")}-${String(releaseDate.day).padStart(2, "0")}`;
}

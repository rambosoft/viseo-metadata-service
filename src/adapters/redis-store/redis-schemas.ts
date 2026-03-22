import { z } from "zod";

const nonEmptyString = z.string().min(1);

const cachedBaseMediaRecordSchema = z.object({
  mediaId: nonEmptyString,
  tenantId: nonEmptyString,
  canonicalTitle: nonEmptyString,
  originalTitle: nonEmptyString.optional(),
  description: nonEmptyString.optional(),
  genres: z.array(nonEmptyString),
  rating: z.number().optional(),
  cast: z.array(
    z.object({
      name: nonEmptyString,
      role: nonEmptyString.optional()
    })
  ),
  images: z.object({
    posterUrl: nonEmptyString.optional(),
    backdropUrl: nonEmptyString.optional()
  }),
  identifiers: z.object({
    mediaId: nonEmptyString,
    tmdbId: nonEmptyString.optional(),
    imdbId: nonEmptyString.optional()
  }),
  providerRefs: z.array(
    z.object({
      provider: z.union([z.literal("tmdb"), z.literal("imdb")]),
      providerRecordId: nonEmptyString,
      normalizedAt: nonEmptyString,
      hash: nonEmptyString,
      payload: z.record(z.unknown())
    })
  ),
  contentHash: nonEmptyString,
  freshness: z.object({
    lastFetchedAt: nonEmptyString,
    cacheTtlSeconds: z.number().int(),
    staleAfter: nonEmptyString,
    refreshAfter: nonEmptyString,
    serveStaleUntil: nonEmptyString
  }),
  schemaVersion: z.literal(1),
  createdAt: nonEmptyString,
  updatedAt: nonEmptyString
});

const cachedMovieMediaRecordSchema = cachedBaseMediaRecordSchema.extend({
  kind: z.literal("movie"),
  releaseDate: nonEmptyString.optional(),
  releaseYear: z.number().int().optional(),
  runtimeMinutes: z.number().int().optional()
});

const cachedTvMediaRecordSchema = cachedBaseMediaRecordSchema.extend({
  kind: z.literal("tv"),
  firstAirDate: nonEmptyString.optional(),
  firstAirYear: z.number().int().optional(),
  seasonCount: z.number().int().optional(),
  episodeCount: z.number().int().optional(),
  status: nonEmptyString.optional()
});

export const cachedMediaRecordSchema = z.discriminatedUnion("kind", [
  cachedMovieMediaRecordSchema,
  cachedTvMediaRecordSchema
]);

const cachedSearchItemSchema = z.object({
  mediaId: nonEmptyString,
  tenantId: nonEmptyString,
  kind: z.union([z.literal("movie"), z.literal("tv")]),
  title: nonEmptyString,
  originalTitle: nonEmptyString.optional(),
  description: nonEmptyString.optional(),
  releaseDate: nonEmptyString.optional(),
  releaseYear: z.number().int().optional(),
  firstAirDate: nonEmptyString.optional(),
  firstAirYear: z.number().int().optional(),
  rating: z.number().optional(),
  genres: z.array(nonEmptyString),
  images: z.object({
    posterUrl: nonEmptyString.optional(),
    backdropUrl: nonEmptyString.optional()
  }),
  identifiers: z.object({
    mediaId: nonEmptyString,
    tmdbId: nonEmptyString.optional(),
    imdbId: nonEmptyString.optional()
  })
});

export const cachedSearchSnapshotSchema = z.object({
  tenantId: nonEmptyString,
  query: nonEmptyString,
  kind: z.union([z.literal("movie"), z.literal("tv")]).optional(),
  lang: nonEmptyString,
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative().optional(),
  items: z.array(cachedSearchItemSchema),
  sourceProviders: z.array(nonEmptyString),
  generatedAt: nonEmptyString,
  expiresAt: nonEmptyString
});

export const cachedSearchIndexDocumentSchema = z.object({
  mediaId: nonEmptyString,
  tenantId: nonEmptyString,
  kind: z.union([z.literal("movie"), z.literal("tv")]),
  item: cachedSearchItemSchema,
  normalizedTitle: nonEmptyString,
  searchableTokens: z.array(nonEmptyString)
});

export const cachedAuthContextSchema = z.object({
  principalId: nonEmptyString,
  tenantId: nonEmptyString,
  scopes: z.array(nonEmptyString).min(1),
  expiresAt: nonEmptyString
});

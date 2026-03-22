import { z } from "zod";

const cachedBaseMediaRecordSchema = z.object({
  mediaId: z.string(),
  tenantId: z.string(),
  canonicalTitle: z.string(),
  originalTitle: z.string().optional(),
  description: z.string().optional(),
  genres: z.array(z.string()),
  rating: z.number().optional(),
  cast: z.array(
    z.object({
      name: z.string(),
      role: z.string().optional()
    })
  ),
  images: z.object({
    posterUrl: z.string().optional(),
    backdropUrl: z.string().optional()
  }),
  identifiers: z.object({
    mediaId: z.string(),
    tmdbId: z.string().optional(),
    imdbId: z.string().optional()
  }),
  providerRefs: z.array(
    z.object({
      provider: z.union([z.literal("tmdb"), z.literal("imdb")]),
      providerRecordId: z.string(),
      normalizedAt: z.string(),
      hash: z.string(),
      payload: z.record(z.unknown())
    })
  ),
  contentHash: z.string(),
  freshness: z.object({
    lastFetchedAt: z.string(),
    cacheTtlSeconds: z.number().int(),
    staleAfter: z.string(),
    refreshAfter: z.string(),
    serveStaleUntil: z.string()
  }),
  schemaVersion: z.literal(1),
  createdAt: z.string(),
  updatedAt: z.string()
});

const cachedMovieMediaRecordSchema = cachedBaseMediaRecordSchema.extend({
  kind: z.literal("movie"),
  releaseDate: z.string().optional(),
  releaseYear: z.number().int().optional(),
  runtimeMinutes: z.number().int().optional()
});

const cachedTvMediaRecordSchema = cachedBaseMediaRecordSchema.extend({
  kind: z.literal("tv"),
  firstAirDate: z.string().optional(),
  firstAirYear: z.number().int().optional(),
  seasonCount: z.number().int().optional(),
  episodeCount: z.number().int().optional(),
  status: z.string().optional()
});

export const cachedMediaRecordSchema = z.discriminatedUnion("kind", [
  cachedMovieMediaRecordSchema,
  cachedTvMediaRecordSchema
]);

const cachedSearchItemSchema = z.object({
  mediaId: z.string(),
  tenantId: z.string(),
  kind: z.union([z.literal("movie"), z.literal("tv")]),
  title: z.string(),
  originalTitle: z.string().optional(),
  description: z.string().optional(),
  releaseDate: z.string().optional(),
  releaseYear: z.number().int().optional(),
  firstAirDate: z.string().optional(),
  firstAirYear: z.number().int().optional(),
  rating: z.number().optional(),
  genres: z.array(z.string()),
  images: z.object({
    posterUrl: z.string().optional(),
    backdropUrl: z.string().optional()
  }),
  identifiers: z.object({
    mediaId: z.string(),
    tmdbId: z.string().optional(),
    imdbId: z.string().optional()
  })
});

export const cachedSearchSnapshotSchema = z.object({
  tenantId: z.string(),
  query: z.string(),
  kind: z.union([z.literal("movie"), z.literal("tv")]).optional(),
  lang: z.string(),
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative().optional(),
  items: z.array(cachedSearchItemSchema),
  sourceProviders: z.array(z.string()),
  generatedAt: z.string(),
  expiresAt: z.string()
});

export const cachedSearchIndexDocumentSchema = z.object({
  mediaId: z.string(),
  tenantId: z.string(),
  kind: z.union([z.literal("movie"), z.literal("tv")]),
  item: cachedSearchItemSchema,
  normalizedTitle: z.string(),
  searchableTokens: z.array(z.string())
});

export const cachedAuthContextSchema = z.object({
  principalId: z.string(),
  tenantId: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.string()
});

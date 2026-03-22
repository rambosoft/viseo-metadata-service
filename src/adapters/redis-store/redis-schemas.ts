import { z } from "zod";

export const cachedMediaRecordSchema = z.object({
  mediaId: z.string(),
  tenantId: z.string(),
  kind: z.literal("movie"),
  canonicalTitle: z.string(),
  originalTitle: z.string().optional(),
  description: z.string().optional(),
  genres: z.array(z.string()),
  releaseDate: z.string().optional(),
  releaseYear: z.number().int().optional(),
  runtimeMinutes: z.number().int().optional(),
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
    refreshAfter: z.string()
  }),
  schemaVersion: z.literal(1),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const cachedAuthContextSchema = z.object({
  principalId: z.string(),
  tenantId: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.string()
});

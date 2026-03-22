import { z } from "zod";

const nonEmptyString = z.string().min(1);

const baseJobSchema = z.object({
  tenantId: nonEmptyString,
  requestedAt: nonEmptyString,
  source: z.union([z.literal("stale_lookup"), z.literal("maintenance"), z.literal("manual")]),
});

const identifiersSchema = z.object({
  mediaId: nonEmptyString,
  tmdbId: nonEmptyString.optional(),
  imdbId: nonEmptyString.optional(),
});

export const refreshMediaJobSchema = baseJobSchema.extend({
  jobType: z.literal("refresh_media_record"),
  kind: z.union([z.literal("movie"), z.literal("tv")]),
  mediaId: nonEmptyString,
  identifiers: identifiersSchema,
  language: nonEmptyString,
});

export const cleanupExpiredCacheJobSchema = baseJobSchema.extend({
  jobType: z.literal("cleanup_expired_cache"),
  kind: z.union([z.literal("movie"), z.literal("tv")]),
  mediaId: nonEmptyString,
  identifiers: identifiersSchema,
});

export const warmHotRecordJobSchema = baseJobSchema.extend({
  jobType: z.literal("warm_hot_record"),
  kind: z.union([z.literal("movie"), z.literal("tv")]),
  mediaId: nonEmptyString,
  identifiers: identifiersSchema,
  language: nonEmptyString,
});

export const metadataQueueJobSchema = z.discriminatedUnion("jobType", [
  refreshMediaJobSchema,
  cleanupExpiredCacheJobSchema,
  warmHotRecordJobSchema,
]);

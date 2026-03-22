import { z } from "zod";

export const refreshMediaJobSchema = z.object({
  tenantId: z.string(),
  kind: z.union([z.literal("movie"), z.literal("tv")]),
  mediaId: z.string(),
  identifiers: z.object({
    mediaId: z.string(),
    tmdbId: z.string().optional(),
    imdbId: z.string().optional(),
  }),
  language: z.string(),
  source: z.literal("stale_lookup"),
});

import { z } from "zod";

export const mediaLookupQuerySchema = z
  .object({
    mediaId: z.string().min(1).optional(),
    tmdbId: z.string().min(1).optional(),
    imdbId: z.string().min(1).optional(),
    lang: z.string().trim().min(2).max(10).default("en"),
  })
  .superRefine((value, ctx) => {
    const identifiers = [value.mediaId, value.tmdbId, value.imdbId].filter(Boolean);
    if (identifiers.length !== 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Exactly one identifier must be provided",
        path: ["mediaId"],
      });
    }
  });

export type MediaLookupQuery = z.infer<typeof mediaLookupQuerySchema>;
export const movieLookupQuerySchema = mediaLookupQuerySchema;
export const tvLookupQuerySchema = mediaLookupQuerySchema;

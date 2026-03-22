import { z } from "zod";

const optionalTextNodeSchema = z
  .object({
    text: z.string().min(1),
  })
  .optional()
  .nullable();

const optionalPlainTextNodeSchema = z
  .object({
    plainText: z.string().min(1),
  })
  .optional()
  .nullable();

export const imdbTitleLookupResponseSchema = z.object({
  title: z
    .object({
      id: z.string().min(1),
      titleText: z.object({
        text: z.string().min(1),
      }),
      originalTitleText: optionalTextNodeSchema,
      titleType: z
        .object({
          text: z.string().min(1).optional(),
          canHaveEpisodes: z.boolean().optional(),
        })
        .optional()
        .nullable(),
      ratingsSummary: z
        .object({
          aggregateRating: z.number().optional().nullable(),
          voteCount: z.number().int().optional().nullable(),
        })
        .optional()
        .nullable(),
      releaseDate: z
        .object({
          year: z.number().int(),
          month: z.number().int().optional().nullable(),
          day: z.number().int().optional().nullable(),
        })
        .optional()
        .nullable(),
      runtime: z
        .object({
          seconds: z.number().int().optional().nullable(),
        })
        .optional()
        .nullable(),
      titleGenres: z
        .object({
          genres: z.array(
            z.object({
              genre: z.object({
                text: z.string().min(1),
              }),
            }),
          ),
        })
        .optional()
        .nullable(),
      plots: z
        .object({
          edges: z.array(
            z.object({
              node: z.object({
                plotText: optionalPlainTextNodeSchema,
              }),
            }),
          ),
        })
        .optional()
        .nullable(),
      credits: z
        .object({
          edges: z.array(
            z.object({
              node: z.object({
                name: z
                  .object({
                    nameText: z.object({
                      text: z.string().min(1),
                    }),
                  })
                  .optional()
                  .nullable(),
              }),
            }),
          ),
        })
        .optional()
        .nullable(),
    })
    .optional()
    .nullable(),
});

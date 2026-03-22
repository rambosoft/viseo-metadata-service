import { z } from "zod";

export const mediaSearchQuerySchema = z.object({
  q: z.string().trim().min(1),
  kind: z.enum(["movie", "tv"]).optional(),
  lang: z.string().trim().min(2).max(10).default("en"),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(50).default(20),
});

export type MediaSearchQuery = z.infer<typeof mediaSearchQuerySchema>;

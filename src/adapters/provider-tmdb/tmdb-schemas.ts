import { z } from "zod";

export const tmdbMovieDetailsSchema = z.object({
  id: z.number(),
  imdb_id: z.string().nullable().optional(),
  title: z.string(),
  original_title: z.string().optional(),
  overview: z.string().optional(),
  release_date: z.string().optional(),
  runtime: z.number().nullable().optional(),
  vote_average: z.number().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).default([]),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional()
});

export const tmdbFindResponseSchema = z.object({
  movie_results: z.array(tmdbMovieDetailsSchema).default([])
});

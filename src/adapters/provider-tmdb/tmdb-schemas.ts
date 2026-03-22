import { z } from "zod";

const tmdbFindMatchSchema = z.object({
  id: z.number()
});

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

export const tmdbTvDetailsSchema = z.object({
  id: z.number(),
  name: z.string(),
  original_name: z.string().optional(),
  overview: z.string().optional(),
  first_air_date: z.string().optional(),
  number_of_seasons: z.number().int().optional(),
  number_of_episodes: z.number().int().optional(),
  status: z.string().optional(),
  vote_average: z.number().optional(),
  genres: z.array(z.object({ id: z.number(), name: z.string() })).default([]),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional()
});

export const tmdbFindResponseSchema = z.object({
  movie_results: z.array(tmdbFindMatchSchema).default([]),
  tv_results: z.array(tmdbFindMatchSchema).default([])
});

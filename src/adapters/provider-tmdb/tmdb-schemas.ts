import { z } from "zod";

const tmdbFindMatchSchema = z.object({
  id: z.number()
});

const tmdbGenreSchema = z.object({ id: z.number(), name: z.string() });

export const tmdbMovieDetailsSchema = z.object({
  id: z.number(),
  imdb_id: z.string().nullable().optional(),
  title: z.string(),
  original_title: z.string().optional(),
  overview: z.string().optional(),
  release_date: z.string().optional(),
  runtime: z.number().nullable().optional(),
  vote_average: z.number().optional(),
  genres: z.array(tmdbGenreSchema).default([]),
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
  genres: z.array(tmdbGenreSchema).default([]),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional()
});

export const tmdbTvExternalIdsSchema = z.object({
  imdb_id: z.string().nullable().optional(),
});

export const tmdbFindResponseSchema = z.object({
  movie_results: z.array(tmdbFindMatchSchema).default([]),
  tv_results: z.array(tmdbFindMatchSchema).default([])
});

export const tmdbMovieSearchItemSchema = z.object({
  id: z.number(),
  media_type: z.literal("movie").optional(),
  title: z.string(),
  original_title: z.string().optional(),
  overview: z.string().optional(),
  release_date: z.string().optional(),
  vote_average: z.number().optional(),
  genre_ids: z.array(z.number()).default([]),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional()
});

export const tmdbTvSearchItemSchema = z.object({
  id: z.number(),
  media_type: z.literal("tv").optional(),
  name: z.string(),
  original_name: z.string().optional(),
  overview: z.string().optional(),
  first_air_date: z.string().optional(),
  vote_average: z.number().optional(),
  genre_ids: z.array(z.number()).default([]),
  poster_path: z.string().nullable().optional(),
  backdrop_path: z.string().nullable().optional()
});

export const tmdbMultiSearchItemSchema = z.union([
  tmdbMovieSearchItemSchema.extend({ media_type: z.literal("movie") }),
  tmdbTvSearchItemSchema.extend({ media_type: z.literal("tv") }),
  z.object({
    media_type: z.string()
  }).passthrough()
]);

export const tmdbMovieSearchResponseSchema = z.object({
  page: z.number().int().positive(),
  total_results: z.number().int().nonnegative().optional(),
  results: z.array(tmdbMovieSearchItemSchema).default([])
});

export const tmdbTvSearchResponseSchema = z.object({
  page: z.number().int().positive(),
  total_results: z.number().int().nonnegative().optional(),
  results: z.array(tmdbTvSearchItemSchema).default([])
});

export const tmdbMultiSearchResponseSchema = z.object({
  page: z.number().int().positive(),
  total_results: z.number().int().nonnegative().optional(),
  results: z.array(tmdbMultiSearchItemSchema).default([])
});

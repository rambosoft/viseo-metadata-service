import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  REDIS_URL: z.string().url(),
  REDIS_KEY_PREFIX: z.string().min(1).default("md"),
  AUTH_SERVICE_URL: z.string().url(),
  AUTH_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  AUTH_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  TMDB_BASE_URL: z.string().url().default("https://api.themoviedb.org/3"),
  TMDB_IMAGE_BASE_URL: z.string().url().default("https://image.tmdb.org/t/p/w500"),
  TMDB_API_KEY: z.string().min(1),
  TMDB_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  MOVIE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600)
});

export type AppConfig = Readonly<{
  server: {
    nodeEnv: "development" | "test" | "production";
    port: number;
    logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  };
  redis: {
    url: string;
    keyPrefix: string;
  };
  auth: {
    serviceUrl: string;
    timeoutMs: number;
    cacheTtlSeconds: number;
  };
  tmdb: {
    baseUrl: string;
    imageBaseUrl: string;
    apiKey: string;
    timeoutMs: number;
    movieTtlSeconds: number;
  };
}>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  return {
    server: {
      nodeEnv: parsed.NODE_ENV,
      port: parsed.PORT,
      logLevel: parsed.LOG_LEVEL
    },
    redis: {
      url: parsed.REDIS_URL,
      keyPrefix: parsed.REDIS_KEY_PREFIX
    },
    auth: {
      serviceUrl: parsed.AUTH_SERVICE_URL,
      timeoutMs: parsed.AUTH_TIMEOUT_MS,
      cacheTtlSeconds: parsed.AUTH_CACHE_TTL_SECONDS
    },
    tmdb: {
      baseUrl: parsed.TMDB_BASE_URL,
      imageBaseUrl: parsed.TMDB_IMAGE_BASE_URL,
      apiKey: parsed.TMDB_API_KEY,
      timeoutMs: parsed.TMDB_TIMEOUT_MS,
      movieTtlSeconds: parsed.MOVIE_CACHE_TTL_SECONDS
    }
  };
}

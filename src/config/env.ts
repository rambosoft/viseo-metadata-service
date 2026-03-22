import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  REQUEST_BODY_LIMIT_BYTES: z.coerce.number().int().positive().default(16384),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),
  REDIS_URL: z.string().url(),
  REDIS_KEY_PREFIX: z.string().min(1).default("md"),
  RATE_LIMIT_WINDOW_SECONDS: z.coerce.number().int().positive().default(60),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  AUTH_SERVICE_URL: z.string().url(),
  AUTH_TIMEOUT_MS: z.coerce.number().int().positive().default(3000),
  AUTH_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  TMDB_BASE_URL: z.string().url().default("https://api.themoviedb.org/3"),
  TMDB_IMAGE_BASE_URL: z.string().url().default("https://image.tmdb.org/t/p/w500"),
  TMDB_API_KEY: z.string().min(1),
  TMDB_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  IMDB_API_URL: z.string().url().optional(),
  IMDB_API_KEY: z.string().min(1).optional(),
  IMDB_TIMEOUT_MS: z.coerce.number().int().positive().optional(),
  IMDB_AWS_REGION: z.string().min(1).optional(),
  IMDB_DATA_SET_ID: z.string().min(1).optional(),
  IMDB_REVISION_ID: z.string().min(1).optional(),
  IMDB_ASSET_ID: z.string().min(1).optional(),
  MOVIE_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  TV_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(3600),
  MEDIA_STALE_SERVE_WINDOW_SECONDS: z.coerce.number().int().positive().default(86400),
  CANONICAL_RECORD_TTL_SECONDS: z.coerce.number().int().positive().default(604800),
  LOOKUP_SINGLEFLIGHT_TTL_SECONDS: z.coerce.number().int().positive().default(5),
  LOOKUP_SINGLEFLIGHT_WAIT_MS: z.coerce.number().int().positive().default(500),
  SEARCH_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  SEARCH_INDEX_TTL_SECONDS: z.coerce.number().int().positive().default(21600),
  REFRESH_QUEUE_NAME: z.string().min(1).default("metadata-refresh"),
  REFRESH_JOB_ATTEMPTS: z.coerce.number().int().positive().default(3),
  REFRESH_JOB_BACKOFF_MS: z.coerce.number().int().nonnegative().default(1000),
  REFRESH_WORKER_CONCURRENCY: z.coerce.number().int().positive().default(4),
  REFRESH_DEDUP_TTL_SECONDS: z.coerce.number().int().positive().default(60),
  WORKER_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
});

export type AppConfig = Readonly<{
  server: {
    nodeEnv: "development" | "test" | "production";
    port: number;
    requestBodyLimitBytes: number;
    logLevel: "fatal" | "error" | "warn" | "info" | "debug" | "trace";
  };
  redis: {
    url: string;
    keyPrefix: string;
  };
  rateLimit: {
    windowSeconds: number;
    maxRequests: number;
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
    tvTtlSeconds: number;
    staleServeWindowSeconds: number;
    canonicalRecordTtlSeconds: number;
  };
  imdb: null | {
    apiUrl: string;
    apiKey: string;
    timeoutMs: number;
    awsRegion: string;
    dataSetId: string;
    revisionId: string;
    assetId: string;
  };
  coordination: {
    lookupTtlSeconds: number;
    lookupWaitMs: number;
  };
  search: {
    cacheTtlSeconds: number;
    indexTtlSeconds: number;
  };
  refresh: {
    queueName: string;
    jobAttempts: number;
    jobBackoffMs: number;
    workerConcurrency: number;
    dedupTtlSeconds: number;
    workerShutdownTimeoutMs: number;
  };
}>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const parsed = envSchema.parse(env);
  const imdbConfigured = [
    parsed.IMDB_API_URL,
    parsed.IMDB_API_KEY,
    parsed.IMDB_TIMEOUT_MS,
    parsed.IMDB_AWS_REGION,
    parsed.IMDB_DATA_SET_ID,
    parsed.IMDB_REVISION_ID,
    parsed.IMDB_ASSET_ID,
  ].some((value) => value !== undefined);
  const maxHotTtlSeconds = Math.max(
    parsed.MOVIE_CACHE_TTL_SECONDS,
    parsed.TV_CACHE_TTL_SECONDS,
  );

  if (
    parsed.CANONICAL_RECORD_TTL_SECONDS <
    maxHotTtlSeconds + parsed.MEDIA_STALE_SERVE_WINDOW_SECONDS
  ) {
    throw new Error(
      "CANONICAL_RECORD_TTL_SECONDS must be at least MOVIE/TV cache TTL plus MEDIA_STALE_SERVE_WINDOW_SECONDS",
    );
  }

  if (
    imdbConfigured &&
    (
      parsed.IMDB_API_KEY === undefined ||
      parsed.IMDB_DATA_SET_ID === undefined ||
      parsed.IMDB_REVISION_ID === undefined ||
      parsed.IMDB_ASSET_ID === undefined
    )
  ) {
    throw new Error(
      "IMDb support requires IMDB_API_KEY, IMDB_DATA_SET_ID, IMDB_REVISION_ID, and IMDB_ASSET_ID when any IMDb setting is provided",
    );
  }

  return {
    server: {
      nodeEnv: parsed.NODE_ENV,
      port: parsed.PORT,
      requestBodyLimitBytes: parsed.REQUEST_BODY_LIMIT_BYTES,
      logLevel: parsed.LOG_LEVEL
    },
    redis: {
      url: parsed.REDIS_URL,
      keyPrefix: parsed.REDIS_KEY_PREFIX
    },
    rateLimit: {
      windowSeconds: parsed.RATE_LIMIT_WINDOW_SECONDS,
      maxRequests: parsed.RATE_LIMIT_MAX_REQUESTS
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
      movieTtlSeconds: parsed.MOVIE_CACHE_TTL_SECONDS,
      tvTtlSeconds: parsed.TV_CACHE_TTL_SECONDS,
      staleServeWindowSeconds: parsed.MEDIA_STALE_SERVE_WINDOW_SECONDS,
      canonicalRecordTtlSeconds: parsed.CANONICAL_RECORD_TTL_SECONDS,
    },
    imdb:
      imdbConfigured
        ? {
            apiUrl:
              parsed.IMDB_API_URL ??
              "https://api-fulfill.dataexchange.us-east-1.amazonaws.com/v1",
            apiKey: parsed.IMDB_API_KEY as string,
            timeoutMs: parsed.IMDB_TIMEOUT_MS ?? 5000,
            awsRegion: parsed.IMDB_AWS_REGION ?? "us-east-1",
            dataSetId: parsed.IMDB_DATA_SET_ID as string,
            revisionId: parsed.IMDB_REVISION_ID as string,
            assetId: parsed.IMDB_ASSET_ID as string,
          }
        : null,
    coordination: {
      lookupTtlSeconds: parsed.LOOKUP_SINGLEFLIGHT_TTL_SECONDS,
      lookupWaitMs: parsed.LOOKUP_SINGLEFLIGHT_WAIT_MS,
    },
    search: {
      cacheTtlSeconds: parsed.SEARCH_CACHE_TTL_SECONDS,
      indexTtlSeconds: parsed.SEARCH_INDEX_TTL_SECONDS,
    },
    refresh: {
      queueName: parsed.REFRESH_QUEUE_NAME,
      jobAttempts: parsed.REFRESH_JOB_ATTEMPTS,
      jobBackoffMs: parsed.REFRESH_JOB_BACKOFF_MS,
      workerConcurrency: parsed.REFRESH_WORKER_CONCURRENCY,
      dedupTtlSeconds: parsed.REFRESH_DEDUP_TTL_SECONDS,
      workerShutdownTimeoutMs: parsed.WORKER_SHUTDOWN_TIMEOUT_MS,
    }
  };
}

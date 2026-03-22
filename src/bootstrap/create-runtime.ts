import { Redis } from "ioredis";

import { HttpAuthValidationAdapter } from "../adapters/auth-http/http-auth-validation-adapter.js";
import { TmdbMetadataProvider } from "../adapters/provider-tmdb/tmdb-metadata-provider.js";
import { RedisKeyBuilder } from "../adapters/redis-store/redis-key-builder.js";
import { RedisMediaSnapshotStore } from "../adapters/redis-store/redis-media-snapshot-store.js";
import { MovieLookupService } from "../application/lookup/movie-lookup-service.js";
import type { AppConfig } from "../config/env.js";
import { createApp } from "./create-app.js";
import { createLogger } from "./logger.js";
import { SystemClock } from "./system-clock.js";

export function createRuntime(config: AppConfig, fetchImpl: typeof fetch = fetch) {
  const logger = createLogger(config.server.logLevel);
  const clock = new SystemClock();
  const redis = new Redis(config.redis.url, {
    lazyConnect: false,
    keyPrefix: ""
  });
  const keyBuilder = new RedisKeyBuilder(config.redis.keyPrefix);

  const snapshotStore = new RedisMediaSnapshotStore(
    redis,
    keyBuilder,
    config.tmdb.movieTtlSeconds
  );
  const authValidationPort = new HttpAuthValidationAdapter(
    fetchImpl,
    redis,
    keyBuilder,
    config.auth
  );
  const metadataProviderPort = new TmdbMetadataProvider(fetchImpl, config.tmdb, clock);
  const movieLookupService = new MovieLookupService(
    authValidationPort,
    snapshotStore,
    metadataProviderPort,
    clock
  );

  const app = createApp({
    logger,
    movieLookupService,
    snapshotStore
  });

  return {
    app,
    logger,
    redis
  };
}

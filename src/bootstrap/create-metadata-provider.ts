import type { AppConfig } from "../config/env.js";
import { CompositeMetadataProvider } from "../adapters/providers-composite/composite-metadata-provider.js";
import {
  createImdbGraphqlClient,
  type ImdbGraphqlClientPort,
} from "../adapters/provider-imdb/imdb-graphql-client.js";
import { OfficialImdbMetadataProvider } from "../adapters/provider-imdb/official-imdb-metadata-provider.js";
import { TmdbMetadataProvider } from "../adapters/provider-tmdb/tmdb-metadata-provider.js";
import type { ClockPort } from "../ports/shared/clock-port.js";

export function createMetadataProvider(
  config: AppConfig,
  fetchImpl: typeof fetch,
  clock: ClockPort,
  overrides?: {
    imdbGraphqlClient?: ImdbGraphqlClientPort;
  },
) {
  const tmdbProvider = new TmdbMetadataProvider(fetchImpl, config.tmdb, clock);
  const imdbGraphqlClient =
    overrides?.imdbGraphqlClient ??
    (
      config.imdb !== null
        ? createImdbGraphqlClient({
            apiUrl: config.imdb.apiUrl,
            apiKey: config.imdb.apiKey,
            timeoutMs: config.imdb.timeoutMs,
            awsRegion: config.imdb.awsRegion,
            dataSetId: config.imdb.dataSetId,
            revisionId: config.imdb.revisionId,
            assetId: config.imdb.assetId,
          })
        : undefined
    );

  if (imdbGraphqlClient === undefined) {
    return tmdbProvider;
  }

  const imdbProvider = new OfficialImdbMetadataProvider(
    imdbGraphqlClient,
    clock,
    {
      movieTtlSeconds: config.tmdb.movieTtlSeconds,
      tvTtlSeconds: config.tmdb.tvTtlSeconds,
      staleServeWindowSeconds: config.tmdb.staleServeWindowSeconds,
    },
  );

  return new CompositeMetadataProvider(tmdbProvider, imdbProvider);
}

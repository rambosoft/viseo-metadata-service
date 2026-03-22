export function createOpenApiDocument() {
  const errorResponse = (description: string) => ({
    description,
    content: {
      "application/json": {
        schema: { $ref: "#/components/schemas/ErrorEnvelope" },
      },
    },
  });

  return {
    openapi: "3.1.0",
    info: {
      title: "Viseo Metadata Service",
      version: "0.4.0",
      description:
        "Redis-first multi-tenant metadata API for movie and TV lookup, TMDB-backed search, stale fallback, background refresh, and optional official IMDb enrichment/fallback by IMDb ID.",
    },
    servers: [{ url: "/" }],
    tags: [
      {
        name: "Media",
        description: "Authenticated metadata lookup and search endpoints.",
      },
      {
        name: "Operations",
        description: "Operational health, metrics, and API documentation endpoints.",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Bearer token",
          description:
            "Bearer token validated through the upstream auth boundary. Authenticated routes are tenant-scoped and rate-limited.",
        },
      },
      responses: {
        ValidationFailed: errorResponse("Request validation failed."),
        AuthenticationFailed: errorResponse("Authentication failed."),
        AuthorizationFailed: errorResponse("Authorization failed."),
        NotFound: errorResponse("Requested metadata could not be found."),
        RateLimited: errorResponse("The tenant-scoped route rate limit was exceeded."),
        ProviderUnavailable: errorResponse(
          "Provider dependency failed and no safe fallback existed.",
        ),
        DependencyUnavailable: errorResponse(
          "A required internal dependency such as Redis or BullMQ was unavailable.",
        ),
      },
      schemas: {
        ErrorEnvelope: {
          type: "object",
          required: ["error"],
          properties: {
            error: {
              type: "object",
              required: ["code", "message", "retryable", "requestId"],
              properties: {
                code: { type: "string", example: "validation_failed" },
                message: {
                  type: "string",
                  example: "Exactly one identifier must be provided",
                },
                retryable: { type: "boolean", example: false },
                requestId: { type: "string", example: "req_123" },
              },
            },
          },
        },
        ImageSet: {
          type: "object",
          properties: {
            posterUrl: {
              type: "string",
              format: "uri",
              example: "https://image.tmdb.org/t/p/w500/poster.jpg",
            },
            backdropUrl: {
              type: "string",
              format: "uri",
              example: "https://image.tmdb.org/t/p/w500/backdrop.jpg",
            },
          },
        },
        MediaIdentifiers: {
          type: "object",
          properties: {
            tmdbId: { type: "string", example: "550" },
            imdbId: { type: "string", example: "tt0137523" },
          },
        },
        MetadataEnvelopeMeta: {
          type: "object",
          required: ["requestId", "tenantId", "source", "stale"],
          properties: {
            requestId: { type: "string", example: "req_123" },
            tenantId: { type: "string", example: "tenant_demo" },
            source: {
              type: "string",
              enum: ["cache", "provider", "index"],
              example: "provider",
              description:
                "Route source. Lookup routes use cache or provider. Search may also return index.",
            },
            stale: {
              type: "boolean",
              example: false,
              description:
                "True when a stale-but-servable lookup response was returned while refresh was delegated to the worker.",
            },
          },
        },
        MovieMetadata: {
          type: "object",
          required: ["mediaId", "kind", "title", "genres", "images", "identifiers"],
          properties: {
            mediaId: { type: "string", example: "med_1234567890abcdef" },
            kind: { type: "string", enum: ["movie"] },
            title: { type: "string", example: "Fight Club" },
            originalTitle: { type: "string", example: "Fight Club" },
            description: {
              type: "string",
              example: "An insomniac office worker crosses paths with a soap maker.",
            },
            releaseDate: { type: "string", example: "1999-10-15" },
            releaseYear: { type: "integer", example: 1999 },
            runtimeMinutes: { type: "integer", example: 139 },
            rating: {
              type: "number",
              example: 8.8,
              description:
                "IMDb rating takes precedence when official IMDb enrichment is available and configured.",
            },
            genres: {
              type: "array",
              items: { type: "string" },
              example: ["Drama"],
            },
            images: { $ref: "#/components/schemas/ImageSet" },
            identifiers: { $ref: "#/components/schemas/MediaIdentifiers" },
          },
        },
        TvMetadata: {
          type: "object",
          required: ["mediaId", "kind", "title", "genres", "images", "identifiers"],
          properties: {
            mediaId: { type: "string", example: "med_abcdef1234567890" },
            kind: { type: "string", enum: ["tv"] },
            title: { type: "string", example: "Breaking Bad" },
            originalTitle: { type: "string", example: "Breaking Bad" },
            description: {
              type: "string",
              example: "A chemistry teacher turns to crime.",
            },
            firstAirDate: { type: "string", example: "2008-01-20" },
            firstAirYear: { type: "integer", example: 2008 },
            seasonCount: { type: "integer", example: 5 },
            episodeCount: { type: "integer", example: 62 },
            status: { type: "string", example: "Ended" },
            rating: {
              type: "number",
              example: 9.0,
              description:
                "IMDb rating takes precedence when official IMDb enrichment is available and configured.",
            },
            genres: {
              type: "array",
              items: { type: "string" },
              example: ["Drama"],
            },
            images: { $ref: "#/components/schemas/ImageSet" },
            identifiers: { $ref: "#/components/schemas/MediaIdentifiers" },
          },
        },
        SearchResultItem: {
          type: "object",
          required: ["mediaId", "kind", "title", "genres", "images", "identifiers"],
          properties: {
            mediaId: { type: "string", example: "med_1234567890abcdef" },
            kind: { type: "string", enum: ["movie", "tv"] },
            title: { type: "string", example: "Fight Club" },
            originalTitle: { type: "string", example: "Fight Club" },
            description: { type: "string", example: "Movie search result" },
            releaseDate: { type: "string", example: "1999-10-15" },
            releaseYear: { type: "integer", example: 1999 },
            firstAirDate: { type: "string", example: "2008-01-20" },
            firstAirYear: { type: "integer", example: 2008 },
            rating: { type: "number", example: 8.8 },
            genres: {
              type: "array",
              items: { type: "string" },
              example: ["Drama"],
            },
            images: { $ref: "#/components/schemas/ImageSet" },
            identifiers: { $ref: "#/components/schemas/MediaIdentifiers" },
          },
        },
        MovieLookupResponse: {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: { $ref: "#/components/schemas/MovieMetadata" },
            meta: { $ref: "#/components/schemas/MetadataEnvelopeMeta" },
          },
          examples: [
            {
              data: {
                mediaId: "med_1234567890abcdef",
                kind: "movie",
                title: "Fight Club",
                originalTitle: "Fight Club",
                description:
                  "An insomniac office worker crosses paths with a soap maker.",
                releaseDate: "1999-10-15",
                releaseYear: 1999,
                runtimeMinutes: 139,
                rating: 8.8,
                genres: ["Drama"],
                images: {
                  posterUrl: "https://image.tmdb.org/t/p/w500/poster.jpg",
                  backdropUrl: "https://image.tmdb.org/t/p/w500/backdrop.jpg",
                },
                identifiers: {
                  tmdbId: "550",
                  imdbId: "tt0137523",
                },
              },
              meta: {
                requestId: "req_123",
                tenantId: "tenant_demo",
                source: "provider",
                stale: false,
              },
            },
          ],
        },
        TvLookupResponse: {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: { $ref: "#/components/schemas/TvMetadata" },
            meta: { $ref: "#/components/schemas/MetadataEnvelopeMeta" },
          },
        },
        SearchResponse: {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: {
              type: "object",
              required: ["items", "page", "pageSize"],
              properties: {
                items: {
                  type: "array",
                  items: { $ref: "#/components/schemas/SearchResultItem" },
                },
                page: { type: "integer", example: 1 },
                pageSize: { type: "integer", example: 20 },
                total: { type: "integer", example: 2 },
              },
            },
            meta: { $ref: "#/components/schemas/MetadataEnvelopeMeta" },
          },
        },
        LiveHealthResponse: {
          type: "object",
          required: ["status"],
          properties: {
            status: { type: "string", enum: ["ok"] },
          },
        },
        ReadyHealthResponse: {
          type: "object",
          required: ["status", "dependencies"],
          properties: {
            status: { type: "string", enum: ["ready", "degraded"] },
            dependencies: {
              type: "object",
              properties: {
                redis: { type: "string", enum: ["up", "down"] },
                bullmq: { type: "string", enum: ["up", "down"] },
              },
            },
          },
        },
      },
    },
    paths: {
      "/health/live": {
        get: {
          tags: ["Operations"],
          operationId: "getLiveness",
          summary: "Liveness probe",
          description: "Returns process liveness only. It does not verify downstream dependencies.",
          responses: {
            "200": {
              description: "Service process is alive.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/LiveHealthResponse" },
                },
              },
            },
          },
        },
      },
      "/health/ready": {
        get: {
          tags: ["Operations"],
          operationId: "getReadiness",
          summary: "Readiness probe",
          description:
            "Reports whether Redis and BullMQ connectivity are healthy for the API runtime.",
          responses: {
            "200": {
              description: "Runtime dependencies are healthy.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ReadyHealthResponse" },
                },
              },
            },
            "503": {
              description: "One or more runtime dependencies are unavailable.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ReadyHealthResponse" },
                },
              },
            },
          },
        },
      },
      "/metrics": {
        get: {
          tags: ["Operations"],
          operationId: "getMetrics",
          summary: "Prometheus metrics",
          description:
            "Exposes Prometheus-formatted metrics for HTTP, provider, cache, auth, queue, and rate-limit paths.",
          responses: {
            "200": {
              description: "Prometheus text exposition output.",
              content: {
                "text/plain": {
                  schema: { type: "string" },
                },
              },
            },
          },
        },
      },
      "/openapi.json": {
        get: {
          tags: ["Operations"],
          operationId: "getOpenApiDocument",
          summary: "OpenAPI document",
          description: "Returns the live OpenAPI 3.1 document for the running service.",
          responses: {
            "200": {
              description: "OpenAPI document.",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                  },
                },
              },
            },
          },
        },
      },
      "/docs": {
        get: {
          tags: ["Operations"],
          operationId: "getApiDocs",
          summary: "Interactive API docs",
          description:
            "Serves an interactive OpenAPI UI backed by the live `/openapi.json` document.",
          responses: {
            "200": {
              description: "HTML API documentation UI.",
              content: {
                "text/html": {
                  schema: { type: "string" },
                },
              },
            },
          },
        },
      },
      "/api/v1/media/movie": {
        get: {
          tags: ["Media"],
          operationId: "lookupMovie",
          summary: "Lookup a movie",
          description:
            "Lookup a movie by exactly one identifier. TMDB is the primary source. When configured, official IMDb is used for IMDb ID resolution fallback and rating enrichment.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "mediaId",
              in: "query",
              schema: { type: "string" },
              description: "Canonical internal media identifier.",
              example: "med_1234567890abcdef",
            },
            {
              name: "tmdbId",
              in: "query",
              schema: { type: "string" },
              description: "TMDB movie identifier.",
              example: "550",
            },
            {
              name: "imdbId",
              in: "query",
              schema: { type: "string" },
              description:
                "IMDb title identifier. If TMDB cannot resolve the title and IMDb is configured, the service may return an IMDb-backed fallback record.",
              example: "tt0137523",
            },
            {
              name: "lang",
              in: "query",
              schema: { type: "string", default: "en" },
              description: "Locale code for upstream provider requests.",
              example: "en",
            },
          ],
          responses: {
            "200": {
              description: "Movie metadata response.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/MovieLookupResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationFailed" },
            "401": { $ref: "#/components/responses/AuthenticationFailed" },
            "403": { $ref: "#/components/responses/AuthorizationFailed" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "502": { $ref: "#/components/responses/ProviderUnavailable" },
            "503": { $ref: "#/components/responses/DependencyUnavailable" },
          },
        },
      },
      "/api/v1/media/tv": {
        get: {
          tags: ["Media"],
          operationId: "lookupTv",
          summary: "Lookup a TV show",
          description:
            "Lookup a TV show by exactly one identifier. TMDB is the primary source. When configured, official IMDb is used for IMDb ID resolution fallback and rating enrichment.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "mediaId",
              in: "query",
              schema: { type: "string" },
              description: "Canonical internal media identifier.",
              example: "med_abcdef1234567890",
            },
            {
              name: "tmdbId",
              in: "query",
              schema: { type: "string" },
              description: "TMDB TV identifier.",
              example: "1396",
            },
            {
              name: "imdbId",
              in: "query",
              schema: { type: "string" },
              description:
                "IMDb title identifier. If TMDB cannot resolve the title and IMDb is configured, the service may return an IMDb-backed fallback record.",
              example: "tt0903747",
            },
            {
              name: "lang",
              in: "query",
              schema: { type: "string", default: "en" },
              description: "Locale code for upstream provider requests.",
              example: "en",
            },
          ],
          responses: {
            "200": {
              description: "TV metadata response.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TvLookupResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationFailed" },
            "401": { $ref: "#/components/responses/AuthenticationFailed" },
            "403": { $ref: "#/components/responses/AuthorizationFailed" },
            "404": { $ref: "#/components/responses/NotFound" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "502": { $ref: "#/components/responses/ProviderUnavailable" },
            "503": { $ref: "#/components/responses/DependencyUnavailable" },
          },
        },
      },
      "/api/v1/media/search": {
        get: {
          tags: ["Media"],
          operationId: "searchMedia",
          summary: "Search movies and TV",
          description:
            "Searches movies and TV shows. TMDB remains the only active search provider in MVP. Cached query snapshots and the local fetched-record index may satisfy requests before TMDB is called.",
          security: [{ bearerAuth: [] }],
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string" },
              description: "Trimmed search text.",
              example: "fight club",
            },
            {
              name: "kind",
              in: "query",
              schema: { type: "string", enum: ["movie", "tv"] },
              description:
                "Optional media kind filter. When omitted, the search spans movie and TV only.",
            },
            {
              name: "lang",
              in: "query",
              schema: { type: "string", default: "en" },
              description: "Locale code for upstream provider requests.",
            },
            {
              name: "page",
              in: "query",
              schema: { type: "integer", default: 1, minimum: 1 },
              description: "1-based page number.",
            },
            {
              name: "pageSize",
              in: "query",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 50 },
              description: "Page size with a maximum of 50.",
            },
          ],
          responses: {
            "200": {
              description: "Search result page.",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SearchResponse" },
                },
              },
            },
            "400": { $ref: "#/components/responses/ValidationFailed" },
            "401": { $ref: "#/components/responses/AuthenticationFailed" },
            "403": { $ref: "#/components/responses/AuthorizationFailed" },
            "429": { $ref: "#/components/responses/RateLimited" },
            "502": { $ref: "#/components/responses/ProviderUnavailable" },
            "503": { $ref: "#/components/responses/DependencyUnavailable" },
          },
        },
      },
    },
  };
}

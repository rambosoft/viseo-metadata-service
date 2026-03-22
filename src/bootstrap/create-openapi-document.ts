export function createOpenApiDocument() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Viseo Metadata Service",
      version: "0.2.0",
      description: "Redis-first multi-tenant metadata lookup service for movie and TV records.",
    },
    servers: [{ url: "/" }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "Bearer token",
        },
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
                code: { type: "string" },
                message: { type: "string" },
                retryable: { type: "boolean" },
                requestId: { type: "string" },
              },
            },
          },
        },
        MovieLookupResponse: {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: {
              type: "object",
              required: ["mediaId", "kind", "title", "genres", "images", "identifiers"],
              properties: {
                mediaId: { type: "string" },
                kind: { type: "string", enum: ["movie"] },
                title: { type: "string" },
                originalTitle: { type: "string" },
                description: { type: "string" },
                releaseDate: { type: "string" },
                releaseYear: { type: "integer" },
                runtimeMinutes: { type: "integer" },
                rating: { type: "number" },
                genres: { type: "array", items: { type: "string" } },
                images: {
                  type: "object",
                  properties: {
                    posterUrl: { type: "string" },
                    backdropUrl: { type: "string" },
                  },
                },
                identifiers: {
                  type: "object",
                  properties: {
                    tmdbId: { type: "string" },
                    imdbId: { type: "string" },
                  },
                },
              },
            },
            meta: {
              type: "object",
              required: ["requestId", "tenantId", "source", "stale"],
              properties: {
                requestId: { type: "string" },
                tenantId: { type: "string" },
                source: { type: "string", enum: ["cache", "provider"] },
                stale: { type: "boolean" },
              },
            },
          },
        },
        TvLookupResponse: {
          type: "object",
          required: ["data", "meta"],
          properties: {
            data: {
              type: "object",
              required: ["mediaId", "kind", "title", "genres", "images", "identifiers"],
              properties: {
                mediaId: { type: "string" },
                kind: { type: "string", enum: ["tv"] },
                title: { type: "string" },
                originalTitle: { type: "string" },
                description: { type: "string" },
                firstAirDate: { type: "string" },
                firstAirYear: { type: "integer" },
                seasonCount: { type: "integer" },
                episodeCount: { type: "integer" },
                status: { type: "string" },
                rating: { type: "number" },
                genres: { type: "array", items: { type: "string" } },
                images: {
                  type: "object",
                  properties: {
                    posterUrl: { type: "string" },
                    backdropUrl: { type: "string" },
                  },
                },
                identifiers: {
                  type: "object",
                  properties: {
                    tmdbId: { type: "string" },
                    imdbId: { type: "string" },
                  },
                },
              },
            },
            meta: {
              type: "object",
              required: ["requestId", "tenantId", "source", "stale"],
              properties: {
                requestId: { type: "string" },
                tenantId: { type: "string" },
                source: { type: "string", enum: ["cache", "provider"] },
                stale: { type: "boolean" },
              },
            },
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
                  items: {
                    type: "object",
                    required: ["mediaId", "kind", "title", "genres", "images", "identifiers"],
                    properties: {
                      mediaId: { type: "string" },
                      kind: { type: "string", enum: ["movie", "tv"] },
                      title: { type: "string" },
                      originalTitle: { type: "string" },
                      description: { type: "string" },
                      releaseDate: { type: "string" },
                      releaseYear: { type: "integer" },
                      firstAirDate: { type: "string" },
                      firstAirYear: { type: "integer" },
                      rating: { type: "number" },
                      genres: { type: "array", items: { type: "string" } },
                      images: {
                        type: "object",
                        properties: {
                          posterUrl: { type: "string" },
                          backdropUrl: { type: "string" },
                        },
                      },
                      identifiers: {
                        type: "object",
                        properties: {
                          tmdbId: { type: "string" },
                          imdbId: { type: "string" },
                        },
                      },
                    },
                  },
                },
                page: { type: "integer" },
                pageSize: { type: "integer" },
                total: { type: "integer" },
              },
            },
            meta: {
              type: "object",
              required: ["requestId", "tenantId", "source", "stale"],
              properties: {
                requestId: { type: "string" },
                tenantId: { type: "string" },
                source: { type: "string", enum: ["cache", "index", "provider"] },
                stale: { type: "boolean" },
              },
            },
          },
        },
      },
    },
    paths: {
      "/health/live": {
        get: {
          summary: "Liveness probe",
          responses: {
            "200": {
              description: "Service process is alive",
            },
          },
        },
      },
      "/health/ready": {
        get: {
          summary: "Readiness probe",
          responses: {
            "200": {
              description: "Redis dependency is healthy",
            },
            "503": {
              description: "Redis dependency is unavailable",
            },
          },
        },
      },
      "/api/v1/media/movie": {
        get: {
          summary: "Lookup a movie by one identifier",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "mediaId", in: "query", schema: { type: "string" } },
            { name: "tmdbId", in: "query", schema: { type: "string" } },
            { name: "imdbId", in: "query", schema: { type: "string" } },
            { name: "lang", in: "query", schema: { type: "string", default: "en" } },
          ],
          responses: {
            "200": {
              description: "Movie lookup result",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/MovieLookupResponse" },
                },
              },
            },
            "400": {
              description: "Validation failure",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "401": {
              description: "Authentication failure",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "404": {
              description: "Movie not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "429": {
              description: "Rate limit exceeded",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "502": {
              description: "Provider unavailable",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
          },
        },
      },
      "/api/v1/media/tv": {
        get: {
          summary: "Lookup a TV show by one identifier",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "mediaId", in: "query", schema: { type: "string" } },
            { name: "tmdbId", in: "query", schema: { type: "string" } },
            { name: "imdbId", in: "query", schema: { type: "string" } },
            { name: "lang", in: "query", schema: { type: "string", default: "en" } },
          ],
          responses: {
            "200": {
              description: "TV lookup result",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/TvLookupResponse" },
                },
              },
            },
            "400": {
              description: "Validation failure",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "401": {
              description: "Authentication failure",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "404": {
              description: "TV show not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "429": {
              description: "Rate limit exceeded",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "502": {
              description: "Provider unavailable",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
          },
        },
      },
      "/api/v1/media/search": {
        get: {
          summary: "Search movie and TV metadata",
          security: [{ bearerAuth: [] }],
          parameters: [
            { name: "q", in: "query", required: true, schema: { type: "string" } },
            { name: "kind", in: "query", schema: { type: "string", enum: ["movie", "tv"] } },
            { name: "lang", in: "query", schema: { type: "string", default: "en" } },
            { name: "page", in: "query", schema: { type: "integer", default: 1, minimum: 1 } },
            { name: "pageSize", in: "query", schema: { type: "integer", default: 20, minimum: 1, maximum: 50 } },
          ],
          responses: {
            "200": {
              description: "Search result page",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/SearchResponse" },
                },
              },
            },
            "400": {
              description: "Validation failure",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "401": {
              description: "Authentication failure",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "429": {
              description: "Rate limit exceeded",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
            "502": {
              description: "Provider unavailable",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorEnvelope" },
                },
              },
            },
          },
        },
      },
    },
  };
}

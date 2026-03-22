import { randomUUID } from "node:crypto";

import express from "express";
import type { Logger } from "pino";

import { AppError, AuthenticationError } from "../core/shared/errors.js";
import type { MediaKind, MediaRecord } from "../core/media/types.js";
import { mediaLookupQuerySchema } from "../application/lookup/media-lookup-schemas.js";
import type { MediaLookupService } from "../application/lookup/media-lookup-service.js";
import type { MediaSnapshotStorePort } from "../ports/storage/media-snapshot-store-port.js";
import { createOpenApiDocument } from "./create-openapi-document.js";

type RequestContext = {
  requestId?: string;
  tenantId?: string;
};

export function createApp(args: {
  logger: Logger;
  mediaLookupService: MediaLookupService;
  snapshotStore: MediaSnapshotStorePort;
  requestBodyLimitBytes: number;
}) {
  const app = express();
  app.use(express.json({ limit: args.requestBodyLimitBytes }));

  app.use((req, res, next) => {
    const requestId = req.header("x-request-id") ?? randomUUID();
    setRequestContext(res, { requestId });
    res.setHeader("x-request-id", requestId);
    next();
  });

  app.get("/health/live", (_req, res) => {
    res.status(200).json({ status: "ok" });
  });

  app.get("/openapi.json", (_req, res) => {
    res.status(200).json(createOpenApiDocument());
  });

  app.get("/health/ready", async (_req, res, next) => {
    try {
      const redisHealthy = await args.snapshotStore.isHealthy();
      res.status(redisHealthy ? 200 : 503).json({
        status: redisHealthy ? "ready" : "degraded",
        dependencies: {
          redis: redisHealthy ? "up" : "down"
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/v1/media/movie", handleMediaLookup("movie"));
  app.get("/api/v1/media/tv", handleMediaLookup("tv"));

  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    const requestContext = getRequestContext(res);
    args.logger.error(
      {
        err: error,
        requestId: requestContext.requestId,
        tenantId: requestContext.tenantId,
        route: req.path,
        method: req.method
      },
      "Request failed"
    );

    if (error instanceof AppError) {
      res.status(error.statusCode).json({
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
          requestId: requestContext.requestId as string
        }
      });
      return;
    }

    if (error instanceof Error && "issues" in error) {
      res.status(400).json({
        error: {
          code: "validation_failed",
          message: error.message,
          retryable: false,
          requestId: requestContext.requestId as string
        }
      });
      return;
    }

    res.status(500).json({
      error: {
        code: "internal_error",
        message: "Internal server error",
        retryable: false,
        requestId: requestContext.requestId as string
      }
    });
  });

  return app;

  function handleMediaLookup(kind: MediaKind) {
    return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
      try {
        const authorization = req.header("authorization");
        const token = authorization?.startsWith("Bearer ")
          ? authorization.slice("Bearer ".length)
          : undefined;

        if (token === undefined || token.length === 0) {
          throw new AuthenticationError();
        }

        const query = mediaLookupQuerySchema.parse(req.query);
        const result = await args.mediaLookupService.execute({
          kind,
          token,
          route: req.path,
          query
        });

        setRequestContext(res, { tenantId: result.tenantId });

        res.status(200).json({
          data: serializeRecord(result.record),
          meta: {
            requestId: getRequestContext(res).requestId,
            tenantId: result.tenantId,
            source: result.source,
            stale: result.stale
          }
        });
      } catch (error) {
        next(error);
      }
    };
  }
}

function getRequestContext(res: express.Response): RequestContext {
  return res.locals as RequestContext;
}

function setRequestContext(res: express.Response, patch: RequestContext): void {
  Object.assign(getRequestContext(res), patch);
}

function serializeRecord(record: MediaRecord) {
  const base = {
    mediaId: record.mediaId,
    kind: record.kind,
    title: record.canonicalTitle,
    originalTitle: record.originalTitle,
    description: record.description,
    rating: record.rating,
    genres: record.genres,
    images: record.images,
    identifiers: {
      tmdbId: record.identifiers.tmdbId,
      imdbId: record.identifiers.imdbId
    }
  };

  if (record.kind === "movie") {
    return {
      ...base,
      releaseDate: record.releaseDate,
      releaseYear: record.releaseYear,
      runtimeMinutes: record.runtimeMinutes
    };
  }

  return {
    ...base,
    firstAirDate: record.firstAirDate,
    firstAirYear: record.firstAirYear,
    seasonCount: record.seasonCount,
    episodeCount: record.episodeCount,
    status: record.status
  };
}

import { randomUUID } from "node:crypto";

import express from "express";
import type { Logger } from "pino";

import { AppError, AuthenticationError } from "../core/shared/errors.js";
import { movieLookupQuerySchema } from "../application/lookup/movie-lookup-schemas.js";
import type { MovieLookupService } from "../application/lookup/movie-lookup-service.js";
import type { MediaSnapshotStorePort } from "../ports/storage/media-snapshot-store-port.js";

export function createApp(args: {
  logger: Logger;
  movieLookupService: MovieLookupService;
  snapshotStore: MediaSnapshotStorePort;
}) {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    const requestId = req.header("x-request-id") ?? randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
  });

  app.get("/health/live", (_req, res) => {
    res.status(200).json({ status: "ok" });
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

  app.get("/api/v1/media/movie", async (req, res, next) => {
    try {
      const authorization = req.header("authorization");
      const token = authorization?.startsWith("Bearer ")
        ? authorization.slice("Bearer ".length)
        : undefined;

      if (token === undefined || token.length === 0) {
        throw new AuthenticationError();
      }

      const query = movieLookupQuerySchema.parse(req.query);
      const result = await args.movieLookupService.execute({
        token,
        query
      });

      res.status(200).json({
        data: {
          mediaId: result.record.mediaId,
          kind: result.record.kind,
          title: result.record.canonicalTitle,
          originalTitle: result.record.originalTitle,
          description: result.record.description,
          releaseDate: result.record.releaseDate,
          releaseYear: result.record.releaseYear,
          rating: result.record.rating,
          genres: result.record.genres,
          images: result.record.images,
          identifiers: {
            tmdbId: result.record.identifiers.tmdbId,
            imdbId: result.record.identifiers.imdbId
          }
        },
        meta: {
          requestId: res.locals.requestId as string,
          tenantId: result.tenantId,
          source: result.source,
          stale: result.stale
        }
      });
    } catch (error) {
      next(error);
    }
  });

  app.use((error: unknown, req: express.Request, res: express.Response, _next: express.NextFunction) => {
    args.logger.error(
      {
        err: error,
        requestId: res.locals.requestId,
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
          requestId: res.locals.requestId as string
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
          requestId: res.locals.requestId as string
        }
      });
      return;
    }

    res.status(500).json({
      error: {
        code: "internal_error",
        message: "Internal server error",
        retryable: false,
        requestId: res.locals.requestId as string
      }
    });
  });

  return app;
}

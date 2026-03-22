import { createHash } from "node:crypto";

import type { ClockPort } from "../../ports/shared/clock-port.js";
import type {
  LocaleCode,
  MediaId,
  MediaKind,
  MediaRecord,
  TenantId,
} from "../../core/media/types.js";
import type {
  LookupIdentifier,
  ProviderLookupResult,
} from "../../ports/providers/metadata-provider-port.js";

export function toTenantId(value: string): TenantId {
  return value as TenantId;
}

export function toMediaId(value: string): MediaId {
  return value as MediaId;
}

export function toLocaleCode(value: string): LocaleCode {
  return value as LocaleCode;
}

export function buildContentHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildRecordContentHash(
  record: Readonly<{
    kind: MediaKind;
    canonicalTitle: string;
    originalTitle?: string;
    description?: string;
    genres: readonly string[];
    rating?: number;
    cast: ReadonlyArray<Readonly<{ name: string; role?: string }>>;
    images: Readonly<{
      posterUrl?: string;
      backdropUrl?: string;
    }>;
    releaseDate?: string;
    releaseYear?: number;
    runtimeMinutes?: number;
    firstAirDate?: string;
    firstAirYear?: number;
    seasonCount?: number;
    episodeCount?: number;
    status?: string;
  }>,
): string {
  return buildContentHash({
    kind: record.kind,
    canonicalTitle: record.canonicalTitle,
    ...(record.originalTitle !== undefined ? { originalTitle: record.originalTitle } : {}),
    ...(record.description !== undefined ? { description: record.description } : {}),
    genres: record.genres,
    ...(record.rating !== undefined ? { rating: record.rating } : {}),
    cast: record.cast,
    images: record.images,
    ...(record.kind === "movie"
      ? {
          ...(record.releaseDate !== undefined ? { releaseDate: record.releaseDate } : {}),
          ...(record.releaseYear !== undefined ? { releaseYear: record.releaseYear } : {}),
          ...(record.runtimeMinutes !== undefined
            ? { runtimeMinutes: record.runtimeMinutes }
            : {}),
        }
      : {
          ...(record.firstAirDate !== undefined ? { firstAirDate: record.firstAirDate } : {}),
          ...(record.firstAirYear !== undefined ? { firstAirYear: record.firstAirYear } : {}),
          ...(record.seasonCount !== undefined ? { seasonCount: record.seasonCount } : {}),
          ...(record.episodeCount !== undefined ? { episodeCount: record.episodeCount } : {}),
          ...(record.status !== undefined ? { status: record.status } : {}),
        }),
  });
}

export function buildMediaId(
  provider: ProviderLookupResult["provider"],
  kind: MediaKind,
  identifier: LookupIdentifier,
): MediaId {
  const seed = `${provider}:${kind}:${identifier.type}:${identifier.value}`;
  return `med_${createHash("sha256").update(seed).digest("hex").slice(0, 16)}` as MediaId;
}

export function computeFreshness(
  clock: ClockPort,
  ttlSeconds: number,
  staleServeWindowSeconds: number,
): {
  lastFetchedAt: string;
  staleAfter: string;
  refreshAfter: string;
  serveStaleUntil: string;
  cacheTtlSeconds: number;
} {
  const now = clock.now();
  const staleAt = new Date(now.getTime() + ttlSeconds * 1000);
  const refreshAt = new Date(now.getTime() + Math.floor(ttlSeconds * 0.75) * 1000);
  const serveStaleUntil = new Date(
    staleAt.getTime() + staleServeWindowSeconds * 1000,
  );
  return {
    lastFetchedAt: now.toISOString(),
    staleAfter: staleAt.toISOString(),
    refreshAfter: refreshAt.toISOString(),
    serveStaleUntil: serveStaleUntil.toISOString(),
    cacheTtlSeconds: ttlSeconds,
  };
}

export function isRecordFresh(clock: ClockPort, record: MediaRecord): boolean {
  return new Date(record.freshness.staleAfter).getTime() > clock.now().getTime();
}

export function isRecordStaleButServable(clock: ClockPort, record: MediaRecord): boolean {
  const now = clock.now().getTime();
  return (
    new Date(record.freshness.staleAfter).getTime() <= now &&
    new Date(record.freshness.serveStaleUntil).getTime() > now
  );
}

export function shouldRefreshRecord(clock: ClockPort, record: MediaRecord): boolean {
  return new Date(record.freshness.refreshAfter).getTime() <= clock.now().getTime();
}

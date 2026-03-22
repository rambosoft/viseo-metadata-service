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

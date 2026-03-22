import { createHash } from "node:crypto";

import type { ClockPort } from "../../ports/shared/clock-port.js";
import type { LocaleCode, MediaKind } from "../../core/media/types.js";
import type {
  LocalIndexSearchResult,
  SearchQuery,
  SearchRequestFingerprint,
  SearchResultItem,
  SearchSnapshot,
} from "../../core/search/types.js";

const tokenSeparatorPattern = /[^a-z0-9]+/g;

export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(tokenSeparatorPattern, " ").replace(/\s+/g, " ").trim();
}

export function tokenizeSearchText(value: string): string[] {
  const normalized = normalizeSearchText(value);
  if (normalized.length === 0) {
    return [];
  }
  return Array.from(new Set(normalized.split(" ")));
}

export function buildSearchRequestFingerprint(args: {
  tenantId: string;
  q: string;
  kind?: MediaKind;
  lang: LocaleCode;
  page: number;
  pageSize: number;
}): SearchRequestFingerprint {
  const seed = JSON.stringify({
    tenantId: args.tenantId,
    q: normalizeSearchText(args.q),
    kind: args.kind ?? null,
    lang: args.lang,
    page: args.page,
    pageSize: args.pageSize,
  });

  return createHash("sha256").update(seed).digest("hex") as SearchRequestFingerprint;
}

export function buildSearchSnapshot(args: {
  tenantId: string;
  query: SearchQuery;
  items: readonly SearchResultItem[];
  total?: number;
  sourceProviders: readonly string[];
  clock: ClockPort;
  ttlSeconds: number;
}): SearchSnapshot {
  const generatedAt = args.clock.now();
  const expiresAt = new Date(generatedAt.getTime() + args.ttlSeconds * 1000);

  return {
    tenantId: args.tenantId as SearchSnapshot["tenantId"],
    query: normalizeSearchText(args.query.q),
    ...(args.query.kind !== undefined ? { kind: args.query.kind } : {}),
    lang: args.query.lang,
    page: args.query.page,
    pageSize: args.query.pageSize,
    ...(args.total !== undefined ? { total: args.total } : {}),
    items: args.items,
    sourceProviders: args.sourceProviders,
    generatedAt: generatedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };
}

export function canServePageFromLocalIndex(
  result: LocalIndexSearchResult,
  query: SearchQuery,
): boolean {
  if (result.total === 0) {
    return false;
  }

  const startIndex = (query.page - 1) * query.pageSize;
  if (startIndex >= result.total) {
    return true;
  }

  return result.items.length === Math.min(query.pageSize, result.total - startIndex);
}

export function scoreSearchItem(
  item: SearchResultItem,
  normalizedQuery: string,
  queryTokens: readonly string[],
): number {
  const title = normalizeSearchText(item.title);
  const originalTitle = normalizeSearchText(item.originalTitle ?? "");
  const haystacks = [title, originalTitle].filter((value) => value.length > 0);

  let score = 0;
  for (const haystack of haystacks) {
    if (haystack === normalizedQuery) {
      score += 100;
    } else if (haystack.startsWith(normalizedQuery)) {
      score += 50;
    }

    for (const token of queryTokens) {
      if (haystack.split(" ").includes(token)) {
        score += 10;
      }
    }
  }

  if (item.description !== undefined) {
    const description = normalizeSearchText(item.description);
    for (const token of queryTokens) {
      if (description.includes(token)) {
        score += 1;
      }
    }
  }

  return score;
}

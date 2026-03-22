import type { MediaRecord } from "../media/types.js";
import type { SearchResultItem } from "./types.js";

export function toSearchResultItem(record: MediaRecord): SearchResultItem {
  return {
    mediaId: record.mediaId,
    tenantId: record.tenantId,
    kind: record.kind,
    title: record.canonicalTitle,
    ...(record.originalTitle !== undefined
      ? { originalTitle: record.originalTitle }
      : {}),
    ...(record.description !== undefined ? { description: record.description } : {}),
    ...(record.rating !== undefined ? { rating: record.rating } : {}),
    genres: record.genres,
    images: record.images,
    identifiers: record.identifiers,
    ...(record.kind === "movie"
      ? {
          ...(record.releaseDate !== undefined
            ? { releaseDate: record.releaseDate }
            : {}),
          ...(record.releaseYear !== undefined
            ? { releaseYear: record.releaseYear }
            : {}),
        }
      : {
          ...(record.firstAirDate !== undefined
            ? { firstAirDate: record.firstAirDate }
            : {}),
          ...(record.firstAirYear !== undefined
            ? { firstAirYear: record.firstAirYear }
            : {}),
        }),
  };
}

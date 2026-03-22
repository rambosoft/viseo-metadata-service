import { buildRecordContentHash } from "../../application/lookup/media-lookup-helpers.js";
import type { MediaRecord, ProviderSnapshot } from "../../core/media/types.js";
import type { ImdbEnrichmentProviderPort } from "../../ports/providers/imdb-enrichment-provider-port.js";
import type {
  MetadataProviderPort,
  ProviderLookupResult,
  ProviderSearchResult,
} from "../../ports/providers/metadata-provider-port.js";
import { OfficialImdbMetadataProvider } from "../provider-imdb/official-imdb-metadata-provider.js";

export class CompositeMetadataProvider implements MetadataProviderPort {
  public constructor(
    private readonly tmdbProvider: MetadataProviderPort,
    private readonly imdbProvider: ImdbEnrichmentProviderPort & Pick<OfficialImdbMetadataProvider, "buildFallbackRecord">,
  ) {}

  public async lookupByIdentifier(
    args: Parameters<MetadataProviderPort["lookupByIdentifier"]>[0],
  ): Promise<ProviderLookupResult | null> {
    const tmdbResult = await this.tmdbProvider.lookupByIdentifier(args);
    if (tmdbResult !== null) {
      return {
        provider: tmdbResult.provider,
        record: await this.enrichTmdbRecord(tmdbResult.record, args.language),
      };
    }

    if (args.identifier.type !== "imdbId") {
      return null;
    }

    const imdbLookup = await this.imdbProvider.lookupByImdbId({
      tenantId: args.tenantId,
      kind: args.kind,
      imdbId: args.identifier.value,
      language: args.language,
    });
    if (imdbLookup === null) {
      return null;
    }

    return {
      provider: "imdb",
      record: this.imdbProvider.buildFallbackRecord(args.tenantId, imdbLookup),
    };
  }

  public async search(
    args: Parameters<MetadataProviderPort["search"]>[0],
  ): Promise<ProviderSearchResult> {
    return this.tmdbProvider.search(args);
  }

  private async enrichTmdbRecord(
    record: MediaRecord,
    language: Parameters<ImdbEnrichmentProviderPort["lookupByImdbId"]>[0]["language"],
  ): Promise<MediaRecord> {
    const imdbId = record.identifiers.imdbId;
    if (imdbId === undefined) {
      return record;
    }

    const imdbLookup = await this.imdbProvider.lookupByImdbId({
      tenantId: record.tenantId,
      kind: record.kind,
      imdbId,
      language,
    });
    if (imdbLookup === null) {
      return record;
    }

    const providerRefs = mergeProviderRefs(record.providerRefs, imdbLookup.providerRef);
    const merged = {
      ...record,
      ...(imdbLookup.rating !== undefined ? { rating: imdbLookup.rating } : {}),
      providerRefs,
      identifiers: {
        ...record.identifiers,
        imdbId,
      },
      updatedAt: imdbLookup.providerRef.normalizedAt,
    };

    return {
      ...merged,
      contentHash: buildRecordContentHash(merged),
    } satisfies MediaRecord;
  }
}

function mergeProviderRefs(
  currentProviderRefs: readonly ProviderSnapshot[],
  imdbProviderRef: ProviderSnapshot,
): readonly ProviderSnapshot[] {
  const filtered = currentProviderRefs.filter(
    (providerRef) => providerRef.provider !== "imdb",
  );
  return [...filtered, imdbProviderRef];
}

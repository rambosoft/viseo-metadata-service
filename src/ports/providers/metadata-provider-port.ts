import type {
  LocaleCode,
  MediaKind,
  MediaRecord,
  ProviderName,
} from "../../core/media/types.js";

export type LookupIdentifier =
  | Readonly<{ type: "mediaId"; value: string }>
  | Readonly<{ type: "tmdbId"; value: string }>
  | Readonly<{ type: "imdbId"; value: string }>;

export type LookupByIdentifierArgs = Readonly<{
  tenantId: string;
  kind: MediaKind;
  identifier: LookupIdentifier;
  language: LocaleCode;
}>;

export type ProviderLookupResult = Readonly<{
  provider: ProviderName;
  record: MediaRecord;
}>;

export interface MetadataProviderPort {
  lookupByIdentifier(
    args: LookupByIdentifierArgs,
  ): Promise<ProviderLookupResult | null>;
}

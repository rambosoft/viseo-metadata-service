import {
  MEDIA_KIND_MOVIE,
  type MediaKind,
  type MediaRecord,
} from "../../core/media/types.js";
import { NotFoundError, ValidationError } from "../../core/shared/errors.js";
import type { AuthValidationPort } from "../../ports/auth/auth-validation-port.js";
import type {
  LookupIdentifier,
  MetadataProviderPort,
} from "../../ports/providers/metadata-provider-port.js";
import type { RateLimiterPort } from "../../ports/rate-limit/rate-limiter-port.js";
import type { MediaSnapshotStorePort } from "../../ports/storage/media-snapshot-store-port.js";
import { toLocaleCode } from "./media-lookup-helpers.js";
import type { MediaLookupQuery } from "./media-lookup-schemas.js";

export type MediaLookupResult = Readonly<{
  record: MediaRecord;
  source: "cache" | "provider";
  stale: boolean;
  tenantId: string;
}>;

export class MediaLookupService {
  public constructor(
    private readonly authValidationPort: AuthValidationPort,
    private readonly snapshotStorePort: MediaSnapshotStorePort,
    private readonly metadataProviderPort: MetadataProviderPort,
    private readonly rateLimiterPort: RateLimiterPort,
  ) {}

  public async execute(args: {
    kind: MediaKind;
    token: string;
    route: string;
    query: MediaLookupQuery;
  }): Promise<MediaLookupResult> {
    const authContext = await this.authValidationPort.validateToken(args.token);
    await this.rateLimiterPort.consume({
      tenantId: authContext.tenantId,
      principalId: authContext.principalId,
      route: args.route,
    });

    const identifier = this.resolveIdentifier(args.query);

    const cached = await this.snapshotStorePort.getLookup(
      authContext.tenantId,
      args.kind,
      identifier,
    );

    if (cached !== null) {
      return {
        record: cached.record,
        source: "cache",
        stale: false,
        tenantId: authContext.tenantId,
      };
    }

    if (identifier.type === "mediaId") {
      throw new NotFoundError(this.buildNotFoundMessage(args.kind));
    }

    const providerResult = await this.metadataProviderPort.lookupByIdentifier({
      tenantId: authContext.tenantId,
      kind: args.kind,
      identifier,
      language: toLocaleCode(args.query.lang),
    });

    if (providerResult === null) {
      throw new NotFoundError(this.buildNotFoundMessage(args.kind));
    }

    await this.snapshotStorePort.putSnapshot(providerResult.record);

    return {
      record: providerResult.record,
      source: "provider",
      stale: false,
      tenantId: authContext.tenantId,
    };
  }

  private resolveIdentifier(query: MediaLookupQuery): LookupIdentifier {
    if (query.mediaId !== undefined) {
      return { type: "mediaId", value: query.mediaId };
    }
    if (query.tmdbId !== undefined) {
      return { type: "tmdbId", value: query.tmdbId };
    }
    if (query.imdbId !== undefined) {
      return { type: "imdbId", value: query.imdbId };
    }
    throw new ValidationError("Exactly one identifier must be provided");
  }

  private buildNotFoundMessage(kind: MediaKind): string {
    return kind === MEDIA_KIND_MOVIE ? "Movie not found" : "TV show not found";
  }
}

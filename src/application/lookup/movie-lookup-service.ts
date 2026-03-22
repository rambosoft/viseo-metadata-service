import { NotFoundError, ValidationError } from "../../core/shared/errors.js";
import type { MediaRecord } from "../../core/media/types.js";
import type { AuthValidationPort } from "../../ports/auth/auth-validation-port.js";
import type {
  LookupIdentifier,
  MetadataProviderPort,
} from "../../ports/providers/metadata-provider-port.js";
import type { ClockPort } from "../../ports/shared/clock-port.js";
import type { MediaSnapshotStorePort } from "../../ports/storage/media-snapshot-store-port.js";
import { toLocaleCode } from "./movie-lookup-helpers.js";
import type { MovieLookupQuery } from "./movie-lookup-schemas.js";

export type MovieLookupResult = Readonly<{
  record: MediaRecord;
  source: "cache" | "provider";
  stale: boolean;
  tenantId: string;
}>;

export class MovieLookupService {
  public constructor(
    private readonly authValidationPort: AuthValidationPort,
    private readonly snapshotStorePort: MediaSnapshotStorePort,
    private readonly metadataProviderPort: MetadataProviderPort,
    private readonly clockPort: ClockPort,
  ) {}

  public async execute(args: {
    token: string;
    query: MovieLookupQuery;
  }): Promise<MovieLookupResult> {
    const authContext = await this.authValidationPort.validateToken(args.token);
    const identifier = this.resolveIdentifier(args.query);

    const cached = await this.snapshotStorePort.getMovieLookup(
      authContext.tenantId,
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
      throw new NotFoundError("Movie not found");
    }

    const providerResult = await this.metadataProviderPort.lookupByIdentifier({
      tenantId: authContext.tenantId,
      kind: "movie",
      identifier,
      language: toLocaleCode(args.query.lang),
    });

    if (providerResult === null) {
      throw new NotFoundError("Movie not found");
    }

    await this.snapshotStorePort.putMovieSnapshot(providerResult.record);

    return {
      record: providerResult.record,
      source: "provider",
      stale: false,
      tenantId: authContext.tenantId,
    };
  }

  private resolveIdentifier(query: MovieLookupQuery): LookupIdentifier {
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
}

import { createHash } from "node:crypto";

import type { TenantId } from "../../core/media/types.js";
import type { LookupIdentifier } from "../../ports/providers/metadata-provider-port.js";

export class RedisKeyBuilder {
  public constructor(private readonly namespace: string) {}

  public authToken(token: string): string {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    return `${this.namespace}:v1:auth:token:${tokenHash}`;
  }

  public movieRecord(tenantId: TenantId, mediaId: string): string {
    return `${this.namespace}:v1:tenant:${tenantId}:movie:record:${mediaId}`;
  }

  public movieLookup(tenantId: TenantId, identifier: LookupIdentifier): string {
    return `${this.namespace}:v1:tenant:${tenantId}:movie:lookup:${identifier.type}:${identifier.value}`;
  }
}

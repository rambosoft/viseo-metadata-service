import { createHash } from "node:crypto";

import type { MediaKind, TenantId } from "../../core/media/types.js";
import type { SearchRequestFingerprint } from "../../core/search/types.js";
import type { LookupIdentifier } from "../../ports/providers/metadata-provider-port.js";

export class RedisKeyBuilder {
  public constructor(private readonly namespace: string) {}

  public authToken(token: string): string {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    return `${this.namespace}:v1:auth:token:${tokenHash}`;
  }

  public rateLimitWindow(
    tenantId: TenantId,
    principalId: string,
    route: string,
  ): string {
    const scopeHash = createHash("sha256")
      .update(`${principalId}:${route}`)
      .digest("hex")
      .slice(0, 16);

    return `${this.namespace}:v1:tenant:${tenantId}:rate-limit:${scopeHash}`;
  }

  public mediaRecord(tenantId: TenantId, kind: MediaKind, mediaId: string): string {
    return `${this.namespace}:v1:tenant:${tenantId}:${kind}:record:${mediaId}`;
  }

  public mediaLookup(
    tenantId: TenantId,
    kind: MediaKind,
    identifier: LookupIdentifier,
  ): string {
    return `${this.namespace}:v1:tenant:${tenantId}:${kind}:lookup:${identifier.type}:${identifier.value}`;
  }

  public searchSnapshot(
    tenantId: TenantId,
    fingerprint: SearchRequestFingerprint,
  ): string {
    return `${this.namespace}:v1:tenant:${tenantId}:search:snapshot:${fingerprint}`;
  }

  public searchIndexDocument(tenantId: TenantId, mediaId: string): string {
    return `${this.namespace}:v1:tenant:${tenantId}:search:index:doc:${mediaId}`;
  }

  public searchIndexToken(
    tenantId: TenantId,
    kind: MediaKind,
    token: string,
  ): string {
    return `${this.namespace}:v1:tenant:${tenantId}:search:index:${kind}:token:${token}`;
  }
}

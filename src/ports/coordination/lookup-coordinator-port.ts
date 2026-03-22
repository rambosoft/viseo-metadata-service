import type { MediaKind, TenantId } from "../../core/media/types.js";
import type { LookupIdentifier } from "../providers/metadata-provider-port.js";

export type LookupCoordinationKey = Readonly<{
  tenantId: TenantId;
  kind: MediaKind;
  identifier: LookupIdentifier;
}>;

export type LookupLease = Readonly<{
  key: string;
  token: string;
}>;

export interface LookupCoordinatorPort {
  tryAcquire(key: LookupCoordinationKey): Promise<LookupLease | null>;
  waitForAvailability(key: LookupCoordinationKey): Promise<void>;
  release(lease: LookupLease): Promise<void>;
}

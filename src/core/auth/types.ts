import type { TenantId } from "../media/types.js";

export type AuthContext = Readonly<{
  principalId: string;
  tenantId: TenantId;
  scopes: readonly string[];
  expiresAt: string;
}>;

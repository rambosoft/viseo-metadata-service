import type { TenantId } from "../../core/media/types.js";

export type ConsumeRateLimitArgs = Readonly<{
  tenantId: TenantId;
  principalId: string;
  route: string;
}>;

export interface RateLimiterPort {
  consume(args: ConsumeRateLimitArgs): Promise<void>;
}

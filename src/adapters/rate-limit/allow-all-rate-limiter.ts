import type {
  ConsumeRateLimitArgs,
  RateLimiterPort,
} from "../../ports/rate-limit/rate-limiter-port.js";

export class AllowAllRateLimiter implements RateLimiterPort {
  public async consume(_args: ConsumeRateLimitArgs): Promise<void> {
    return Promise.resolve();
  }
}

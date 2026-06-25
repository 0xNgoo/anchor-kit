interface RateLimitBucket {
  count: number;
  resetAt: number;
}

export interface RateLimitRule {
  windowMs: number;
  max: number;
}

export class InMemoryRateLimiter {
  private readonly buckets = new Map<string, RateLimitBucket>();

  public hit(key: string, rule: RateLimitRule): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, {
        count: 1,
        resetAt: now + rule.windowMs,
      });
      return { allowed: true, retryAfterSeconds: Math.ceil(rule.windowMs / 1000) };
    }

    bucket.count += 1;
    if (bucket.count > rule.max) {
      return {
        allowed: false,
        retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
      };
    }

    return {
      allowed: true,
      retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
}

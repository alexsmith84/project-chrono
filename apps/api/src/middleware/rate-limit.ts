/**
 * Rate limiting middleware
 * Redis-backed rate limiting with sliding window
 */

import type { Context, Next } from "hono";
import { redis } from "../cache/redis";
import type { AuthContext } from "./auth";
import { logger } from "../utils/logger";

/**
 * Rate limit key pattern
 */
function getRateLimitKey(apiKey: string): string {
  return `ratelimit:${apiKey}`;
}

/**
 * Check rate limit using Redis INCR with expiry
 * Returns { allowed: boolean, remaining: number, reset: number }
 */
async function checkRateLimit(
  apiKey: string,
  limit: number,
): Promise<{ allowed: boolean; remaining: number; reset: number }> {
  // Unlimited rate limit (0 = no limit)
  if (limit === 0) {
    return { allowed: true, remaining: -1, reset: 0 };
  }

  const key = getRateLimitKey(apiKey);
  const windowSeconds = 60; // 1-minute sliding window

  try {
    // Atomic INCR + EXPIRE operation
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();

    if (!results) {
      throw new Error("Redis pipeline returned no results");
    }

    const count = results[0][1] as number;

    // Get TTL to calculate reset time
    const ttl = await redis.ttl(key);
    const resetTimestamp = Date.now() + ttl * 1000;

    const allowed = count <= limit;
    const remaining = Math.max(0, limit - count);

    return {
      allowed,
      remaining,
      reset: resetTimestamp,
    };
  } catch (error) {
    logger.error({ err: error, apiKey }, "Rate limit check failed");
    // Fail open - allow request if Redis is down
    return { allowed: true, remaining: -1, reset: 0 };
  }
}

/**
 * Rate limiting middleware
 * Must be used AFTER authMiddleware
 */
export async function rateLimitMiddleware(c: Context, next: Next) {
  const auth = c.get("auth") as AuthContext | undefined;

  if (!auth) {
    // No auth context - skip rate limiting (auth middleware will handle)
    await next();
    return;
  }

  const { allowed, remaining, reset } = await checkRateLimit(
    auth.apiKey,
    auth.rateLimit,
  );

  // Set rate limit headers
  c.header("X-RateLimit-Limit", auth.rateLimit.toString());
  c.header("X-RateLimit-Remaining", remaining.toString());
  c.header("X-RateLimit-Reset", reset.toString());

  if (!allowed) {
    return c.json(
      {
        error: {
          code: "RATE_LIMIT_EXCEEDED",
          message: `Rate limit exceeded. Limit: ${auth.rateLimit} requests per minute`,
          details: {
            limit: auth.rateLimit,
            remaining,
            reset,
            retry_after: Math.ceil((reset - Date.now()) / 1000),
          },
          request_id: c.get("requestId"),
        },
        status: 429,
      },
      429,
      {
        "Retry-After": Math.ceil((reset - Date.now()) / 1000).toString(),
      },
    );
  }

  await next();
}

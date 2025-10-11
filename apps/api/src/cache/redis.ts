/**
 * Redis client for caching and pub/sub
 * Supports both single instance and cluster configurations
 */

import Redis from "ioredis";
import { config } from "../utils/config";
import { logger, logCacheError } from "../utils/logger";

/**
 * Redis client instance
 */
export const redis = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  reconnectOnError(err) {
    logger.warn({ err }, "Redis connection error, attempting reconnect");
    return true;
  },
});

/**
 * Redis pub/sub subscriber client (separate connection for receiving)
 */
export const redisPubSub = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

/**
 * Redis publisher client (separate connection for sending)
 * Required because subscriber connections cannot publish
 */
export const redisPublisher = new Redis(config.REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

/**
 * Handle Redis connection events
 */
redis.on("connect", () => {
  logger.info("Redis connected");
});

redis.on("error", (error) => {
  logCacheError(error, "Redis connection");
});

redisPubSub.on("connect", () => {
  logger.info("Redis pub/sub connected");
});

redisPubSub.on("error", (error) => {
  logCacheError(error, "Redis pub/sub connection");
});

redisPublisher.on("connect", () => {
  logger.info("Redis publisher connected");
});

redisPublisher.on("error", (error) => {
  logCacheError(error, "Redis publisher connection");
});

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === "PONG";
  } catch (error) {
    logCacheError(error as Error, "Health check");
    return false;
  }
}

/**
 * Gracefully close Redis connections
 */
export async function closeRedisConnection(): Promise<void> {
  try {
    await redis.quit();
    await redisPubSub.quit();
    await redisPublisher.quit();
    logger.info("Redis connections closed");
  } catch (error) {
    logCacheError(error as Error, "Connection close");
  }
}

/**
 * Cache error types
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error,
  ) {
    super(message);
    this.name = "CacheError";
  }
}

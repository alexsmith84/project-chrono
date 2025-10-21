/**
 * Redis client for caching and pub/sub
 * Uses Bun's native RedisClient for optimal performance
 */

import { RedisClient } from 'bun';
import { config } from '../utils/config';
import { logger, logCacheError } from '../utils/logger';

/**
 * Redis client instance for general operations (caching, etc.)
 */
export const redis = new RedisClient(config.REDIS_URL);
await redis.connect();

/**
 * Redis pub/sub subscriber client (separate connection for receiving)
 * Note: Bun's subscription mode takes over the connection
 */
export const redisPubSub = new RedisClient(config.REDIS_URL);
await redisPubSub.connect();

/**
 * Redis publisher client (separate connection for sending)
 * Required because subscriber connections can only subscribe
 */
export const redisPublisher = new RedisClient(config.REDIS_URL);
await redisPublisher.connect();

logger.info('Redis clients connected (using Bun native RedisClient)');

/**
 * Health check for Redis connection
 */
export async function checkRedisHealth(): Promise<boolean> {
  try {
    const pong = await redis.ping();
    return pong === 'PONG';
  } catch (error) {
    logCacheError(error as Error, 'Health check');
    return false;
  }
}

/**
 * Gracefully close Redis connections
 */
export async function closeRedisConnection(): Promise<void> {
  try {
    redis.close();
    redisPubSub.close();
    redisPublisher.close();
    logger.info('Redis connections closed');
  } catch (error) {
    logCacheError(error as Error, 'Connection close');
  }
}

/**
 * Cache error types
 */
export class CacheError extends Error {
  constructor(
    message: string,
    public readonly operation: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'CacheError';
  }
}

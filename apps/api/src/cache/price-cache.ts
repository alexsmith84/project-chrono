/**
 * Price caching layer
 * Redis-backed caching for hot data (latest prices, aggregates)
 */

import { redis } from "./redis";
import { config } from "../utils/config";
import { CacheError } from "./redis";
import type { PriceFeed } from "../db/types";

/**
 * Cache key patterns
 */
export const CacheKeys = {
  latestPrice: (symbol: string) => `latest:${symbol}`,
  priceRange: (symbol: string, from: Date, to: Date, interval?: string) =>
    `range:${symbol}:${from.getTime()}:${to.getTime()}:${interval || "raw"}`,
  consensus: (symbol: string, timestamp: Date) =>
    `consensus:${symbol}:${timestamp.getTime()}`,
} as const;

/**
 * Cache latest price for a symbol
 */
export async function cacheLatestPrice(
  symbol: string,
  price: PriceFeed,
): Promise<void> {
  try {
    const key = CacheKeys.latestPrice(symbol);
    await redis.setex(key, config.REDIS_CACHE_TTL, JSON.stringify(price));
  } catch (error) {
    throw new CacheError(
      `Failed to cache latest price for ${symbol}`,
      "SET latest price",
      error as Error,
    );
  }
}

/**
 * Get cached latest price for a symbol
 */
export async function getLatestPriceFromCache(
  symbol: string,
): Promise<PriceFeed | null> {
  try {
    const key = CacheKeys.latestPrice(symbol);
    const cached = await redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached, (key, value) => {
      // Parse Date fields
      if (key === "timestamp" || key === "ingested_at") {
        return new Date(value);
      }
      return value;
    }) as PriceFeed;
  } catch (error) {
    throw new CacheError(
      `Failed to get cached latest price for ${symbol}`,
      "GET latest price",
      error as Error,
    );
  }
}

/**
 * Cache latest prices for multiple symbols
 */
export async function cacheLatestPrices(prices: PriceFeed[]): Promise<void> {
  try {
    if (prices.length === 0) {
      return;
    }

    const pipeline = redis.pipeline();

    for (const price of prices) {
      const key = CacheKeys.latestPrice(price.symbol);
      pipeline.setex(key, config.REDIS_CACHE_TTL, JSON.stringify(price));
    }

    await pipeline.exec();
  } catch (error) {
    throw new CacheError(
      `Failed to cache ${prices.length} latest prices`,
      "SETEX batch",
      error as Error,
    );
  }
}

/**
 * Get cached latest prices for multiple symbols
 * Returns a map of symbol → price (null if not cached)
 */
export async function getLatestPricesFromCache(
  symbols: string[],
): Promise<Map<string, PriceFeed | null>> {
  try {
    if (symbols.length === 0) {
      return new Map();
    }

    const keys = symbols.map((symbol) => CacheKeys.latestPrice(symbol));
    const cached = await redis.mget(...keys);

    const result = new Map<string, PriceFeed | null>();

    symbols.forEach((symbol, index) => {
      const value = cached[index];

      if (!value) {
        result.set(symbol, null);
      } else {
        const price = JSON.parse(value, (key, value) => {
          if (key === "timestamp" || key === "ingested_at") {
            return new Date(value);
          }
          return value;
        }) as PriceFeed;

        result.set(symbol, price);
      }
    });

    return result;
  } catch (error) {
    throw new CacheError(
      `Failed to get cached prices for ${symbols.length} symbols`,
      "MGET latest prices",
      error as Error,
    );
  }
}

/**
 * Cache price range query results
 */
export async function cachePriceRange(
  symbol: string,
  from: Date,
  to: Date,
  data: unknown[],
  interval?: string,
): Promise<void> {
  try {
    const key = CacheKeys.priceRange(symbol, from, to, interval);
    // Cache range queries for 5 minutes (300 seconds)
    await redis.setex(key, 300, JSON.stringify(data));
  } catch (error) {
    throw new CacheError(
      `Failed to cache price range for ${symbol}`,
      "SET price range",
      error as Error,
    );
  }
}

/**
 * Get cached price range
 */
export async function getPriceRangeFromCache(
  symbol: string,
  from: Date,
  to: Date,
  interval?: string,
): Promise<unknown[] | null> {
  try {
    const key = CacheKeys.priceRange(symbol, from, to, interval);
    const cached = await redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached, (key, value) => {
      // Parse Date fields
      if (key === "timestamp" || key === "bucket") {
        return new Date(value);
      }
      return value;
    }) as unknown[];
  } catch (error) {
    throw new CacheError(
      `Failed to get cached price range for ${symbol}`,
      "GET price range",
      error as Error,
    );
  }
}

/**
 * Cache consensus price
 */
export async function cacheConsensusPrice(
  symbol: string,
  timestamp: Date,
  data: unknown,
): Promise<void> {
  try {
    const key = CacheKeys.consensus(symbol, timestamp);
    await redis.setex(key, config.REDIS_CACHE_TTL, JSON.stringify(data));
  } catch (error) {
    throw new CacheError(
      `Failed to cache consensus price for ${symbol}`,
      "SET consensus",
      error as Error,
    );
  }
}

/**
 * Get cached consensus price
 */
export async function getConsensusPriceFromCache(
  symbol: string,
  timestamp: Date,
): Promise<unknown | null> {
  try {
    const key = CacheKeys.consensus(symbol, timestamp);
    const cached = await redis.get(key);

    if (!cached) {
      return null;
    }

    return JSON.parse(cached, (key, value) => {
      if (key === "timestamp") {
        return new Date(value);
      }
      return value;
    }) as unknown;
  } catch (error) {
    throw new CacheError(
      `Failed to get cached consensus price for ${symbol}`,
      "GET consensus",
      error as Error,
    );
  }
}

/**
 * Invalidate cache for a symbol
 */
export async function invalidatePriceCache(symbol: string): Promise<void> {
  try {
    const pattern = `*:${symbol}:*`;
    const keys = await redis.keys(pattern);

    if (keys.length > 0) {
      await redis.del(...keys);
    }
  } catch (error) {
    throw new CacheError(
      `Failed to invalidate cache for ${symbol}`,
      "DEL pattern",
      error as Error,
    );
  }
}

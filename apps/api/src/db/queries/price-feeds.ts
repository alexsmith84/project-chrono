/**
 * Price feed database queries
 * Optimized for high-throughput ingestion and low-latency reads
 */

import { sql } from "../client";
import type { PriceFeed, PriceFeedInsert } from "../types";
import { DatabaseError } from "../client";

/**
 * Insert price feeds in batch
 * Maximum 100 feeds per batch for optimal performance
 */
export async function insertPriceFeeds(
  feeds: PriceFeedInsert[],
): Promise<number> {
  try {
    if (feeds.length === 0) {
      return 0;
    }

    if (feeds.length > 100) {
      throw new DatabaseError("Batch size exceeds maximum of 100 feeds");
    }

    const result = await sql`
      INSERT INTO price_feeds ${sql(feeds, "symbol", "price", "volume", "timestamp", "source", "worker_id", "metadata")}
      RETURNING id
    `;

    return result.count;
  } catch (error) {
    throw new DatabaseError(
      "Failed to insert price feeds",
      `INSERT price_feeds (batch of ${feeds.length})`,
      error as Error,
    );
  }
}

/**
 * Get latest price for a symbol
 * Uses index on (symbol, timestamp DESC) for fast lookup
 */
export async function getLatestPrice(
  symbol: string,
): Promise<PriceFeed | null> {
  try {
    const result = await sql<PriceFeed[]>`
      SELECT *
      FROM price_feeds
      WHERE symbol = ${symbol}
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    return result[0] || null;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get latest price for ${symbol}`,
      "SELECT latest price",
      error as Error,
    );
  }
}

/**
 * Get latest prices for multiple symbols
 * Uses DISTINCT ON for efficient per-symbol latest lookup
 */
export async function getLatestPrices(symbols: string[]): Promise<PriceFeed[]> {
  try {
    if (symbols.length === 0) {
      return [];
    }

    const result = await sql<PriceFeed[]>`
      SELECT DISTINCT ON (symbol) *
      FROM price_feeds
      WHERE symbol = ANY(${symbols})
      ORDER BY symbol, timestamp DESC
    `;

    return result;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get latest prices for ${symbols.length} symbols`,
      "SELECT latest prices",
      error as Error,
    );
  }
}

/**
 * Get price feeds in a time range
 * Optimized with index on (symbol, timestamp DESC)
 */
export async function getPriceRange(params: {
  symbol: string;
  from: Date;
  to: Date;
  source?: string;
  limit?: number;
}): Promise<PriceFeed[]> {
  try {
    const { symbol, from, to, source, limit = 1000 } = params;

    if (limit > 10000) {
      throw new DatabaseError("Limit exceeds maximum of 10000");
    }

    const result = await sql<PriceFeed[]>`
      SELECT *
      FROM price_feeds
      WHERE symbol = ${symbol}
        AND timestamp >= ${from}
        AND timestamp <= ${to}
        ${source ? sql`AND source = ${source}` : sql``}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    return result;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get price range for ${params.symbol}`,
      "SELECT price range",
      error as Error,
    );
  }
}

/**
 * Get price statistics for a time range
 * Returns OHLCV (Open, High, Low, Close, Volume) data
 */
export async function getPriceStats(params: {
  symbol: string;
  from: Date;
  to: Date;
}): Promise<{
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
  num_feeds: number;
} | null> {
  try {
    const { symbol, from, to } = params;

    const result = await sql<
      {
        open: string;
        high: string;
        low: string;
        close: string;
        volume: string;
        num_feeds: number;
      }[]
    >`
      WITH ordered_prices AS (
        SELECT
          price,
          volume,
          timestamp,
          ROW_NUMBER() OVER (ORDER BY timestamp ASC) as rn_asc,
          ROW_NUMBER() OVER (ORDER BY timestamp DESC) as rn_desc
        FROM price_feeds
        WHERE symbol = ${symbol}
          AND timestamp >= ${from}
          AND timestamp <= ${to}
      )
      SELECT
        (SELECT price FROM ordered_prices WHERE rn_asc = 1) as open,
        MAX(price) as high,
        MIN(price) as low,
        (SELECT price FROM ordered_prices WHERE rn_desc = 1) as close,
        COALESCE(SUM(volume), 0) as volume,
        COUNT(*)::int as num_feeds
      FROM ordered_prices
    `;

    return result[0] || null;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get price stats for ${params.symbol}`,
      "SELECT price stats",
      error as Error,
    );
  }
}

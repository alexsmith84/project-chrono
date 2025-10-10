/**
 * Aggregated price queries for FTSO consensus data
 */

import { sql } from '../client';
import type { AggregatedPrice } from '../types';
import { DatabaseError } from '../client';

/**
 * Get consensus price from aggregated_prices table
 * Falls back to computing from price_feeds if no aggregated data exists
 */
export async function getConsensusPrice(params: {
  symbol: string;
  timestamp?: Date;
}): Promise<{
  symbol: string;
  price: string;
  median: string;
  mean: string;
  std_dev: string | null;
  num_sources: number;
  timestamp: Date;
  sources: string[];
} | null> {
  try {
    const { symbol, timestamp = new Date() } = params;

    // Try to get from aggregated_prices table first
    const aggregated = await sql<AggregatedPrice[]>`
      SELECT *
      FROM aggregated_prices
      WHERE symbol = ${symbol}
        AND timestamp <= ${timestamp}
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    if (aggregated.length > 0) {
      return aggregated[0];
    }

    // Fall back to computing from price_feeds (last 5 minutes)
    const fiveMinutesAgo = new Date(timestamp.getTime() - 5 * 60 * 1000);

    const computed = await sql<
      {
        symbol: string;
        price: string;
        median: string;
        mean: string;
        std_dev: string | null;
        num_sources: number;
        timestamp: Date;
        sources: string[];
      }[]
    >`
      SELECT
        symbol,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price::numeric) as median,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price::numeric) as price,
        AVG(price::numeric) as mean,
        STDDEV(price::numeric) as std_dev,
        COUNT(DISTINCT source)::int as num_sources,
        MAX(timestamp) as timestamp,
        ARRAY_AGG(DISTINCT source) as sources
      FROM price_feeds
      WHERE symbol = ${symbol}
        AND timestamp >= ${fiveMinutesAgo}
        AND timestamp <= ${timestamp}
      GROUP BY symbol
      HAVING COUNT(DISTINCT source) > 0
    `;

    return computed[0] || null;
  } catch (error) {
    throw new DatabaseError(
      `Failed to get consensus price for ${params.symbol}`,
      'SELECT consensus price',
      error as Error
    );
  }
}

/**
 * Get consensus prices for multiple symbols
 */
export async function getConsensusPrices(params: {
  symbols: string[];
  timestamp?: Date;
}): Promise<
  {
    symbol: string;
    price: string;
    median: string;
    mean: string;
    std_dev: string | null;
    num_sources: number;
    timestamp: Date;
    sources: string[];
  }[]
> {
  try {
    const { symbols, timestamp = new Date() } = params;

    if (symbols.length === 0) {
      return [];
    }

    // Try aggregated_prices first
    const aggregated = await sql<AggregatedPrice[]>`
      SELECT DISTINCT ON (symbol) *
      FROM aggregated_prices
      WHERE symbol = ANY(${symbols})
        AND timestamp <= ${timestamp}
      ORDER BY symbol, timestamp DESC
    `;

    // Find symbols that don't have aggregated data
    const aggregatedSymbols = new Set(aggregated.map((a) => a.symbol));
    const missingSymbols = symbols.filter((s) => !aggregatedSymbols.has(s));

    if (missingSymbols.length === 0) {
      return aggregated;
    }

    // Compute missing symbols from price_feeds
    const fiveMinutesAgo = new Date(timestamp.getTime() - 5 * 60 * 1000);

    const computed = await sql<
      {
        symbol: string;
        price: string;
        median: string;
        mean: string;
        std_dev: string | null;
        num_sources: number;
        timestamp: Date;
        sources: string[];
      }[]
    >`
      SELECT
        symbol,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price::numeric) as median,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price::numeric) as price,
        AVG(price::numeric) as mean,
        STDDEV(price::numeric) as std_dev,
        COUNT(DISTINCT source)::int as num_sources,
        MAX(timestamp) as timestamp,
        ARRAY_AGG(DISTINCT source) as sources
      FROM price_feeds
      WHERE symbol = ANY(${missingSymbols})
        AND timestamp >= ${fiveMinutesAgo}
        AND timestamp <= ${timestamp}
      GROUP BY symbol
      HAVING COUNT(DISTINCT source) > 0
    `;

    return [...aggregated, ...computed];
  } catch (error) {
    throw new DatabaseError(
      `Failed to get consensus prices for ${params.symbols.length} symbols`,
      'SELECT consensus prices',
      error as Error
    );
  }
}

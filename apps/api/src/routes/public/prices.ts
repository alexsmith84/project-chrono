/**
 * Public price query endpoints
 * GET /prices/latest - Latest prices for symbols
 * GET /prices/range - Price history with optional aggregation
 */

import { Hono } from 'hono';
import {
  latestPricesQuerySchema,
  priceRangeQuerySchema,
} from '../../schemas/queries';
import type {
  LatestPricesResponse,
  PriceRangeResponse,
  OHLCVData,
} from '../../schemas/responses';
import { getLatestPrices } from '../../db/queries/price-feeds';
import { getPriceRange, getPriceStats } from '../../db/queries/price-feeds';
import {
  getLatestPricesFromCache,
  cacheLatestPrices,
  getPriceRangeFromCache,
  cachePriceRange,
} from '../../cache/price-cache';
import { logger } from '../../utils/logger';

const app = new Hono();

/**
 * GET /prices/latest?symbols=BTC/USD,ETH/USD
 * Get latest prices for specified symbols
 */
app.get('/latest', async (c) => {
  const startTime = Date.now();
  const requestId = c.get('requestId') as string;

  // Validate query parameters
  const query = latestPricesQuerySchema.parse(c.req.query());
  const { symbols } = query;

  logger.debug({ symbols, request_id: requestId }, 'Fetching latest prices');

  try {
    // Try cache first
    const cachedPrices = await getLatestPricesFromCache(symbols);
    const cacheHits = Array.from(cachedPrices.values()).filter((p) => p !== null);
    const cacheMisses = symbols.filter((s) => !cachedPrices.get(s));

    let allPrices = cacheHits;

    // Fetch cache misses from database
    if (cacheMisses.length > 0) {
      const dbPrices = await getLatestPrices(cacheMisses);
      allPrices = [...cacheHits, ...dbPrices];

      // Cache the fetched prices (fire and forget)
      if (dbPrices.length > 0) {
        cacheLatestPrices(dbPrices).catch((error) => {
          logger.warn({ err: error, request_id: requestId }, 'Failed to cache prices');
        });
      }
    }

    const latency = Date.now() - startTime;
    const cached = cacheMisses.length === 0;

    const response: LatestPricesResponse = {
      data: allPrices.map((price) => ({
        symbol: price.symbol,
        price: price.price,
        volume: price.volume,
        source: price.source,
        timestamp: price.timestamp.toISOString(),
        staleness_ms: Date.now() - price.timestamp.getTime(),
      })),
      cached,
      latency_ms: latency,
    };

    return c.json(response, 200);
  } catch (error) {
    logger.error(
      {
        err: error,
        symbols,
        request_id: requestId,
      },
      'Failed to fetch latest prices'
    );

    throw error; // Let error handler middleware handle it
  }
});

/**
 * GET /prices/range?symbol=BTC/USD&from=...&to=...&interval=1h&limit=1000
 * Get price history for a time range with optional aggregation
 */
app.get('/range', async (c) => {
  const startTime = Date.now();
  const requestId = c.get('requestId') as string;

  // Validate query parameters
  const query = priceRangeQuerySchema.parse(c.req.query());
  const { symbol, from, to, interval, source, limit } = query;

  const fromDate = new Date(from);
  const toDate = new Date(to);

  logger.debug(
    {
      symbol,
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      interval,
      source,
      limit,
      request_id: requestId,
    },
    'Fetching price range'
  );

  try {
    let data: OHLCVData[];

    // If interval specified, return aggregated OHLCV data
    if (interval) {
      // Try cache first
      const cached = await getPriceRangeFromCache(symbol, fromDate, toDate, interval);

      if (cached) {
        const latency = Date.now() - startTime;

        const response: PriceRangeResponse = {
          data: cached as OHLCVData[],
          interval,
          count: cached.length,
          latency_ms: latency,
        };

        return c.json(response, 200);
      }

      // Cache miss - compute from database
      // For now, just get stats for the entire range
      // TODO: Implement time bucketing (requires TimescaleDB or custom logic)
      const stats = await getPriceStats({ symbol, from: fromDate, to: toDate });

      if (!stats) {
        data = [];
      } else {
        data = [
          {
            timestamp: toDate.toISOString(),
            open: stats.open,
            high: stats.high,
            low: stats.low,
            close: stats.close,
            volume: stats.volume,
            num_feeds: stats.num_feeds,
          },
        ];
      }

      // Cache the result
      cachePriceRange(symbol, fromDate, toDate, data, interval).catch((error) => {
        logger.warn({ err: error, request_id: requestId }, 'Failed to cache price range');
      });
    } else {
      // No interval - return raw price feeds
      const rawPrices = await getPriceRange({
        symbol,
        from: fromDate,
        to: toDate,
        source,
        limit,
      });

      // Convert to OHLCV format (each point is its own OHLCV)
      data = rawPrices.map((price) => ({
        timestamp: price.timestamp.toISOString(),
        open: price.price,
        high: price.price,
        low: price.price,
        close: price.price,
        volume: price.volume || '0',
        num_feeds: 1,
      }));
    }

    const latency = Date.now() - startTime;

    const response: PriceRangeResponse = {
      data,
      interval,
      count: data.length,
      latency_ms: latency,
    };

    return c.json(response, 200);
  } catch (error) {
    logger.error(
      {
        err: error,
        symbol,
        from,
        to,
        request_id: requestId,
      },
      'Failed to fetch price range'
    );

    throw error;
  }
});

export default app;

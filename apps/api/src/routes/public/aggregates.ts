/**
 * Aggregated/consensus price endpoints
 * GET /aggregates/consensus - FTSO consensus prices
 */

import { Hono } from 'hono';
import { consensusPricesQuerySchema } from '../../schemas/queries';
import type { ConsensusPricesResponse } from '../../schemas/responses';
import { getConsensusPrices } from '../../db/queries/aggregates';
import {
  getConsensusPriceFromCache,
  cacheConsensusPrice,
} from '../../cache/price-cache';
import { logger } from '../../utils/logger';

const app = new Hono();

/**
 * GET /aggregates/consensus?symbols=BTC/USD,ETH/USD&timestamp=...
 * Get FTSO consensus prices (aggregated from multiple sources)
 */
app.get('/consensus', async (c) => {
  const startTime = Date.now();
  const requestId = c.get('requestId') as string;

  // Validate query parameters
  const query = consensusPricesQuerySchema.parse(c.req.query());
  const { symbols, timestamp } = query;

  logger.debug(
    {
      symbols,
      timestamp: timestamp.toISOString(),
      request_id: requestId,
    },
    'Fetching consensus prices'
  );

  try {
    // Try cache for each symbol
    const cachePromises = symbols.map((symbol) =>
      getConsensusPriceFromCache(symbol, timestamp)
    );
    const cachedResults = await Promise.all(cachePromises);

    const cachedPrices = cachedResults
      .filter((p) => p !== null)
      .map((p) => p as any);
    const cacheMisses = symbols.filter((_, i) => cachedResults[i] === null);

    let allPrices = cachedPrices;

    // Fetch cache misses from database
    if (cacheMisses.length > 0) {
      const dbPrices = await getConsensusPrices({
        symbols: cacheMisses,
        timestamp,
      });

      allPrices = [...cachedPrices, ...dbPrices];

      // Cache the fetched prices (fire and forget)
      for (const price of dbPrices) {
        cacheConsensusPrice(price.symbol, timestamp, price).catch((error) => {
          logger.warn(
            { err: error, symbol: price.symbol, request_id: requestId },
            'Failed to cache consensus price'
          );
        });
      }
    }

    const latency = Date.now() - startTime;

    const response: ConsensusPricesResponse = {
      data: allPrices.map((price) => ({
        symbol: price.symbol,
        price: price.price,
        median: price.median,
        mean: price.mean,
        std_dev: price.std_dev,
        num_sources: price.num_sources,
        timestamp:
          price.timestamp instanceof Date
            ? price.timestamp.toISOString()
            : price.timestamp,
        sources: price.sources,
      })),
      latency_ms: latency,
    };

    return c.json(response, 200);
  } catch (error) {
    logger.error(
      {
        err: error,
        symbols,
        timestamp: timestamp.toISOString(),
        request_id: requestId,
      },
      'Failed to fetch consensus prices'
    );

    throw error;
  }
});

export default app;

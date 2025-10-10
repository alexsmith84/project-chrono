/**
 * Internal ingestion endpoint
 * POST /internal/ingest
 * Receives price feed batches from exchange workers
 */

import { Hono } from 'hono';
import { ingestRequestSchema, type IngestResponse } from '../../schemas/ingest';
import { insertPriceFeeds } from '../../db/queries/price-feeds';
import { cacheLatestPrices } from '../../cache/price-cache';
import { publishPriceUpdates } from '../../cache/pubsub';
import { logger, logPriceIngestion } from '../../utils/logger';
import type { PriceFeedInsert } from '../../db/types';

const app = new Hono();

/**
 * POST /internal/ingest
 * Ingest price feeds from exchange workers
 */
app.post('/', async (c) => {
  const startTime = Date.now();
  const requestId = c.get('requestId') as string;

  try {
    // Parse and validate request body
    const body = await c.req.json();
    const validated = ingestRequestSchema.parse(body);

    const { worker_id, feeds } = validated;

    logger.info(
      {
        worker_id,
        feed_count: feeds.length,
        request_id: requestId,
      },
      'Processing price feed ingestion'
    );

    // Convert to database insert format
    const feedsToInsert: PriceFeedInsert[] = feeds.map((feed) => ({
      symbol: feed.symbol,
      price: feed.price,
      volume: feed.volume ?? null,
      timestamp: new Date(feed.timestamp),
      source: feed.source,
      worker_id,
      metadata: feed.metadata ?? null,
    }));
    // Insert into database (batch insert, max 100 per request)
    const insertedCount = await insertPriceFeeds(feedsToInsert);

    // Cache latest prices for fast retrieval
    // Group by symbol and take the latest timestamp for each
    const latestBySymbol = new Map<string, PriceFeedInsert>();
    for (const feed of feedsToInsert) {
      const existing = latestBySymbol.get(feed.symbol);
      if (!existing || feed.timestamp > existing.timestamp) {
        latestBySymbol.set(feed.symbol, feed);
      }
    }

    // Convert to PriceFeed format for caching
    const latestFeeds = Array.from(latestBySymbol.values()).map((feed) => ({
      id: crypto.randomUUID(), // Not used for caching, but required by type
      ...feed,
      ingested_at: new Date(),
    }));

    // Cache latest prices (fire and forget - non-blocking)
    cacheLatestPrices(latestFeeds).catch((error) => {
      logger.warn({ err: error, request_id: requestId }, 'Failed to cache latest prices');
    });

    // Publish to WebSocket subscribers via Redis pub/sub (fire and forget)
    publishPriceUpdates(latestFeeds).catch((error) => {
      logger.warn({ err: error, request_id: requestId }, 'Failed to publish price updates');
    });

    const latency = Date.now() - startTime;

    // Log successful ingestion
    logPriceIngestion({
      worker_id,
      count: insertedCount,
      latency_ms: latency,
      request_id: requestId,
    });

    const response: IngestResponse = {
      status: 'success',
      ingested: insertedCount,
      failed: 0,
      latency_ms: latency,
      message: `${insertedCount} price feeds ingested successfully`,
    };

    return c.json(response, 200);
  } catch (error) {
    // Let error handler middleware handle validation and other errors
    throw error;
  }
});

export default app;

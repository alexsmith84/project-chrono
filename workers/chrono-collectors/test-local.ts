/**
 * Local test runner for Chrono Collectors
 * Simulates Cloudflare Workers environment locally for testing
 * Run with: bun run test-local.ts
 */

import { CoinbaseAdapter } from './src/exchanges/coinbase';
import { BinanceAdapter } from './src/exchanges/binance';
import { KrakenAdapter } from './src/exchanges/kraken';
import { WebSocketManager } from './src/lib/websocket';
import { Logger } from './src/lib/logger';
import type { PriceFeed, ExchangeAdapter } from './src/types/index';

// Configuration
const CONFIG = {
  apiBaseUrl: process.env.API_BASE_URL || 'http://localhost:3000',
  apiKey: process.env.API_KEY || 'chrono_internal_dev_key_001',
  symbols: (process.env.SYMBOLS || 'BTC/USD,ETH/USD').split(','),
  batchSize: parseInt(process.env.BATCH_SIZE || '10'),
  batchIntervalMs: parseInt(process.env.BATCH_INTERVAL_MS || '5000'),
  maxReconnectAttempts: parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '10'),
};

// Test which exchange to run (default: all)
const EXCHANGE = process.env.EXCHANGE || 'all'; // coinbase, binance, kraken, or all

class LocalCollector {
  private feedBuffer: PriceFeed[] = [];
  private batchTimer: ReturnType<typeof setTimeout> | null = null;
  private stats = {
    feedsCollected: 0,
    batchesSent: 0,
  };

  constructor(
    private adapter: ExchangeAdapter,
    private logger: Logger,
    private config: typeof CONFIG
  ) {}

  async start() {
    this.logger.info('Starting local collector', {
      exchange: this.adapter.name,
      symbols: this.adapter.symbols,
      api_url: this.config.apiBaseUrl,
    });

    const wsManager = new WebSocketManager(
      this.adapter,
      this.logger,
      (feed: PriceFeed) => this.handlePriceFeed(feed),
      this.config.maxReconnectAttempts
    );

    await wsManager.connect();

    // Start batch timer
    this.scheduleBatchFlush();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      this.logger.info('Shutting down gracefully...');
      await this.flushBatch();
      wsManager.disconnect();
      process.exit(0);
    });
  }

  private handlePriceFeed(feed: PriceFeed) {
    this.feedBuffer.push(feed);
    this.stats.feedsCollected++;

    this.logger.debug('Price feed received', {
      symbol: feed.symbol,
      price: feed.price,
      buffer_size: this.feedBuffer.length,
    });

    // Flush if buffer is full
    if (this.feedBuffer.length >= this.config.batchSize) {
      this.flushBatch();
    }
  }

  private scheduleBatchFlush() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.flushBatch();
      this.scheduleBatchFlush(); // Reschedule
    }, this.config.batchIntervalMs);
  }

  private async flushBatch() {
    if (this.feedBuffer.length === 0) {
      return;
    }

    const feeds = [...this.feedBuffer];
    this.feedBuffer = [];

    this.logger.info('Sending batch to API', {
      count: feeds.length,
      url: `${this.config.apiBaseUrl}/internal/ingest`,
    });

    // Convert feeds to API format (price/volume as strings)
    const apiFeeds = feeds.map((feed) => ({
      ...feed,
      price: String(feed.price),
      volume: feed.volume !== undefined ? String(feed.volume) : undefined,
    }));

    const payload = {
      worker_id: this.adapter.workerId,
      timestamp: new Date().toISOString(),
      feeds: apiFeeds,
    };

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/internal/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error: ${response.status} - ${error}`);
      }

      const result = await response.json();
      this.stats.batchesSent++;

      this.logger.info('Batch sent successfully', {
        feeds_sent: feeds.length,
        response: result,
        total_feeds: this.stats.feedsCollected,
        total_batches: this.stats.batchesSent,
      });
    } catch (error) {
      this.logger.error('Failed to send batch', {
        error: String(error),
        feeds_count: feeds.length,
      });
      // Re-add feeds to buffer to retry
      this.feedBuffer.unshift(...feeds);
    }
  }
}

// Main execution
async function main() {
  console.log('🚀 Chrono Collectors - Local Test Runner\n');
  console.log('Configuration:');
  console.log(`  API URL: ${CONFIG.apiBaseUrl}`);
  console.log(`  Symbols: ${CONFIG.symbols.join(', ')}`);
  console.log(`  Batch Size: ${CONFIG.batchSize}`);
  console.log(`  Batch Interval: ${CONFIG.batchIntervalMs}ms`);
  console.log(`  Exchange: ${EXCHANGE}\n`);

  const collectors: LocalCollector[] = [];

  // Create collectors based on EXCHANGE env var
  if (EXCHANGE === 'all' || EXCHANGE === 'coinbase') {
    const workerId = 'local-coinbase';
    const logger = new Logger(workerId);
    const adapter = new CoinbaseAdapter(CONFIG.symbols, workerId);
    collectors.push(new LocalCollector(adapter, logger, CONFIG));
  }

  if (EXCHANGE === 'all' || EXCHANGE === 'binance') {
    const workerId = 'local-binance';
    const logger = new Logger(workerId);
    const adapter = new BinanceAdapter(CONFIG.symbols, workerId);
    collectors.push(new LocalCollector(adapter, logger, CONFIG));
  }

  if (EXCHANGE === 'all' || EXCHANGE === 'kraken') {
    const workerId = 'local-kraken';
    const logger = new Logger(workerId);
    const adapter = new KrakenAdapter(CONFIG.symbols, workerId);
    collectors.push(new LocalCollector(adapter, logger, CONFIG));
  }

  // Start all collectors
  await Promise.all(collectors.map((c) => c.start()));

  console.log(`\n✅ Started ${collectors.length} collector(s)`);
  console.log('Press Ctrl+C to stop\n');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

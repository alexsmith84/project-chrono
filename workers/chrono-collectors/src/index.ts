/**
 * Project Chrono - Exchange Data Collectors
 * Cloudflare Workers with Durable Objects for collecting real-time cryptocurrency prices
 */

import type { WorkerConfig, WorkerStatus, PriceFeed, IngestRequest, ExchangeAdapter } from './types/index';
import { Logger } from './lib/logger';
import { PriceBatcher } from './lib/batcher';
import { WebSocketManager } from './lib/websocket';
import { CoinbaseAdapter } from './exchanges/coinbase';
import { BinanceAdapter } from './exchanges/binance';
import { KrakenAdapter } from './exchanges/kraken';

/**
 * Durable Object for maintaining persistent WebSocket connections
 * Each instance manages a connection to a single exchange
 */
export class PriceCollector {
  private state: DurableObjectState;
  private config: WorkerConfig | null = null;
  private logger: Logger | null = null;
  private wsManager: WebSocketManager | null = null;
  private batcher: PriceBatcher | null = null;
  private adapter: ExchangeAdapter | null = null;
  private startTime: number = Date.now();

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
  }

  /**
   * Handle HTTP requests to the Durable Object
   * Endpoints:
   * - POST /start - Start collecting data
   * - POST /stop - Stop collecting data
   * - GET /status - Get current status
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    try {
      switch (url.pathname) {
        case '/start':
          return this.handleStart(request);
        case '/stop':
          return this.handleStop();
        case '/status':
          return this.handleStatus();
        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('Error handling request:', error);
      return new Response(JSON.stringify({ error: String(error) }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  /**
   * Start the price collector
   * Requires configuration in the request body
   */
  private async handleStart(request: Request): Promise<Response> {
    if (this.wsManager) {
      return new Response(
        JSON.stringify({ status: 'already_running', message: 'Collector already running' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse configuration from request body
    const config: WorkerConfig = await request.json();
    this.config = config;

    // Initialize logger
    this.logger = new Logger(config.workerId, 'info');
    this.logger.info('Starting price collector', {
      worker_id: config.workerId,
      batch_size: config.batchSize,
      batch_interval_ms: config.batchIntervalMs
    });

    // Initialize components
    await this.initialize();

    return new Response(
      JSON.stringify({ status: 'started', worker_id: config.workerId }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Stop the price collector
   */
  private async handleStop(): Promise<Response> {
    if (!this.wsManager) {
      return new Response(
        JSON.stringify({ status: 'not_running', message: 'Collector not running' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    this.logger?.info('Stopping price collector');

    // Flush any remaining feeds
    await this.batcher?.shutdown();

    // Disconnect WebSocket
    this.wsManager.disconnect();

    // Clean up
    this.wsManager = null;
    this.batcher = null;

    return new Response(
      JSON.stringify({ status: 'stopped' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  /**
   * Get current status
   */
  private async handleStatus(): Promise<Response> {
    if (!this.config || !this.wsManager) {
      return new Response(
        JSON.stringify({ status: 'not_running' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const wsStats = this.wsManager.getStats();
    const batcherStats = this.batcher?.getStats() || {
      current_batch_size: 0,
      feeds_collected: 0,
      batches_sent: 0
    };

    const status: WorkerStatus = {
      worker_id: this.config.workerId,
      state: wsStats.state,
      exchange: this.adapter?.name || 'unknown',
      symbols: this.adapter?.symbols || [],
      uptime_seconds: wsStats.uptime_seconds,
      reconnect_attempts: wsStats.reconnect_attempts,
      feeds_collected: batcherStats.feeds_collected,
      batches_sent: batcherStats.batches_sent
    };

    return new Response(JSON.stringify(status), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Initialize the collector components
   * Creates exchange adapter, batcher, and WebSocket manager
   */
  private async initialize(): Promise<void> {
    if (!this.config || !this.logger) {
      throw new Error('Config and logger must be initialized first');
    }

    // Create batcher
    this.batcher = new PriceBatcher(
      this.config,
      this.logger,
      (feeds: PriceFeed[]) => this.ingestBatch(feeds)
    );

    // Create exchange adapter based on worker ID
    // Worker ID format: "worker-{exchange}-{region}"
    // Example: "worker-coinbase-us-east", "worker-binance-global"
    const exchange = this.extractExchangeFromWorkerId(this.config.workerId);

    // Use symbols from config, or default to BTC/USD and ETH/USD
    const symbols = this.config.symbols || ['BTC/USD', 'ETH/USD'];

    this.logger.info('Initializing with symbols', { symbols, source: this.config.symbols ? 'config' : 'default' });

    this.adapter = this.createExchangeAdapter(exchange, symbols, this.config.workerId);
    this.logger.info('Created exchange adapter', {
      exchange: this.adapter.name,
      symbols: this.adapter.symbols,
      symbol_count: this.adapter.symbols.length
    });

    // Create WebSocket manager
    this.wsManager = new WebSocketManager(
      this.adapter,
      this.logger,
      (feed) => this.batcher!.add(feed),
      this.config.maxReconnectAttempts
    );

    // Connect to exchange
    await this.wsManager.connect();
    this.logger.info('Collector initialized and connected', {
      exchange: this.adapter.name,
      symbols: this.adapter.symbols
    });
  }

  /**
   * Extract exchange name from worker ID
   * Examples:
   * - "worker-coinbase-us-east" → "coinbase"
   * - "worker-binance-global" → "binance"
   * - "coinbase" → "coinbase"
   */
  private extractExchangeFromWorkerId(workerId: string): string {
    const parts = workerId.toLowerCase().split('-');

    // If worker ID format is "worker-{exchange}-{region}"
    if (parts.length >= 2 && parts[0] === 'worker') {
      return parts[1];
    }

    // Otherwise, assume the entire worker ID is the exchange name
    return parts[0];
  }

  /**
   * Create an exchange adapter based on exchange name
   */
  private createExchangeAdapter(
    exchange: string,
    symbols: string[],
    workerId: string
  ): ExchangeAdapter {
    switch (exchange.toLowerCase()) {
      case 'coinbase':
        return new CoinbaseAdapter(symbols, workerId);

      case 'binance':
        return new BinanceAdapter(symbols, workerId);

      case 'kraken':
        return new KrakenAdapter(symbols, workerId);

      default:
        throw new Error(`Unknown exchange: ${exchange}. Supported: coinbase, binance, kraken`);
    }
  }

  /**
   * Ingest a batch of price feeds to the API
   */
  private async ingestBatch(feeds: PriceFeed[]): Promise<void> {
    if (!this.config || !this.logger) {
      throw new Error('Config and logger must be initialized');
    }

    const request: IngestRequest = { feeds };

    this.logger.debug('Ingesting batch to API', {
      feed_count: feeds.length,
      api_url: this.config.apiBaseUrl
    });

    const response = await fetch(`${this.config.apiBaseUrl}/internal/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API ingestion failed: ${response.status} ${errorText}`);
    }

    const result = await response.json();
    this.logger.debug('Batch ingestion successful', { result });
  }
}

/**
 * Worker environment bindings
 */
export interface Env {
  // Durable Object namespace
  PRICE_COLLECTOR: DurableObjectNamespace;

  // Environment variables
  API_BASE_URL: string;
  API_KEY: string;
  WORKER_ID: string;
}

/**
 * Worker fetch handler
 * Routes requests to the appropriate Durable Object instance
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Get or create Durable Object instance
    // Use worker ID from environment or URL as the Durable Object ID
    const workerId = env.WORKER_ID || url.searchParams.get('worker_id') || 'default';
    const id = env.PRICE_COLLECTOR.idFromName(workerId);
    const stub = env.PRICE_COLLECTOR.get(id);

    // Forward request to Durable Object
    return stub.fetch(request);
  }
};

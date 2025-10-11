/**
 * Project Chrono - Exchange Data Collectors
 * Cloudflare Workers with Durable Objects for collecting real-time cryptocurrency prices
 */

import type { WorkerConfig, WorkerStatus, PriceFeed, IngestRequest } from './types/index';
import { Logger } from './lib/logger';
import { PriceBatcher } from './lib/batcher';
import { WebSocketManager } from './lib/websocket';

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
      exchange: 'unknown', // Will be set by exchange adapter in Phase 2
      symbols: [],
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
   * Creates batcher and WebSocket manager
   *
   * Note: Exchange adapter creation will be added in Phase 2
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

    // TODO: Phase 2 will add exchange adapter creation here
    // For now, we'll just log that initialization is complete
    this.logger.info('Collector initialized (Phase 1 - awaiting exchange adapters)');

    // TODO: Phase 2 will create WebSocketManager with exchange adapter
    // this.wsManager = new WebSocketManager(adapter, this.logger, ...);
    // await this.wsManager.connect();
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

/**
 * Type definitions for Chrono Collectors
 * Exchange data collection workers for Project Chrono
 */

/**
 * Normalized price feed format
 * This is the standard format that all exchanges normalize to before ingestion
 */
export interface PriceFeed {
  /** Symbol in normalized format (e.g., "BTC/USD") */
  symbol: string;

  /** Current price */
  price: number;

  /** 24h volume (optional) */
  volume?: number;

  /** ISO 8601 timestamp */
  timestamp: string;

  /** Exchange source identifier (e.g., "coinbase", "binance", "kraken") */
  source: string;

  /** Worker instance identifier for debugging */
  worker_id: string;

  /** Additional exchange-specific metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Ingest request format for the API
 * Matches the /internal/ingest endpoint schema
 */
export interface IngestRequest {
  feeds: PriceFeed[];
}

/**
 * Generic exchange message format
 * Exchanges send different formats, so this is a flexible type
 */
export type ExchangeMessage = Record<string, unknown> | unknown[];

/**
 * Worker configuration
 * Passed to the Durable Object to configure its behavior
 */
export interface WorkerConfig {
  /** Worker instance ID (e.g., "worker-coinbase-us-east") */
  workerId: string;

  /** Base URL of the Project Chrono API */
  apiBaseUrl: string;

  /** Internal API key for authentication */
  apiKey: string;

  /** Batch size threshold (number of feeds) */
  batchSize: number;

  /** Batch interval threshold (milliseconds) */
  batchIntervalMs: number;

  /** Maximum reconnection attempts before giving up */
  maxReconnectAttempts: number;

  /**
   * Symbols to collect (e.g., ["BTC/USD", "ETH/USD", "SOL/USD"])
   * Optional: defaults to ["BTC/USD", "ETH/USD"] if not specified
   */
  symbols?: string[];
}

/**
 * Exchange adapter interface
 * Each exchange implements this to provide normalized data
 */
export interface ExchangeAdapter {
  /** Exchange name (e.g., "coinbase") */
  name: string;

  /** WebSocket URL */
  wsUrl: string;

  /** Symbols to subscribe to (e.g., ["BTC/USD", "ETH/USD"]) */
  symbols: string[];

  /** Worker ID for logging */
  workerId: string;

  /**
   * Generate the subscription message for this exchange
   * Each exchange has a different format for subscribing to ticker data
   */
  getSubscribeMessage(): string;

  /**
   * Parse and normalize an exchange message
   * Returns null if the message should be ignored
   */
  parseMessage(msg: ExchangeMessage): PriceFeed | null;

  /**
   * Normalize a symbol from exchange format to standard format
   * e.g., "BTC-USD" → "BTC/USD", "BTCUSDT" → "BTC/USD"
   */
  normalizeSymbol(symbol: string): string;
}

/**
 * Log levels for structured logging
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  timestamp: string;
  worker_id: string;
  message: string;
  data?: unknown;
}

/**
 * WebSocket connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'failed';

/**
 * Status response from the worker
 */
export interface WorkerStatus {
  worker_id: string;
  state: ConnectionState;
  exchange: string;
  symbols: string[];
  uptime_seconds: number;
  reconnect_attempts: number;
  feeds_collected: number;
  batches_sent: number;
  last_error?: string;
}

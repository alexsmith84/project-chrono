# CHRONO-011 Implementation Guide

**Cloudflare Workers for Exchange Data Collection**

This guide provides step-by-step instructions for implementing the exchange data collection workers.

---

## Overview

**Total Supply**: 8 (split into 3 phases)
- Phase 1: Foundation (3 supply)
- Phase 2: Exchange Implementations (3 supply)
- Phase 3: Production Ready (2 supply)

**Estimated Time**: 2-3 sessions (16-24 hours)

---

## Prerequisites

### 1. Cloudflare Account Setup

```bash
# Create free Cloudflare account
# Visit: https://dash.cloudflare.com/sign-up

# Install Wrangler CLI
npm install -g wrangler

# Authenticate
wrangler login

# Verify authentication
wrangler whoami
```

### 2. Project Setup

```bash
# Create workers directory
mkdir -p workers/chrono-collectors
cd workers/chrono-collectors

# Initialize project
npm init -y

# Install dependencies
npm install -D wrangler typescript @cloudflare/workers-types
npm install itty-router

# Initialize TypeScript
npx tsc --init
```

### 3. Exchange API Access

No API keys needed! All exchanges support public WebSocket feeds.

**Test access**:
```bash
# Test Coinbase WebSocket
wscat -c wss://ws-feed.exchange.coinbase.com

# Send subscription
{"type":"subscribe","product_ids":["BTC-USD"],"channels":["ticker"]}
```

---

## Phase 1: Foundation (Supply: 3)

### Step 1.1: Project Structure

```bash
# Create directory structure
mkdir -p src/{exchanges,lib,types}
touch src/index.ts
touch src/lib/{websocket,batcher,normalizer,logger}.ts
touch src/types/index.ts
touch wrangler.toml
```

**Expected structure**:
```
workers/chrono-collectors/
├── src/
│   ├── index.ts           # Worker entry point
│   ├── types/
│   │   └── index.ts       # TypeScript interfaces
│   ├── lib/
│   │   ├── websocket.ts   # WebSocket manager
│   │   ├── batcher.ts     # Batch accumulator
│   │   ├── normalizer.ts  # Data normalization
│   │   └── logger.ts      # Logging utilities
│   └── exchanges/
│       ├── coinbase.ts    # (Phase 2)
│       ├── binance.ts     # (Phase 2)
│       └── kraken.ts      # (Phase 2)
├── wrangler.toml
├── package.json
└── tsconfig.json
```

### Step 1.2: Type Definitions

**File**: `src/types/index.ts`

```typescript
/**
 * Normalized price feed format for API ingestion
 */
export interface PriceFeed {
  symbol: string;          // "BTC/USD"
  price: number;           // 45123.50
  volume?: number;         // 24h volume
  timestamp: string;       // ISO 8601
  source: string;          // "coinbase"
  worker_id: string;       // "worker-coinbase"
  metadata?: Record<string, unknown>;
}

/**
 * Batch ingestion request
 */
export interface IngestRequest {
  feeds: PriceFeed[];
}

/**
 * Exchange WebSocket message (raw)
 */
export interface ExchangeMessage {
  [key: string]: unknown;
}

/**
 * Worker configuration
 */
export interface WorkerConfig {
  apiBaseUrl: string;
  apiKey: string;
  workerId: string;
  symbols: string[];
  batchSize: number;
  batchIntervalMs: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Exchange adapter interface
 */
export interface ExchangeAdapter {
  name: string;
  wsUrl: string;
  symbols: string[];

  // Generate subscription message
  getSubscribeMessage(): string;

  // Parse incoming message
  parseMessage(msg: ExchangeMessage): PriceFeed | null;

  // Normalize symbol (e.g., "BTC-USD" → "BTC/USD")
  normalizeSymbol(symbol: string): string;
}
```

### Step 1.3: Configuration

**File**: `wrangler.toml`

```toml
name = "chrono-coinbase-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[durable_objects]
bindings = [
  { name = "PRICE_COLLECTOR", class_name = "PriceCollector" }
]

[[migrations]]
tag = "v1"
new_classes = ["PriceCollector"]

[vars]
API_BASE_URL = "http://localhost:3000"  # Change in production
WORKER_ID = "worker-coinbase-dev"
SYMBOLS = "BTC/USD,ETH/USD,XRP/USD,ADA/USD,SOL/USD"
BATCH_SIZE = "100"
BATCH_INTERVAL_MS = "5000"
LOG_LEVEL = "info"

# Secrets (use: wrangler secret put API_KEY)
# API_KEY = "chrono_internal_dev_key_001"
```

### Step 1.4: Logger Utility

**File**: `src/lib/logger.ts`

```typescript
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  constructor(
    private workerId: string,
    private level: LogLevel = 'info'
  ) {}

  private shouldLog(level: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(level) >= levels.indexOf(this.level);
  }

  private log(level: LogLevel, message: string, data?: unknown) {
    if (!this.shouldLog(level)) return;

    const entry = {
      level,
      timestamp: new Date().toISOString(),
      worker_id: this.workerId,
      message,
      ...(data && { data })
    };

    console.log(JSON.stringify(entry));
  }

  debug(message: string, data?: unknown) {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown) {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown) {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown) {
    this.log('error', message, data);
  }
}
```

### Step 1.5: Batcher Implementation

**File**: `src/lib/batcher.ts`

```typescript
import type { PriceFeed, IngestRequest, WorkerConfig } from '../types';
import { Logger } from './logger';

export class PriceBatcher {
  private batch: PriceFeed[] = [];
  private timer: number | null = null;
  private logger: Logger;

  constructor(
    private config: WorkerConfig,
    private onFlush: (feeds: PriceFeed[]) => Promise<void>
  ) {
    this.logger = new Logger(config.workerId, config.logLevel);
  }

  /**
   * Add price feed to batch
   */
  add(feed: PriceFeed) {
    this.batch.push(feed);
    this.logger.debug('Price added to batch', {
      symbol: feed.symbol,
      price: feed.price,
      batch_size: this.batch.length
    });

    // Start timer if not already running
    if (!this.timer) {
      this.timer = setTimeout(
        () => this.flush(),
        this.config.batchIntervalMs
      ) as unknown as number;
    }

    // Flush if batch is full
    if (this.batch.length >= this.config.batchSize) {
      this.flush();
    }
  }

  /**
   * Flush batch to API
   */
  async flush() {
    if (this.batch.length === 0) return;

    const feeds = this.batch;
    this.batch = [];

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.logger.info('Flushing batch', { count: feeds.length });

    try {
      await this.onFlush(feeds);
      this.logger.info('Batch flushed successfully', { count: feeds.length });
    } catch (error) {
      this.logger.error('Batch flush failed', {
        error: error instanceof Error ? error.message : String(error),
        count: feeds.length
      });

      // TODO: Implement retry logic
      throw error;
    }
  }

  /**
   * Get current batch size
   */
  size(): number {
    return this.batch.length;
  }
}
```

### Step 1.6: WebSocket Manager

**File**: `src/lib/websocket.ts`

```typescript
import type { ExchangeAdapter, PriceFeed } from '../types';
import { Logger } from './logger';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectDelay = 60000; // 60 seconds
  private isIntentionallyClosed = false;
  private logger: Logger;

  constructor(
    private adapter: ExchangeAdapter,
    private onMessage: (feed: PriceFeed) => void,
    workerId: string,
    logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info'
  ) {
    this.logger = new Logger(workerId, logLevel);
  }

  /**
   * Connect to exchange WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.logger.warn('WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    this.logger.info('Connecting to WebSocket', {
      exchange: this.adapter.name,
      url: this.adapter.wsUrl
    });

    try {
      this.ws = new WebSocket(this.adapter.wsUrl);

      this.ws.addEventListener('open', () => this.handleOpen());
      this.ws.addEventListener('message', (event) => this.handleMessage(event));
      this.ws.addEventListener('close', (event) => this.handleClose(event));
      this.ws.addEventListener('error', (event) => this.handleError(event));
    } catch (error) {
      this.logger.error('Failed to create WebSocket', { error });
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket open event
   */
  private handleOpen() {
    this.logger.info('WebSocket connected', {
      exchange: this.adapter.name
    });

    this.reconnectAttempts = 0;

    // Send subscription message
    const subscribeMsg = this.adapter.getSubscribeMessage();
    this.ws?.send(subscribeMsg);

    this.logger.info('Sent subscription', {
      exchange: this.adapter.name,
      symbols: this.adapter.symbols
    });
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(event: MessageEvent) {
    try {
      const data = JSON.parse(event.data as string);

      // Parse message using exchange adapter
      const feed = this.adapter.parseMessage(data);

      if (feed) {
        this.onMessage(feed);
      }
    } catch (error) {
      this.logger.error('Failed to parse message', {
        error: error instanceof Error ? error.message : String(error),
        data: event.data
      });
    }
  }

  /**
   * Handle WebSocket close event
   */
  private handleClose(event: CloseEvent) {
    this.logger.warn('WebSocket closed', {
      code: event.code,
      reason: event.reason,
      wasClean: event.wasClean
    });

    if (!this.isIntentionallyClosed) {
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event) {
    this.logger.error('WebSocket error', { event });
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect() {
    this.reconnectAttempts++;

    // Exponential backoff: 1s, 2s, 4s, 8s, ..., up to 60s
    const delay = Math.min(
      1000 * Math.pow(2, this.reconnectAttempts - 1),
      this.maxReconnectDelay
    );

    this.logger.info('Scheduling reconnect', {
      attempt: this.reconnectAttempts,
      delay_ms: delay
    });

    setTimeout(() => this.connect(), delay);
  }

  /**
   * Disconnect WebSocket
   */
  disconnect() {
    this.isIntentionallyClosed = true;
    this.ws?.close();
    this.ws = null;

    this.logger.info('WebSocket disconnected');
  }

  /**
   * Check if WebSocket is connected
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}
```

### Step 1.7: Durable Object (State Management)

**File**: `src/index.ts`

```typescript
import { PriceBatcher } from './lib/batcher';
import { WebSocketManager } from './lib/websocket';
import { Logger } from './lib/logger';
import type { WorkerConfig, PriceFeed, IngestRequest } from './types';

/**
 * Durable Object for persistent WebSocket connection
 */
export class PriceCollector {
  private wsManager: WebSocketManager | null = null;
  private batcher: PriceBatcher | null = null;
  private config: WorkerConfig | null = null;
  private logger: Logger | null = null;

  constructor(
    private state: DurableObjectState,
    private env: Env
  ) {}

  /**
   * Handle HTTP requests to Durable Object
   */
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    // Initialize if needed
    if (!this.config) {
      await this.initialize();
    }

    // Handle commands
    switch (url.pathname) {
      case '/start':
        return this.handleStart();
      case '/stop':
        return this.handleStop();
      case '/status':
        return this.handleStatus();
      default:
        return new Response('Not Found', { status: 404 });
    }
  }

  /**
   * Initialize worker configuration and components
   */
  private async initialize() {
    this.config = {
      apiBaseUrl: this.env.API_BASE_URL,
      apiKey: this.env.API_KEY,
      workerId: this.env.WORKER_ID,
      symbols: this.env.SYMBOLS.split(','),
      batchSize: parseInt(this.env.BATCH_SIZE || '100'),
      batchIntervalMs: parseInt(this.env.BATCH_INTERVAL_MS || '5000'),
      logLevel: (this.env.LOG_LEVEL || 'info') as any
    };

    this.logger = new Logger(this.config.workerId, this.config.logLevel);
    this.logger.info('Worker initialized', { config: this.config });

    // Initialize batcher
    this.batcher = new PriceBatcher(
      this.config,
      (feeds) => this.ingestBatch(feeds)
    );

    // WebSocket manager will be created in handleStart()
  }

  /**
   * Start WebSocket connection
   */
  private async handleStart(): Promise<Response> {
    if (!this.config) {
      return new Response('Not initialized', { status: 500 });
    }

    if (this.wsManager?.isConnected()) {
      return new Response('Already started', { status: 200 });
    }

    // Exchange adapter will be implemented in Phase 2
    // For now, return placeholder
    return new Response('Exchange adapter not implemented yet', {
      status: 501
    });
  }

  /**
   * Stop WebSocket connection
   */
  private async handleStop(): Promise<Response> {
    this.wsManager?.disconnect();
    await this.batcher?.flush();

    return new Response('Stopped', { status: 200 });
  }

  /**
   * Get worker status
   */
  private async handleStatus(): Promise<Response> {
    const status = {
      connected: this.wsManager?.isConnected() || false,
      batch_size: this.batcher?.size() || 0,
      config: this.config
    };

    return new Response(JSON.stringify(status), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  /**
   * Ingest batch of price feeds to API
   */
  private async ingestBatch(feeds: PriceFeed[]): Promise<void> {
    if (!this.config) throw new Error('Not initialized');

    const request: IngestRequest = { feeds };
    const startTime = Date.now();

    try {
      const response = await fetch(`${this.config.apiBaseUrl}/internal/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify(request)
      });

      const duration = Date.now() - startTime;

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`API error ${response.status}: ${error}`);
      }

      this.logger?.info('Batch ingested successfully', {
        count: feeds.length,
        duration_ms: duration
      });
    } catch (error) {
      this.logger?.error('Batch ingestion failed', {
        error: error instanceof Error ? error.message : String(error),
        count: feeds.length
      });
      throw error;
    }
  }
}

/**
 * Worker entrypoint for HTTP requests
 */
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Get or create Durable Object instance
    const id = env.PRICE_COLLECTOR.idFromName('singleton');
    const stub = env.PRICE_COLLECTOR.get(id);

    // Forward request to Durable Object
    return stub.fetch(request);
  }
};

/**
 * Environment bindings
 */
interface Env {
  PRICE_COLLECTOR: DurableObjectNamespace;
  API_BASE_URL: string;
  API_KEY: string;
  WORKER_ID: string;
  SYMBOLS: string;
  BATCH_SIZE: string;
  BATCH_INTERVAL_MS: string;
  LOG_LEVEL: string;
}
```

### Step 1.8: Test Phase 1

```bash
# Set API key as secret
echo "chrono_internal_dev_key_001" | wrangler secret put API_KEY

# Run local development server
wrangler dev

# In another terminal, test endpoints
curl http://localhost:8787/status
curl -X POST http://localhost:8787/start
curl http://localhost:8787/status
curl -X POST http://localhost:8787/stop
```

**Expected output**: Worker should start but not connect yet (Phase 2)

---

## Phase 2: Exchange Implementations (Supply: 3)

### Step 2.1: Coinbase Adapter

**File**: `src/exchanges/coinbase.ts`

```typescript
import type { ExchangeAdapter, ExchangeMessage, PriceFeed } from '../types';

export class CoinbaseAdapter implements ExchangeAdapter {
  name = 'coinbase';
  wsUrl = 'wss://ws-feed.exchange.coinbase.com';

  constructor(public symbols: string[], private workerId: string) {}

  getSubscribeMessage(): string {
    // Convert BTC/USD → BTC-USD for Coinbase
    const productIds = this.symbols.map(s => s.replace('/', '-'));

    return JSON.stringify({
      type: 'subscribe',
      product_ids: productIds,
      channels: ['ticker']
    });
  }

  parseMessage(msg: ExchangeMessage): PriceFeed | null {
    // Only process ticker messages
    if (msg.type !== 'ticker') return null;

    const symbol = this.normalizeSymbol(msg.product_id as string);
    const price = parseFloat(msg.price as string);
    const volume = parseFloat(msg.volume_24h as string);

    if (isNaN(price) || price <= 0) {
      return null;
    }

    return {
      symbol,
      price,
      volume: isNaN(volume) ? undefined : volume,
      timestamp: new Date(msg.time as string).toISOString(),
      source: this.name,
      worker_id: this.workerId,
      metadata: {
        bid: msg.best_bid ? parseFloat(msg.best_bid as string) : undefined,
        ask: msg.best_ask ? parseFloat(msg.best_ask as string) : undefined
      }
    };
  }

  normalizeSymbol(symbol: string): string {
    // BTC-USD → BTC/USD
    return symbol.replace('-', '/');
  }
}
```

### Step 2.2: Binance Adapter

**File**: `src/exchanges/binance.ts`

```typescript
import type { ExchangeAdapter, ExchangeMessage, PriceFeed } from '../types';

export class BinanceAdapter implements ExchangeAdapter {
  name = 'binance';
  wsUrl: string;

  constructor(public symbols: string[], private workerId: string) {
    // Binance uses stream names in URL
    const streams = this.symbols
      .map(s => this.toStreamName(s))
      .join('/');

    this.wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
  }

  private toStreamName(symbol: string): string {
    // BTC/USD → btcusdt@ticker
    return symbol.replace('/', '').toLowerCase() + '@ticker';
  }

  getSubscribeMessage(): string {
    // Binance doesn't need subscription message (streams in URL)
    return '';
  }

  parseMessage(msg: ExchangeMessage): PriceFeed | null {
    // Binance wraps messages in { stream, data }
    const data = msg.data as ExchangeMessage;
    if (!data || data.e !== '24hrTicker') return null;

    const symbol = this.normalizeSymbol(data.s as string);
    const price = parseFloat(data.c as string);
    const volume = parseFloat(data.v as string);

    if (isNaN(price) || price <= 0) {
      return null;
    }

    return {
      symbol,
      price,
      volume: isNaN(volume) ? undefined : volume,
      timestamp: new Date(data.E as number).toISOString(),
      source: this.name,
      worker_id: this.workerId,
      metadata: {
        price_change: parseFloat(data.p as string),
        price_change_percent: parseFloat(data.P as string)
      }
    };
  }

  normalizeSymbol(symbol: string): string {
    // BTCUSDT → BTC/USD
    return symbol.replace(/USDT$/, '/USD').replace(/BUSD$/, '/USD');
  }
}
```

### Step 2.3: Kraken Adapter

**File**: `src/exchanges/kraken.ts`

```typescript
import type { ExchangeAdapter, ExchangeMessage, PriceFeed } from '../types';

export class KrakenAdapter implements ExchangeAdapter {
  name = 'kraken';
  wsUrl = 'wss://ws.kraken.com';

  constructor(public symbols: string[], private workerId: string) {}

  getSubscribeMessage(): string {
    // Convert BTC/USD → XBT/USD (Kraken uses XBT)
    const pairs = this.symbols.map(s =>
      s === 'BTC/USD' ? 'XBT/USD' : s
    );

    return JSON.stringify({
      event: 'subscribe',
      pair: pairs,
      subscription: { name: 'ticker' }
    });
  }

  parseMessage(msg: ExchangeMessage): PriceFeed | null {
    // Kraken uses array format for ticker updates
    if (!Array.isArray(msg) || msg[2] !== 'ticker') return null;

    const data = msg[1] as any;
    const pair = msg[3] as string;
    const symbol = this.normalizeSymbol(pair);

    // Kraken ticker has: [a, b, c, v, p, t, l, h, o]
    // c = last trade closed: [price, lot volume]
    const price = parseFloat(data.c[0]);
    const volume = parseFloat(data.v[1]); // 24h volume

    if (isNaN(price) || price <= 0) {
      return null;
    }

    return {
      symbol,
      price,
      volume: isNaN(volume) ? undefined : volume,
      timestamp: new Date().toISOString(),
      source: this.name,
      worker_id: this.workerId,
      metadata: {
        bid: parseFloat(data.b[0]),
        ask: parseFloat(data.a[0]),
        high_24h: parseFloat(data.h[1]),
        low_24h: parseFloat(data.l[1])
      }
    };
  }

  normalizeSymbol(symbol: string): string {
    // XBT/USD → BTC/USD
    return symbol.replace('XBT/', 'BTC/');
  }
}
```

### Step 2.4: Update Durable Object to Use Adapters

**File**: `src/index.ts` (update `handleStart` method)

```typescript
import { CoinbaseAdapter } from './exchanges/coinbase';
import { BinanceAdapter } from './exchanges/binance';
import { KrakenAdapter } from './exchanges/kraken';

// ... existing code ...

/**
 * Start WebSocket connection
 */
private async handleStart(): Promise<Response> {
  if (!this.config) {
    return new Response('Not initialized', { status: 500 });
  }

  if (this.wsManager?.isConnected()) {
    return new Response('Already started', { status: 200 });
  }

  // Create exchange adapter based on worker ID
  let adapter;
  if (this.config.workerId.includes('coinbase')) {
    adapter = new CoinbaseAdapter(this.config.symbols, this.config.workerId);
  } else if (this.config.workerId.includes('binance')) {
    adapter = new BinanceAdapter(this.config.symbols, this.config.workerId);
  } else if (this.config.workerId.includes('kraken')) {
    adapter = new KrakenAdapter(this.config.symbols, this.config.workerId);
  } else {
    return new Response('Unknown exchange', { status: 400 });
  }

  // Create WebSocket manager
  this.wsManager = new WebSocketManager(
    adapter,
    (feed) => this.batcher?.add(feed),
    this.config.workerId,
    this.config.logLevel
  );

  // Connect
  await this.wsManager.connect();

  return new Response('Started', { status: 200 });
}
```

### Step 2.5: Test Phase 2

```bash
# Test with local API
# First, start your API server in another terminal
cd apps/api
bun run dev

# Run worker
cd workers/chrono-collectors
wrangler dev

# Start worker
curl -X POST http://localhost:8787/start

# Check status (should show connected: true)
curl http://localhost:8787/status

# Monitor logs - you should see price updates!
wrangler tail --format pretty

# Check database for ingested data
psql project_chrono_dev -c "SELECT symbol, price, timestamp, source FROM price_feeds ORDER BY timestamp DESC LIMIT 10;"
```

---

## Phase 3: Production Ready (Supply: 2)

### Step 3.1: Enhanced Error Handling

Add retry logic to `batcher.ts`:

```typescript
/**
 * Flush batch with retry logic
 */
async flush() {
  if (this.batch.length === 0) return;

  const feeds = this.batch;
  this.batch = [];

  if (this.timer) {
    clearTimeout(this.timer);
    this.timer = null;
  }

  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      await this.onFlush(feeds);
      this.logger.info('Batch flushed successfully', {
        count: feeds.length,
        attempt: attempt + 1
      });
      return; // Success!
    } catch (error) {
      attempt++;

      if (attempt >= maxRetries) {
        this.logger.error('Batch flush failed after retries', {
          error: error instanceof Error ? error.message : String(error),
          count: feeds.length,
          attempts: maxRetries
        });
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = 1000 * Math.pow(2, attempt - 1);
      this.logger.warn('Retrying batch flush', {
        attempt,
        delay_ms: delay
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### Step 3.2: Create Deployment Scripts

**File**: `scripts/deploy.sh`

```bash
#!/bin/bash
# Deploy workers to Cloudflare

set -e

ENV=${1:-production}

echo "🚀 Deploying to $ENV environment..."

# Deploy Coinbase worker
echo "📦 Deploying Coinbase worker..."
wrangler deploy --env $ENV --name chrono-coinbase-worker

# Deploy Binance worker
echo "📦 Deploying Binance worker..."
wrangler deploy --env $ENV --name chrono-binance-worker

# Deploy Kraken worker
echo "📦 Deploying Kraken worker..."
wrangler deploy --env $ENV --name chrono-kraken-worker

echo "✅ All workers deployed!"
echo ""
echo "Next steps:"
echo "  1. Start workers: ./scripts/start-workers.sh $ENV"
echo "  2. Monitor logs: wrangler tail --env $ENV"
echo "  3. Check status: ./scripts/check-workers.sh $ENV"
```

**File**: `scripts/start-workers.sh`

```bash
#!/bin/bash
# Start all workers

set -e

ENV=${1:-production}
WORKERS=("coinbase" "binance" "kraken")

for worker in "${WORKERS[@]}"; do
  echo "▶️  Starting $worker worker..."

  URL="https://chrono-${worker}-worker.alexsmith84.workers.dev/start"

  RESPONSE=$(curl -s -X POST $URL)
  echo "   Response: $RESPONSE"
done

echo "✅ All workers started!"
```

**File**: `scripts/check-workers.sh`

```bash
#!/bin/bash
# Check status of all workers

set -e

ENV=${1:-production}
WORKERS=("coinbase" "binance" "kraken")

echo "📊 Worker Status:"
echo ""

for worker in "${WORKERS[@]}"; do
  echo "🔍 $worker:"

  URL="https://chrono-${worker}-worker.alexsmith84.workers.dev/status"

  curl -s $URL | jq '.'
  echo ""
done
```

Make scripts executable:
```bash
chmod +x scripts/*.sh
```

### Step 3.3: Update wrangler.toml for Multiple Workers

```toml
# Coinbase Worker
[env.production]
name = "chrono-coinbase-worker"
vars = { WORKER_ID = "worker-coinbase-prod", API_BASE_URL = "https://api.chrono.dev" }

[env.staging]
name = "chrono-coinbase-worker-staging"
vars = { WORKER_ID = "worker-coinbase-staging", API_BASE_URL = "https://api-staging.chrono.dev" }

# Add similar sections for Binance and Kraken...
```

### Step 3.4: Monitoring Dashboard

Create simple status page:

**File**: `src/status.html` (served via worker)

```html
<!DOCTYPE html>
<html>
<head>
  <title>Chrono Workers Status</title>
  <script>
    async function fetchStatus() {
      const workers = ['coinbase', 'binance', 'kraken'];
      const results = await Promise.all(
        workers.map(w =>
          fetch(`https://chrono-${w}-worker.alexsmith84.workers.dev/status`)
            .then(r => r.json())
        )
      );

      document.getElementById('status').innerHTML = results
        .map((s, i) => `
          <div>
            <h2>${workers[i]}</h2>
            <pre>${JSON.stringify(s, null, 2)}</pre>
          </div>
        `).join('');
    }

    setInterval(fetchStatus, 5000);
    fetchStatus();
  </script>
</head>
<body>
  <h1>Chrono Workers Status</h1>
  <div id="status">Loading...</div>
</body>
</html>
```

### Step 3.5: Documentation

**File**: `workers/chrono-collectors/README.md`

```markdown
# Chrono Price Collectors

Cloudflare Workers that collect real-time cryptocurrency prices.

## Quick Start

\`\`\`bash
# Install dependencies
npm install

# Set API key
echo "chrono_internal_prod_key_001" | wrangler secret put API_KEY

# Deploy
./scripts/deploy.sh production

# Start workers
./scripts/start-workers.sh production

# Check status
./scripts/check-workers.sh production
\`\`\`

## Development

\`\`\`bash
# Run locally
wrangler dev

# Test
npm test

# View logs
wrangler tail
\`\`\`

## Architecture

See: ../../docs/specs/CHRONO-011-workers.md
```

### Step 3.6: Final Testing

```bash
# Deploy to production
./scripts/deploy.sh production

# Start all workers
./scripts/start-workers.sh production

# Monitor for 5 minutes
wrangler tail --env production --format pretty

# Check database
psql project_chrono_prod -c "
  SELECT source, COUNT(*), MAX(timestamp)
  FROM price_feeds
  WHERE timestamp > NOW() - INTERVAL '5 minutes'
  GROUP BY source;
"

# Expected: 100+ feeds per exchange
```

---

## Validation Checklist

- [ ] All 3 workers deployed to Cloudflare
- [ ] WebSocket connections established
- [ ] Price data flowing into database
- [ ] Batch ingestion working (5 second intervals)
- [ ] Error handling and reconnection tested
- [ ] Monitoring dashboard accessible
- [ ] Deployment scripts working
- [ ] Documentation complete

---

## Troubleshooting

### Worker won't connect

```bash
# Check logs
wrangler tail --format pretty

# Verify API key
wrangler secret list

# Test WebSocket manually
wscat -c wss://ws-feed.exchange.coinbase.com
```

### No data in database

```bash
# Check API is receiving requests
# In API logs, look for POST /internal/ingest

# Verify API key has correct permissions
psql -c "SELECT * FROM api_keys WHERE key = 'chrono_internal_prod_key_001';"

# Check worker status
curl https://chrono-coinbase-worker.alexsmith84.workers.dev/status
```

### High error rate

```bash
# Check API health
curl https://api.chrono.dev/health

# Monitor worker logs for specific errors
wrangler tail --format pretty | grep ERROR

# Reduce batch size if overwhelmed
# Update BATCH_SIZE in wrangler.toml
```

---

## Success Criteria

✅ **Phase 1 Complete**: Foundation built, workers can start/stop
✅ **Phase 2 Complete**: All 3 exchanges streaming data
✅ **Phase 3 Complete**: Production deployed, monitoring active

**Final Test**: Database should show steady stream of price updates:

```sql
SELECT
  source,
  COUNT(*) as updates,
  COUNT(DISTINCT symbol) as symbols,
  MAX(timestamp) as last_update
FROM price_feeds
WHERE timestamp > NOW() - INTERVAL '10 minutes'
GROUP BY source;
```

Expected output:
```
 source   | updates | symbols | last_update
----------+---------+---------+------------------------
 coinbase |   1200  |    5    | 2025-10-11 12:34:56
 binance  |   1200  |    5    | 2025-10-11 12:34:55
 kraken   |   1200  |    5    | 2025-10-11 12:34:57
```

**Congratulations! The data is flowing! 🎉**

---

*"The collectors gather. The data flows. The oracle awakens!"*

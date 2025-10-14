# Chrono Collectors

Cloudflare Workers for collecting real-time cryptocurrency price data from exchanges.

## Overview

This project implements distributed data collectors using Cloudflare Workers and Durable Objects to maintain persistent WebSocket connections to cryptocurrency exchanges and ingest normalized price data into the Project Chrono API.

## Architecture

```
Exchanges (Coinbase, Binance, Kraken)
    ↓ WebSocket price updates
Cloudflare Workers (Edge Network)
    • Parse, Normalize, Batch
    ↓ HTTP POST batches
Project Chrono API (/internal/ingest)
    ↓
PostgreSQL + TimescaleDB
```

## Project Structure

```
workers/chrono-collectors/
├── src/
│   ├── index.ts              # Main worker and Durable Object
│   ├── types/
│   │   └── index.ts          # TypeScript type definitions
│   ├── lib/
│   │   ├── logger.ts         # Structured logging utility
│   │   ├── batcher.ts        # Price feed batching
│   │   └── websocket.ts      # WebSocket manager with reconnection
│   └── exchanges/            # Exchange adapters (Phase 2)
│       ├── coinbase.ts
│       ├── binance.ts
│       └── kraken.ts
├── wrangler.toml             # Cloudflare Workers configuration
├── package.json
├── tsconfig.json
└── README.md
```

## Implementation Status

### ✅ Phase 1: Foundation (COMPLETE)

- [x] Project structure and configuration
- [x] Type definitions
- [x] Logger utility with structured logging
- [x] PriceBatcher with time/count-based flushing
- [x] WebSocketManager with auto-reconnection
- [x] Durable Object with HTTP endpoints
- [x] API ingestion with retry logic

### ✅ Phase 2: Exchange Implementations (COMPLETE)

- [x] Coinbase adapter (ticker channel, BTC-USD format)
- [x] Binance adapter (stream-based, BTCUSDT format)
- [x] Kraken adapter (array messages, XBT/USD format)
- [x] Symbol normalization across exchanges
- [x] Exchange-specific metadata preservation

### ✅ Phase 3: Production Ready (COMPLETE)

- [x] Configurable symbol lists per worker
- [x] Deployment scripts (deploy, start, stop, check)
- [x] Multi-worker orchestration
- [x] Enhanced logging and monitoring
- [x] Complete documentation
- [x] DEX considerations and future roadmap

## Prerequisites

1. **Cloudflare Account**: Sign up at https://dash.cloudflare.com
2. **Wrangler CLI**: Install via `npm install -g wrangler`
3. **Node.js**: Version 18+ recommended

## Setup

### 1. Install Dependencies

```bash
cd workers/chrono-collectors
npm install
```

### 2. Authenticate with Cloudflare

```bash
wrangler login
```

### 3. Set Secrets

Development:
```bash
wrangler secret put API_KEY --env dev
# Enter: chrono_internal_dev_key_001
```

Production:
```bash
wrangler secret put API_KEY --env production
# Enter: your-production-api-key
```

### 4. Run Locally

```bash
npm run dev
```

## API Endpoints

The Durable Object exposes three HTTP endpoints:

### POST /start

Start the price collector.

**Request Body:**
```json
{
  "workerId": "worker-coinbase-us-east",
  "apiBaseUrl": "http://localhost:3000",
  "apiKey": "chrono_internal_dev_key_001",
  "batchSize": 100,
  "batchIntervalMs": 5000,
  "maxReconnectAttempts": 10,
  "symbols": ["BTC/USD", "ETH/USD", "SOL/USD"]
}
```

**Note**: `symbols` is optional. Defaults to `["BTC/USD", "ETH/USD"]` if not provided.

**Response:**
```json
{
  "status": "started",
  "worker_id": "worker-coinbase-us-east"
}
```

### POST /stop

Stop the price collector and flush remaining data.

**Response:**
```json
{
  "status": "stopped"
}
```

### GET /status

Get current collector status.

**Response:**
```json
{
  "worker_id": "worker-coinbase-us-east",
  "state": "connected",
  "exchange": "coinbase",
  "symbols": ["BTC/USD", "ETH/USD"],
  "uptime_seconds": 3600,
  "reconnect_attempts": 0,
  "feeds_collected": 12543,
  "batches_sent": 126
}
```

## Testing (Phase 1)

### Start Worker Locally

```bash
# Terminal 1: Start API server
cd apps/api
bun run dev

# Terminal 2: Start worker
cd workers/chrono-collectors
npm run dev
```

### Test Durable Object

```bash
# Start collector
curl -X POST http://localhost:8787/start \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "test-worker",
    "apiBaseUrl": "http://localhost:3000",
    "apiKey": "chrono_internal_dev_key_001",
    "batchSize": 10,
    "batchIntervalMs": 5000,
    "maxReconnectAttempts": 5
  }'

# Check status
curl http://localhost:8787/status

# Stop collector
curl -X POST http://localhost:8787/stop
```

## Deployment

### Automated Deployment (Recommended)

Use the deployment scripts for multi-worker orchestration:

```bash
# Deploy all workers
./scripts/deployment/deploy-workers.sh production

# Start all workers with configured symbol sets
export API_KEY=your-production-api-key
./scripts/deployment/start-workers.sh production

# Check status of all workers
./scripts/deployment/check-workers.sh production

# Stop all workers
./scripts/deployment/stop-workers.sh production
```

### Manual Deployment

#### Development

```bash
npm run deploy
```

#### Production

```bash
npm run deploy:production
```

### Multi-Worker Strategy

Deploy multiple workers for different symbol sets:

```bash
# Major pairs worker (high priority)
curl -X POST https://collectors-coinbase.hayven.xyz/start -d '{
  "workerId": "worker-coinbase-major",
  "symbols": ["BTC/USD", "ETH/USD", "SOL/USD"],
  "batchSize": 100,
  "batchIntervalMs": 5000,
  "apiBaseUrl": "https://chrono-api.hayven.xyz",
  "apiKey": "your-api-key",
  "maxReconnectAttempts": 10
}'

# Altcoins worker (medium priority)
curl -X POST https://collectors-binance.hayven.xyz/start -d '{
  "workerId": "worker-binance-alts",
  "symbols": ["ADA/USD", "DOGE/USD", "DOT/USD", "AVAX/USD"],
  "batchSize": 100,
  "batchIntervalMs": 5000,
  "apiBaseUrl": "https://chrono-api.hayven.xyz",
  "apiKey": "your-api-key",
  "maxReconnectAttempts": 10
}'

# Stablecoins worker (monitoring)
curl -X POST https://collectors-coinbase.hayven.xyz/start -d '{
  "workerId": "worker-coinbase-stable",
  "symbols": ["USDT/USD", "USDC/USD", "DAI/USD"],
  "batchSize": 50,
  "batchIntervalMs": 10000,
  "apiBaseUrl": "https://chrono-api.hayven.xyz",
  "apiKey": "your-api-key",
  "maxReconnectAttempts": 10
}'
```

## Custom Domain Setup (hayven.xyz)

This project uses custom domains on `hayven.xyz` for production deployments.

### Prerequisites

1. **Add domain to Cloudflare**:
   - Go to https://dash.cloudflare.com
   - Add `hayven.xyz` as a new site
   - Update nameservers at your registrar

2. **DNS Records** (automatic with custom_domain routes):
   - `collectors-coinbase.hayven.xyz` → Cloudflare Worker
   - `collectors-binance.hayven.xyz` → Cloudflare Worker
   - `collectors-kraken.hayven.xyz` → Cloudflare Worker

### Production URLs

Once configured, your workers will be available at:

- **Coinbase**: https://collectors-coinbase.hayven.xyz
- **Binance**: https://collectors-binance.hayven.xyz
- **Kraken**: https://collectors-kraken.hayven.xyz

### Development URLs

For dev/staging, workers use environment-specific subdomains:

- **Dev**: https://chrono-coinbase-dev.hayven.xyz
- **Staging**: https://chrono-coinbase-staging.hayven.xyz

## Configuration

All configuration is in `wrangler.toml`:

- **name**: Worker name
- **main**: Entry point (src/index.ts)
- **compatibility_date**: Cloudflare runtime version
- **durable_objects**: Durable Object bindings
- **env**: Environment-specific configuration (dev/staging/production)

## Monitoring

View logs in Cloudflare Dashboard or via wrangler:

```bash
npm run tail
```

All logs are JSON-formatted for easy parsing:

```json
{
  "level": "info",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "worker_id": "worker-coinbase-us-east",
  "message": "Batch ingested successfully",
  "data": {
    "feed_count": 100,
    "batches_sent": 42,
    "feeds_collected": 4200
  }
}
```

## Next Steps

See [CHRONO-011-guide.md](../../docs/implementation/CHRONO-011-guide.md) for:

- Phase 2: Exchange adapter implementations
- Phase 3: Production hardening
- Complete testing procedures
- Deployment strategies

## License

Project Chrono - Internal Use Only

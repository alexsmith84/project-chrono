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

### 🚧 Phase 2: Exchange Implementations (TODO)

- [ ] Coinbase adapter
- [ ] Binance adapter
- [ ] Kraken adapter
- [ ] Integration testing

### 🚧 Phase 3: Production Ready (TODO)

- [ ] Deployment scripts
- [ ] Multi-environment configuration
- [ ] Monitoring dashboard
- [ ] Complete documentation

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
  "maxReconnectAttempts": 10
}
```

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

### Development

```bash
npm run deploy
```

### Production

```bash
npm run deploy:production
```

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

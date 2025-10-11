# CHRONO-011: Cloudflare Workers for Exchange Data Collection

**Status**: 🏗️ Specification
**Epic**: ⚡ Chrono Boost Network
**Priority**: 🔴 Critical Mission
**Supply Cost**: 8 (Carrier/Battlecruiser - XL)
**Role**: 🟣 Overlord (Backend)

---

## Executive Summary

Build distributed Cloudflare Workers to collect real-time cryptocurrency price data from multiple exchanges and ingest into the Project Chrono API. This is the **critical missing piece** that transforms the API from scaffolding into a functional price oracle.

**Impact**: Unblocks all downstream features (consensus, analytics, frontend)

---

## Problem Statement

### Current State

- ✅ REST API with `/internal/ingest` endpoint
- ✅ Database schema for price feeds
- ✅ WebSocket streaming infrastructure
- ✅ Comprehensive documentation
- ❌ **NO LIVE DATA FLOWING**

### Target State

- ✅ Real-time price data from 3+ exchanges
- ✅ Automated ingestion every 1-5 seconds
- ✅ Resilient error handling and reconnection
- ✅ Monitoring and observability
- ✅ Easy deployment and scaling

---

## Architecture

### System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    Cryptocurrency Exchanges                      │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ Coinbase │    │ Binance  │    │  Kraken  │                  │
│  │ WebSocket│    │ WebSocket│    │ WebSocket│                  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘                  │
└───────┼──────────────┼──────────────┼─────────────────────────┘
        │              │              │
        │ Price        │ Price        │ Price
        │ Updates      │ Updates      │ Updates
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│              Cloudflare Workers (Edge Network)                   │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐                  │
│  │ Coinbase │    │ Binance  │    │  Kraken  │                  │
│  │  Worker  │    │  Worker  │    │  Worker  │                  │
│  │          │    │          │    │          │                  │
│  │ • Parse  │    │ • Parse  │    │ • Parse  │                  │
│  │ • Norm.  │    │ • Norm.  │    │ • Norm.  │                  │
│  │ • Batch  │    │ • Batch  │    │ • Batch  │                  │
│  └────┬─────┘    └────┬─────┘    └────┬─────┘                  │
└───────┼──────────────┼──────────────┼─────────────────────────┘
        │              │              │
        │ Batch        │ Batch        │ Batch
        │ HTTP POST    │ HTTP POST    │ HTTP POST
        ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Project Chrono API                            │
│                  POST /internal/ingest                           │
│                                                                   │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  PostgreSQL + TimescaleDB                           │        │
│  │  • price_feeds table (hypertable)                   │        │
│  │  • Automatic partitioning by time                   │        │
│  └─────────────────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
```

### Worker Design

Each worker is a **Durable Object** that:
1. Maintains persistent WebSocket connection to exchange
2. Receives price updates in real-time
3. Normalizes data to standard format
4. Batches updates (every 5 seconds OR 100 updates)
5. POSTs to API `/internal/ingest` endpoint
6. Handles errors and auto-reconnects

---

## Exchange Specifications

### Phase 1: Core Exchanges (MVP)

#### 1. Coinbase

**WebSocket API**: `wss://ws-feed.exchange.coinbase.com`

**Subscribe Message**:
```json
{
  "type": "subscribe",
  "product_ids": ["BTC-USD", "ETH-USD"],
  "channels": ["ticker"]
}
```

**Message Format**:
```json
{
  "type": "ticker",
  "product_id": "BTC-USD",
  "price": "45123.50",
  "time": "2025-10-11T12:34:56.789Z",
  "volume_24h": "1234567.89"
}
```

**Rate Limits**: No explicit limit on WebSocket connections

#### 2. Binance

**WebSocket API**: `wss://stream.binance.com:9443/stream`

**Subscribe Streams**:
```
btcusdt@ticker
ethusdt@ticker
```

**Message Format**:
```json
{
  "e": "24hrTicker",
  "s": "BTCUSDT",
  "c": "45123.50",
  "v": "1234567.89",
  "E": 1633024800000
}
```

**Rate Limits**: 10 connections per IP, 5 subscriptions per connection

#### 3. Kraken

**WebSocket API**: `wss://ws.kraken.com`

**Subscribe Message**:
```json
{
  "event": "subscribe",
  "pair": ["XBT/USD", "ETH/USD"],
  "subscription": {"name": "ticker"}
}
```

**Message Format**:
```json
[
  0,
  {
    "c": ["45123.50", "1.5"],
    "v": ["1234.567", "2345.678"]
  },
  "ticker",
  "XBT/USD"
]
```

**Rate Limits**: No explicit limit

### Phase 2: Additional Exchanges (Future)

- Bitstamp
- Gemini
- Huobi
- OKX

---

## Data Model

### Normalized Price Feed Format

```typescript
interface PriceFeed {
  symbol: string;          // "BTC/USD"
  price: number;           // 45123.50
  volume?: number;         // 1234567.89 (24h volume)
  timestamp: string;       // ISO 8601: "2025-10-11T12:34:56.789Z"
  source: string;          // "coinbase"
  worker_id: string;       // "worker-coinbase-us-east"
  metadata?: {             // Exchange-specific data
    bid?: number;
    ask?: number;
    last_size?: number;
  };
}
```

### Batch Ingest Request

```typescript
interface IngestRequest {
  feeds: PriceFeed[];      // 1-100 feeds per batch
}
```

**API Endpoint**: `POST /internal/ingest`
**Authentication**: `Authorization: Bearer chrono_internal_prod_key_001`
**Rate Limit**: 5000 requests/minute (per worker)

---

## Technical Requirements

### 1. Worker Infrastructure

**Platform**: Cloudflare Workers (Durable Objects)

**Why Cloudflare Workers**:
- ✅ Distributed globally (low latency)
- ✅ Durable Objects for stateful WebSocket connections
- ✅ Auto-scaling
- ✅ Built-in DDoS protection
- ✅ Free tier: 100K requests/day per worker

**Stack**:
- Runtime: Cloudflare Workers (V8 isolate)
- Language: TypeScript
- Build: Wrangler CLI
- WebSocket: Durable Objects API

### 2. Data Normalization

**Symbol Mapping**:
```typescript
const SYMBOL_MAP: Record<string, Record<string, string>> = {
  coinbase: {
    'BTC-USD': 'BTC/USD',
    'ETH-USD': 'ETH/USD'
  },
  binance: {
    'BTCUSDT': 'BTC/USD',
    'ETHUSDT': 'ETH/USD'
  },
  kraken: {
    'XBT/USD': 'BTC/USD',
    'ETH/USD': 'ETH/USD'
  }
};
```

**Timestamp Normalization**:
- All timestamps → ISO 8601 UTC
- Handle Unix timestamps (ms/s)
- Handle ISO strings

**Price Validation**:
- Must be positive number
- Max 8 decimal places
- Reasonable bounds (e.g., BTC: $1K-$1M)

### 3. Batching Strategy

**Triggers** (whichever comes first):
- **Time**: Every 5 seconds
- **Count**: 100 price updates
- **Size**: 1MB payload

**Batch Processing**:
```typescript
class PriceBatcher {
  private batch: PriceFeed[] = [];
  private timer: number | null = null;

  add(feed: PriceFeed) {
    this.batch.push(feed);

    if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), 5000);
    }

    if (this.batch.length >= 100) {
      this.flush();
    }
  }

  async flush() {
    if (this.batch.length === 0) return;

    const feeds = this.batch;
    this.batch = [];
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;

    await this.ingest(feeds);
  }

  async ingest(feeds: PriceFeed[]) {
    // POST to /internal/ingest
  }
}
```

### 4. Error Handling

**Connection Errors**:
- WebSocket disconnect → Exponential backoff reconnect
- Initial: 1s, Max: 60s
- Max retries: Infinite (with alerting after 10 failures)

**Ingestion Errors**:
- HTTP 4xx → Log and skip batch (bad data)
- HTTP 5xx → Retry with exponential backoff (3 attempts)
- Timeout → Retry once

**Data Validation Errors**:
- Invalid price → Log warning, skip update
- Missing fields → Log warning, skip update
- Duplicate timestamp → Deduplicate

### 5. Monitoring

**Metrics** (via Cloudflare Analytics):
- Price updates received/sec
- Batches sent/min
- Ingestion success rate
- WebSocket reconnections
- Error rates by type

**Alerting** (via Cloudflare Email Alerts):
- Worker crash
- 10+ consecutive WebSocket failures
- Ingestion error rate > 5%
- No updates for 60 seconds

### 6. Configuration

**Environment Variables** (per worker):
```bash
API_BASE_URL=https://api.chrono.dev
API_KEY=chrono_internal_prod_key_001
WORKER_ID=worker-coinbase-us-east
SYMBOLS=BTC/USD,ETH/USD,XRP/USD,ADA/USD,SOL/USD
BATCH_SIZE=100
BATCH_INTERVAL_MS=5000
LOG_LEVEL=info
```

---

## Implementation Plan

### Phase 1: Foundation (Supply: 3)

**Deliverables**:
- [ ] Cloudflare account setup
- [ ] Wrangler CLI configuration
- [ ] Base worker template
- [ ] WebSocket connection handler
- [ ] Basic error handling

**Files**:
```
workers/
├── src/
│   ├── index.ts           # Entry point
│   ├── websocket.ts       # WebSocket manager
│   ├── batcher.ts         # Batch accumulator
│   └── normalizer.ts      # Data normalization
├── wrangler.toml          # Cloudflare config
├── package.json
└── tsconfig.json
```

### Phase 2: Exchange Implementations (Supply: 3)

**Deliverables**:
- [ ] Coinbase worker
- [ ] Binance worker
- [ ] Kraken worker
- [ ] Symbol mapping
- [ ] Timestamp normalization

**Files**:
```
workers/
└── src/
    └── exchanges/
        ├── coinbase.ts
        ├── binance.ts
        └── kraken.ts
```

### Phase 3: Production Ready (Supply: 2)

**Deliverables**:
- [ ] Comprehensive error handling
- [ ] Reconnection logic
- [ ] Monitoring dashboards
- [ ] Deployment automation
- [ ] Documentation

**Files**:
```
workers/
├── scripts/
│   ├── deploy.sh
│   └── test-worker.sh
└── docs/
    └── DEPLOYMENT.md
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] Workers connect to Coinbase, Binance, Kraken
- [ ] Receive real-time price updates for BTC/USD, ETH/USD (minimum)
- [ ] Normalize data to standard format
- [ ] Batch and ingest to API every 5 seconds
- [ ] Handle WebSocket disconnections gracefully
- [ ] Auto-reconnect with exponential backoff
- [ ] Validate all price data before ingestion
- [ ] Log errors and warnings appropriately

### Non-Functional Requirements

- [ ] Latency: < 1s from exchange update to API ingestion
- [ ] Uptime: 99.9% (< 44 minutes downtime/month)
- [ ] Success Rate: > 99% of updates successfully ingested
- [ ] Scalability: Handle 10+ symbols per exchange
- [ ] Cost: Stay within Cloudflare free tier ($0/month)

### Testing Requirements

- [ ] Unit tests for normalization functions
- [ ] Integration tests with exchange WebSocket APIs
- [ ] End-to-end test: Exchange → Worker → API → Database
- [ ] Load test: 1000 updates/sec ingestion
- [ ] Chaos test: Simulated connection failures

---

## Dependencies

### External Services

- **Cloudflare**: Workers platform (free tier)
- **Exchange APIs**: WebSocket connections (free)
- **Project Chrono API**: `/internal/ingest` endpoint (ready)

### Development Tools

- **Wrangler CLI**: `npm install -g wrangler`
- **Node.js**: v20+ (for local development)
- **TypeScript**: For type safety
- **Vitest**: For testing

### API Requirements

- Internal API key with `internal` type
- Rate limit: 5000 req/min per worker
- CORS: Allow Cloudflare Worker origins

---

## Deployment Strategy

### Development Environment

```bash
# Local development with Miniflare
npm run dev

# Test with local API
API_BASE_URL=http://localhost:3000 npm run dev
```

### Staging Environment

```bash
# Deploy to Cloudflare staging
wrangler deploy --env staging

# Monitor logs
wrangler tail --env staging
```

### Production Environment

```bash
# Deploy all workers
./scripts/deploy.sh production

# Verify deployment
./scripts/test-worker.sh production coinbase
```

**Rollback Strategy**:
```bash
# Revert to previous version
wrangler rollback --env production
```

---

## Monitoring & Observability

### Cloudflare Dashboard

**Metrics to Track**:
- Requests per second
- Error rate
- Execution time (p50, p95, p99)
- Durable Object active instances

### Custom Logging

**Log Levels**:
- `ERROR`: Connection failures, ingestion errors
- `WARN`: Data validation issues, retries
- `INFO`: Successful batches, reconnections
- `DEBUG`: Individual price updates (dev only)

**Log Format**:
```json
{
  "level": "info",
  "timestamp": "2025-10-11T12:34:56.789Z",
  "worker_id": "worker-coinbase-us-east",
  "event": "batch_ingested",
  "count": 42,
  "duration_ms": 123
}
```

### Alerts

**Critical Alerts** (email):
- Worker crash
- 10 consecutive failures
- No data for 5 minutes

**Warning Alerts** (log only):
- Reconnection occurred
- Retry attempt
- Validation error

---

## Cost Estimation

### Cloudflare Workers (Free Tier)

- **Requests**: 100,000/day free (3M/month)
- **CPU Time**: 10ms per request (included)
- **Durable Objects**: First 1M requests free

**Expected Usage**:
- 3 workers × 12 batches/min = 36 req/min
- 36 req/min × 1440 min/day = 51,840 req/day
- **Well within free tier** ✅

### Scaling to Paid Tier

If needed (10+ exchanges):
- $5/month for 10M additional requests
- $0.15 per million Durable Object requests

---

## Security Considerations

### API Key Management

- Store API key in Cloudflare Secrets (encrypted)
- Rotate keys quarterly
- Use separate keys per environment

### WebSocket Security

- Validate exchange TLS certificates
- Use WSS (encrypted WebSocket)
- Implement connection timeouts

### Rate Limiting

- Respect exchange rate limits
- Implement client-side rate limiting
- Monitor for abuse

### Data Privacy

- No PII collected
- Price data is public information
- Logs retention: 7 days

---

## Future Enhancements

### Phase 2 Features

- [ ] Additional exchanges (Bitstamp, Gemini)
- [ ] More trading pairs (100+ symbols)
- [ ] Order book data (bid/ask spreads)
- [ ] Trade volume tracking

### Phase 3 Features

- [ ] Smart batching (adaptive interval based on volatility)
- [ ] Compression (reduce payload size)
- [ ] Multi-region deployment (failover)
- [ ] Circuit breaker pattern

---

## Success Metrics

### Week 1 (Post-Deployment)

- ✅ All 3 workers deployed and running
- ✅ > 10,000 price updates/day
- ✅ 99%+ success rate
- ✅ Database growing with real data

### Week 2

- ✅ 100,000+ price updates/day
- ✅ API consensus endpoints returning real data
- ✅ WebSocket streaming live prices
- ✅ Zero critical alerts

### Month 1

- ✅ 3 million+ price updates/month
- ✅ 99.9% uptime
- ✅ < $5/month cost
- ✅ Frontend dashboard showing live data

---

## References

### Exchange Documentation

- [Coinbase WebSocket API](https://docs.cloud.coinbase.com/exchange/docs/websocket-overview)
- [Binance WebSocket API](https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams)
- [Kraken WebSocket API](https://docs.kraken.com/websockets/)

### Cloudflare Documentation

- [Workers Documentation](https://developers.cloudflare.com/workers/)
- [Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/)
- [WebSocket API](https://developers.cloudflare.com/workers/runtime-apis/websockets/)

### Project Chrono

- API Spec: `docs/specs/CHRONO-007-api-layer.md`
- Database Schema: `docs/specs/CHRONO-004-core-data-models.md`
- Ingestion Endpoint: `apps/api/src/routes/internal/ingest.ts`

---

*"Data flows through the Khala. The workers harvest it. The oracle awakens!"*

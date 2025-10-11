# CHRONO-007: Bun/TypeScript API Layer

*"The gateway opens. Data flows like time itself—swift, precise, unstoppable."*

---

## Status

**Phase**: Khala Connection
**Status**: 📋 Specification
**Priority**: High
**Dependencies**: CHRONO-004 (Database Schema)
**Assignee**: TBD
**Created**: 2025-10-09
**Target**: TBD

---

## Overview

Build a high-performance Bun/TypeScript API layer serving as the gateway between external data collectors and internal consumers. This API will:

- **Ingest real-time price data** from exchange workers via internal REST endpoints
- **Serve aggregated prices** to validators and frontends via public REST API
- **Stream live updates** via WebSocket connections
- **Query PostgreSQL** for historical time-series data
- **Cache frequently accessed data** in Redis for sub-50ms response times
- **Authenticate and rate-limit** API consumers

### Architecture Role

```
┌─────────────────────────────────────────────────────┐
│           Exchange Workers (CHRONO-006)             │
│         (Binance, Coinbase, Kraken, etc.)           │
└─────────────────────┬───────────────────────────────┘
                      │ POST /internal/ingest
                      ▼
┌─────────────────────────────────────────────────────┐
│          CHRONO-007: Bun/TypeScript API             │
│  ┌─────────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ REST Server │  │ WebSocket│  │ Database Layer│  │
│  │   (Hono)    │  │  Server  │  │  (PostgreSQL) │  │
│  └─────────────┘  └──────────┘  └───────────────┘  │
│  ┌─────────────────────────────────────────────┐   │
│  │         Redis (Cache + Pub/Sub)             │   │
│  └─────────────────────────────────────────────┘   │
└───────────────┬─────────────────────────────────────┘
                │ GET /prices, WS /stream
                ▼
┌─────────────────────────────────────────────────────┐
│      Validators, Frontends, External Consumers      │
└─────────────────────────────────────────────────────┘
```

---

## Goals

### Primary Goals

1. **High-Throughput Ingestion**: Handle 1000+ price updates/second from exchange workers
2. **Low-Latency Queries**: Serve price data with P95 < 200ms (REST), < 50ms (cache hits)
3. **Real-Time Streaming**: WebSocket updates with < 100ms latency from ingestion to broadcast
4. **Reliable Storage**: Persist all price feeds to PostgreSQL with 99.9% write success rate
5. **Scalable Caching**: Redis-backed caching for hot data (latest prices, 24h aggregates)

### Secondary Goals

1. **Comprehensive API**: REST endpoints for historical queries, aggregations, metadata
2. **Developer-Friendly**: OpenAPI documentation, TypeScript SDK generation
3. **Observability**: Prometheus metrics, structured logging, health checks
4. **Security**: API key authentication, rate limiting, input validation

---

## Technical Design

### Technology Stack

| Component | Technology | Justification |
|-----------|-----------|---------------|
| **Runtime** | Bun 1.1+ | 3x faster than Node.js, native TypeScript support |
| **Web Framework** | Hono | Ultra-fast edge runtime, <1ms overhead |
| **WebSocket** | `ws` (Bun-native) | Native WebSocket support, high concurrency |
| **Database Client** | `@neondatabase/serverless` + `postgres` | PostgreSQL connection pooling, prepared statements |
| **Redis Client** | `ioredis` | Clustering support, Lua scripting, pub/sub |
| **Validation** | Zod | Type-safe schema validation, TypeScript inference |
| **Authentication** | Custom middleware | API key validation, rate limiting |
| **Testing** | Bun:test | Native test runner, fast execution |

### Project Structure

```
apps/api/
├── src/
│   ├── index.ts                 # Application entry point
│   ├── server.ts                # Hono server setup
│   ├── websocket.ts             # WebSocket server
│   │
│   ├── routes/
│   │   ├── internal/
│   │   │   └── ingest.ts        # POST /internal/ingest (worker ingestion)
│   │   ├── public/
│   │   │   ├── prices.ts        # GET /prices/* (public price queries)
│   │   │   ├── aggregates.ts    # GET /aggregates/* (time-series aggregates)
│   │   │   └── metadata.ts      # GET /metadata/* (system info)
│   │   └── health.ts            # GET /health, /metrics
│   │
│   ├── db/
│   │   ├── client.ts            # PostgreSQL connection pool
│   │   ├── queries/
│   │   │   ├── price-feeds.ts   # Price feed queries
│   │   │   ├── aggregates.ts    # Aggregated price queries
│   │   │   └── delegations.ts   # Delegation queries
│   │   └── types.ts             # Database type definitions
│   │
│   ├── cache/
│   │   ├── redis.ts             # Redis client setup
│   │   ├── price-cache.ts       # Price caching logic
│   │   └── pubsub.ts            # Redis pub/sub for WebSocket
│   │
│   ├── middleware/
│   │   ├── auth.ts              # API key authentication
│   │   ├── rate-limit.ts        # Rate limiting (Redis-backed)
│   │   ├── validation.ts        # Request validation (Zod)
│   │   └── error-handler.ts     # Global error handling
│   │
│   ├── schemas/
│   │   ├── ingest.ts            # Ingestion payload schemas
│   │   ├── queries.ts           # Query parameter schemas
│   │   └── responses.ts         # Response schemas
│   │
│   └── utils/
│       ├── logger.ts            # Structured logging
│       ├── metrics.ts           # Prometheus metrics
│       └── config.ts            # Environment configuration
│
├── tests/
│   ├── integration/
│   │   ├── ingest.test.ts
│   │   ├── prices.test.ts
│   │   └── websocket.test.ts
│   └── unit/
│       ├── cache.test.ts
│       └── queries.test.ts
│
├── package.json
├── tsconfig.json
└── bunfig.toml
```

---

## API Specification

### Internal Endpoints (Worker Ingestion)

#### `POST /internal/ingest`

**Purpose**: Receive price feed batches from exchange workers

**Authentication**: Internal API key (different from public keys)

**Request Body**:
```typescript
{
  "worker_id": "binance-worker-001",
  "timestamp": "2025-10-09T12:34:56.789Z",
  "feeds": [
    {
      "symbol": "BTC/USD",
      "price": "67234.56",
      "volume": "1234.567890",
      "source": "binance",
      "timestamp": "2025-10-09T12:34:56.123Z",
      "metadata": {
        "bid": "67230.00",
        "ask": "67235.00",
        "exchange_timestamp": 1728480896123
      }
    },
    {
      "symbol": "ETH/USD",
      "price": "2678.90",
      // ...
    }
  ]
}
```

**Response** (200 OK):
```typescript
{
  "status": "success",
  "ingested": 2,
  "failed": 0,
  "latency_ms": 12,
  "message": "2 price feeds ingested successfully"
}
```

**Business Logic**:
1. Validate worker API key and rate limits (5000 req/min per worker)
2. Validate each price feed schema (Zod validation)
3. Insert into `price_feeds` table (batch insert, 100 max per request)
4. Update Redis cache for latest prices (`latest:BTC/USD`, TTL 60s)
5. Publish to Redis pub/sub channel for WebSocket broadcast
6. Return success/failure counts with latency metrics

**Performance Target**: P95 < 50ms for 100-feed batch

---

### Public Endpoints (Price Queries)

#### `GET /prices/latest`

**Purpose**: Get latest prices for specified symbols

**Authentication**: Public API key

**Query Parameters**:
```typescript
?symbols=BTC/USD,ETH/USD,FLR/USD
```

**Response** (200 OK):
```typescript
{
  "data": [
    {
      "symbol": "BTC/USD",
      "price": "67234.56",
      "volume": "1234.567890",
      "source": "aggregated",
      "timestamp": "2025-10-09T12:34:56.123Z",
      "staleness_ms": 234  // Time since last update
    }
  ],
  "cached": true,
  "latency_ms": 8
}
```

**Business Logic**:
1. Check Redis cache for `latest:{symbol}` keys
2. If cache miss, query PostgreSQL:
   ```sql
   SELECT DISTINCT ON (symbol) *
   FROM price_feeds
   WHERE symbol = ANY($1)
   ORDER BY symbol, timestamp DESC;
   ```
3. Cache results for 60 seconds
4. Return with cache status and latency

**Performance Target**: P95 < 50ms (cache hit), < 200ms (cache miss)

---

#### `GET /prices/range`

**Purpose**: Get price history for a time range

**Query Parameters**:
```typescript
?symbol=BTC/USD
&from=2025-10-09T00:00:00Z
&to=2025-10-09T23:59:59Z
&interval=1h        // Optional: 1m, 5m, 15m, 1h, 1d
&source=binance     // Optional: filter by source
&limit=1000         // Max 10000
```

**Response** (200 OK):
```typescript
{
  "data": [
    {
      "timestamp": "2025-10-09T00:00:00Z",
      "open": "66800.00",
      "high": "67500.00",
      "low": "66500.00",
      "close": "67234.56",
      "volume": "12345.678",
      "num_feeds": 3600  // Number of raw feeds in this interval
    }
  ],
  "interval": "1h",
  "count": 24,
  "latency_ms": 145
}
```

**Business Logic**:
1. Validate date range (max 90 days for raw data, 2 years for aggregated)
2. If interval specified, use time-bucket aggregation:
   ```sql
   SELECT
     time_bucket('1 hour', timestamp) AS bucket,
     first(price, timestamp) AS open,
     max(price) AS high,
     min(price) AS low,
     last(price, timestamp) AS close,
     sum(volume) AS volume,
     count(*) AS num_feeds
   FROM price_feeds
   WHERE symbol = $1
     AND timestamp >= $2
     AND timestamp <= $3
   GROUP BY bucket
   ORDER BY bucket DESC
   LIMIT $4;
   ```
3. Cache aggregated results for 5 minutes
4. Return with pagination metadata

**Performance Target**: P95 < 500ms for 24h range, < 2s for 90-day range

---

#### `GET /aggregates/consensus`

**Purpose**: Get FTSO consensus prices (aggregated from multiple sources)

**Query Parameters**:
```typescript
?symbols=BTC/USD,ETH/USD
&timestamp=2025-10-09T12:00:00Z  // Optional: specific time, defaults to latest
```

**Response** (200 OK):
```typescript
{
  "data": [
    {
      "symbol": "BTC/USD",
      "price": "67234.56",
      "median": "67230.00",
      "mean": "67235.12",
      "std_dev": "5.67",
      "num_sources": 12,
      "timestamp": "2025-10-09T12:00:00Z",
      "sources": ["binance", "coinbase", "kraken", ...]
    }
  ],
  "latency_ms": 23
}
```

**Business Logic**:
1. Query `aggregated_prices` table for consensus data
2. If no aggregated data exists, compute on-the-fly:
   ```sql
   SELECT
     symbol,
     percentile_cont(0.5) WITHIN GROUP (ORDER BY price) AS median,
     avg(price) AS mean,
     stddev(price) AS std_dev,
     count(DISTINCT source) AS num_sources,
     array_agg(DISTINCT source) AS sources
   FROM price_feeds
   WHERE symbol = ANY($1)
     AND timestamp >= $2 - INTERVAL '5 minutes'
     AND timestamp <= $2
   GROUP BY symbol;
   ```
3. Cache for 60 seconds
4. Return aggregated statistics

**Performance Target**: P95 < 100ms

---

### WebSocket Endpoint

#### `WS /stream`

**Purpose**: Real-time price updates via WebSocket

**Authentication**: API key via query parameter `?key=xxx` or first message

**Message Protocol**:

**Client → Server (Subscribe)**:
```typescript
{
  "action": "subscribe",
  "symbols": ["BTC/USD", "ETH/USD"]
}
```

**Server → Client (Price Update)**:
```typescript
{
  "type": "price_update",
  "data": {
    "symbol": "BTC/USD",
    "price": "67234.56",
    "volume": "1234.567890",
    "source": "binance",
    "timestamp": "2025-10-09T12:34:56.123Z"
  }
}
```

**Server → Client (Heartbeat)**:
```typescript
{
  "type": "heartbeat",
  "timestamp": "2025-10-09T12:34:56.789Z"
}
```

**Business Logic**:
1. Authenticate client via API key (first message or query param)
2. Subscribe client to Redis pub/sub channels for requested symbols
3. When new price ingested, publish to `price_updates:{symbol}` Redis channel
4. Broadcast to all subscribed WebSocket clients
5. Send heartbeat every 30 seconds
6. Handle disconnects and cleanup subscriptions

**Performance Target**: < 100ms latency from ingestion to client delivery

---

## Database Layer

### Connection Pooling

```typescript
// src/db/client.ts
import { Pool } from '@neondatabase/serverless';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,  // Max connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Prepared statement caching
export const queryPriceFeeds = pool.prepare(`
  SELECT * FROM price_feeds
  WHERE symbol = $1
    AND timestamp >= $2
    AND timestamp <= $3
  ORDER BY timestamp DESC
  LIMIT $4
`);
```

### Query Optimization

**Indexes** (already created in CHRONO-004):
- `idx_price_feeds_symbol_time` on `(symbol, timestamp DESC)` - Range queries
- `idx_aggregated_prices_symbol_time` on `(symbol, timestamp DESC)` - Consensus queries
- `idx_delegations_delegator_time` on `(delegator_id, timestamp DESC)` - Delegation history

**Query Patterns**:
1. **Latest Prices**: `SELECT DISTINCT ON (symbol)` with `ORDER BY timestamp DESC`
2. **Range Queries**: `WHERE timestamp >= $1 AND timestamp <= $2` with index scan
3. **Aggregations**: `time_bucket()` for OHLCV data (when TimescaleDB enabled)
4. **Batch Inserts**: `INSERT INTO ... VALUES ($1), ($2), ... ($n)` (max 100 per batch)

---

## Redis Caching Strategy

### Cache Keys

| Key Pattern | Data | TTL |
|------------|------|-----|
| `latest:{symbol}` | Latest price for symbol | 60s |
| `range:{symbol}:{from}:{to}:{interval}` | Aggregated range query | 5min |
| `consensus:{symbol}:{timestamp}` | Consensus price | 5min |
| `worker:{worker_id}:rate` | Rate limit counter | 1min |
| `api:{api_key}:rate` | Public API rate limit | 1min |

### Pub/Sub Channels

| Channel | Purpose | Subscribers |
|---------|---------|-------------|
| `price_updates:*` | Price updates by symbol | WebSocket server |
| `price_updates:all` | All price updates | Admin dashboards |

### Cache Invalidation

- **Write-through**: Update cache immediately on successful DB insert
- **TTL-based**: Expire stale data automatically
- **Event-driven**: Invalidate on schema changes (rare)

---

## Authentication & Rate Limiting

### API Key Types

1. **Internal Keys** (Worker Ingestion):
   - Prefix: `chrono_internal_`
   - Rate Limit: 5000 req/min
   - Allowed Endpoints: `/internal/*`

2. **Public Keys** (External Consumers):
   - Prefix: `chrono_public_`
   - Rate Limit: 1000 req/min (free tier), 10000 req/min (paid tier)
   - Allowed Endpoints: `/prices/*`, `/aggregates/*`, `/stream`

3. **Admin Keys** (Internal Tools):
   - Prefix: `chrono_admin_`
   - Rate Limit: Unlimited
   - Allowed Endpoints: All

### Rate Limiting Implementation

```typescript
// src/middleware/rate-limit.ts
import { redis } from '../cache/redis';

export async function rateLimit(apiKey: string, limit: number): Promise<boolean> {
  const key = `api:${apiKey}:rate`;
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, 60);  // 1-minute window
  }

  return current <= limit;
}
```

### Security Headers

- **CORS**: Configurable origins (default: `*` for public API)
- **Rate Limit Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Request ID**: `X-Request-ID` for tracing

---

## Error Handling

### Error Response Format

```typescript
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid symbol format: BTC-USD. Expected format: BASE/QUOTE",
    "details": {
      "field": "symbol",
      "received": "BTC-USD",
      "expected": "BTC/USD"
    },
    "request_id": "req_abc123"
  },
  "status": 400
}
```

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Invalid request payload/params |
| `UNAUTHORIZED` | 401 | Missing or invalid API key |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `NOT_FOUND` | 404 | Resource not found |
| `DATABASE_ERROR` | 503 | Database unavailable |
| `CACHE_ERROR` | 503 | Redis unavailable |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Observability

### Prometheus Metrics

```typescript
// src/utils/metrics.ts
import { register, Counter, Histogram } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
});

export const priceIngestionsTotal = new Counter({
  name: 'price_ingestions_total',
  help: 'Total number of price feeds ingested',
  labelNames: ['worker_id', 'symbol', 'status'],
});

export const websocketConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
});
```

**Exposed at**: `GET /metrics` (Prometheus format)

### Structured Logging

```typescript
// src/utils/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: {
    target: 'pino-pretty',
    options: { colorize: true },
  },
});

// Usage
logger.info({ worker_id: 'binance-001', count: 100 }, 'Price feeds ingested');
logger.error({ err, request_id }, 'Database query failed');
```

### Health Checks

#### `GET /health`

```typescript
{
  "status": "healthy",
  "timestamp": "2025-10-09T12:34:56.789Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "websocket": "healthy"
  },
  "uptime_seconds": 3600
}
```

---

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Ingestion Throughput** | 1000 feeds/sec | Load test with 10 workers |
| **Ingestion Latency (P95)** | < 50ms | 100-feed batches |
| **API Response (P95)** | < 200ms | Cache miss scenarios |
| **Cache Hit Latency (P95)** | < 50ms | Redis round-trip |
| **WebSocket Latency** | < 100ms | Ingestion → client delivery |
| **Database Connection Pool** | 90% utilization | 20 max connections |
| **Memory Usage** | < 512 MB | Steady-state operation |
| **CPU Usage** | < 50% | 1000 req/sec load |

---

## Testing Strategy

### Unit Tests

```typescript
// tests/unit/cache.test.ts
import { describe, test, expect } from 'bun:test';
import { cacheLatestPrice, getLatestPrice } from '../src/cache/price-cache';

describe('Price Cache', () => {
  test('should cache and retrieve latest price', async () => {
    await cacheLatestPrice('BTC/USD', {
      price: '67234.56',
      timestamp: new Date().toISOString(),
    });

    const cached = await getLatestPrice('BTC/USD');
    expect(cached?.price).toBe('67234.56');
  });
});
```

### Integration Tests

```typescript
// tests/integration/ingest.test.ts
import { describe, test, expect } from 'bun:test';
import { app } from '../src/server';

describe('POST /internal/ingest', () => {
  test('should ingest price feeds', async () => {
    const response = await app.request('/internal/ingest', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer chrono_internal_test_key',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        worker_id: 'test-worker',
        timestamp: new Date().toISOString(),
        feeds: [
          {
            symbol: 'BTC/USD',
            price: '67234.56',
            source: 'binance',
            timestamp: new Date().toISOString(),
          },
        ],
      }),
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.ingested).toBe(1);
  });
});
```

### Load Tests

```bash
# Use k6 for load testing
k6 run tests/load/ingestion.js
```

```javascript
// tests/load/ingestion.js
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  vus: 10,  // 10 virtual workers
  duration: '60s',
};

export default function () {
  const payload = JSON.stringify({
    worker_id: `worker-${__VU}`,
    timestamp: new Date().toISOString(),
    feeds: [
      {
        symbol: 'BTC/USD',
        price: `${60000 + Math.random() * 10000}`,
        source: 'binance',
        timestamp: new Date().toISOString(),
      },
    ],
  });

  const res = http.post('http://localhost:3000/internal/ingest', payload, {
    headers: { 'Content-Type': 'application/json' },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'latency < 100ms': (r) => r.timings.duration < 100,
  });
}
```

---

## Environment Configuration

```bash
# .env.example
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://postgres:password@localhost:5432/project_chrono_dev
DATABASE_POOL_SIZE=20

# Redis
REDIS_URL=redis://localhost:6379
REDIS_CACHE_TTL=60

# Authentication
INTERNAL_API_KEYS=chrono_internal_dev_key_001
PUBLIC_API_KEYS=chrono_public_dev_key_001

# Rate Limits
RATE_LIMIT_INTERNAL=5000  # per minute
RATE_LIMIT_PUBLIC_FREE=1000
RATE_LIMIT_PUBLIC_PAID=10000

# Observability
LOG_LEVEL=info
METRICS_ENABLED=true

# WebSocket
WS_HEARTBEAT_INTERVAL=30000  # milliseconds
WS_MAX_CONNECTIONS=10000
```

---

## Deployment Considerations

### Production Checklist

- [ ] Enable PostgreSQL connection pooling (PgBouncer or Neon serverless)
- [ ] Set up Redis Cluster for high availability
- [ ] Configure CORS for allowed origins
- [ ] Set up API key rotation policy
- [ ] Enable Prometheus metrics scraping
- [ ] Configure log aggregation (e.g., Datadog, Grafana Loki)
- [ ] Set up rate limiting with Redis Cluster
- [ ] Enable WebSocket horizontal scaling (Redis pub/sub)
- [ ] Configure auto-scaling based on CPU/memory
- [ ] Set up health check monitoring (uptime alerts)

### Horizontal Scaling

**Stateless Design**: API servers are stateless, can scale horizontally

**WebSocket Scaling**: Use Redis pub/sub to broadcast messages across instances

```typescript
// src/websocket.ts
import { redis } from './cache/redis';

// Subscribe to Redis pub/sub
redis.subscribe('price_updates:*');

redis.on('message', (channel, message) => {
  const symbol = channel.split(':')[1];

  // Broadcast to all connected clients subscribed to this symbol
  wss.clients.forEach((client) => {
    if (client.subscriptions.includes(symbol)) {
      client.send(message);
    }
  });
});
```

---

## Acceptance Criteria

### Functional Requirements

- [ ] **Ingestion Endpoint**: `POST /internal/ingest` accepts price feed batches (max 100 feeds)
- [ ] **Latest Prices**: `GET /prices/latest` returns latest prices for specified symbols
- [ ] **Range Queries**: `GET /prices/range` returns price history with optional aggregation
- [ ] **Consensus Prices**: `GET /aggregates/consensus` returns FTSO consensus data
- [ ] **WebSocket Streaming**: `WS /stream` broadcasts real-time price updates
- [ ] **Authentication**: API key validation for internal and public endpoints
- [ ] **Rate Limiting**: Redis-backed rate limits enforced per API key type
- [ ] **Error Handling**: Consistent error response format with request tracing

### Performance Requirements

- [ ] **Ingestion**: Handle 1000 feeds/sec with P95 latency < 50ms
- [ ] **API Latency**: P95 < 200ms for cache misses, < 50ms for cache hits
- [ ] **WebSocket Latency**: < 100ms from ingestion to client delivery
- [ ] **Database**: Connection pool utilization < 90%
- [ ] **Memory**: Steady-state < 512 MB per instance
- [ ] **CPU**: < 50% utilization at 1000 req/sec

### Observability Requirements

- [ ] **Metrics**: Prometheus metrics exposed at `/metrics`
- [ ] **Logging**: Structured JSON logs with request tracing
- [ ] **Health Checks**: `/health` endpoint returns service status
- [ ] **Tracing**: Request ID propagation for distributed tracing

### Testing Requirements

- [ ] **Unit Tests**: 90% code coverage for business logic
- [ ] **Integration Tests**: All endpoints tested with real DB/Redis
- [ ] **Load Tests**: k6 tests validate performance targets
- [ ] **Contract Tests**: OpenAPI schema validation

---

## Timeline Estimate

| Phase | Tasks | Duration |
|-------|-------|----------|
| **Setup** | Project scaffolding, dependencies, config | 1 day |
| **Database Layer** | Connection pool, queries, types | 1 day |
| **Cache Layer** | Redis setup, caching logic, pub/sub | 1 day |
| **Ingestion API** | POST /internal/ingest + validation | 1 day |
| **Query APIs** | GET /prices/*, /aggregates/* | 2 days |
| **WebSocket** | WS server, pub/sub, subscriptions | 2 days |
| **Auth & Rate Limit** | Middleware, API key validation | 1 day |
| **Observability** | Metrics, logging, health checks | 1 day |
| **Testing** | Unit, integration, load tests | 2 days |
| **Documentation** | OpenAPI spec, README, deployment guide | 1 day |

**Total**: ~13 days (2-3 weeks with buffer)

---

## Success Metrics

### Operational Metrics

- **Uptime**: 99.9% availability (< 45 min downtime/month)
- **Error Rate**: < 0.1% of requests fail
- **Cache Hit Rate**: > 80% for latest price queries
- **Database Utilization**: < 80% of connection pool capacity

### Business Metrics

- **API Adoption**: 100+ active API keys within 1 month
- **WebSocket Connections**: 500+ concurrent connections
- **Data Volume**: 100M+ price feeds ingested per day
- **Query Volume**: 1M+ API requests per day

---

## Future Enhancements

### Phase 2 (Post-Launch - Bun/TypeScript)

1. **GraphQL API**: Add GraphQL endpoint for complex queries
2. **Continuous Aggregates**: Pre-compute 1h/1d/1w aggregates (requires TimescaleDB)
3. **Historical Replay**: API to replay historical price data for backtesting
4. **Multi-Region Deployment**: Edge locations for lower latency
5. **Data Export**: Bulk export endpoints for data analysis

### Phase 3 (Advanced - Bun/TypeScript)

1. **Machine Learning Integration**: Anomaly detection, price prediction APIs
2. **Advanced Analytics**: Volatility, correlation, market depth APIs
3. **Custom Alerts**: Webhooks for price threshold alerts
4. **Data Marketplace**: Sell historical data access via API

---

## Future Migration Path: Elixir + Phoenix

### Why Migrate to Elixir/Phoenix?

While Bun/TypeScript provides excellent performance for initial deployment, Elixir/Phoenix offers compelling advantages for production-scale FTSO operations requiring extreme reliability and concurrency:

#### Concurrency & Scalability
- **2M WebSocket connections** on a single server (vs Bun's ~10K-50K)
- **Millions of lightweight processes** for parallel price aggregation
- **Horizontal scaling** built into the BEAM VM (distributed Erlang)

#### Fault Tolerance
- **OTP supervision trees**: Automatic recovery from crashes without downtime
- **"Let it crash" philosophy**: Isolated failures don't cascade
- **Hot code reloading**: Deploy updates with **zero downtime**

#### Real-Time Performance
- **Phoenix Channels**: Industry-leading WebSocket implementation
- **Sub-millisecond message passing** between processes
- **Built-in pub/sub**: No Redis dependency for WebSocket scaling

#### Production Reliability
- **Battle-tested**: Runs WhatsApp (2B+ users), Discord (150M+ users)
- **Predictable latency**: No GC pauses (vs Node.js/Bun)
- **Observability**: Built-in telemetry, distributed tracing

---

### What Elixir/Phoenix Replaces

**Replaces**: The entire TypeScript/Bun API server (REST + WebSocket)

**Keeps**:
- PostgreSQL 17 + TimescaleDB (database layer)
- Redis (caching only, not required for WebSocket scaling)
- Rust engine (called via NIFs for heavy computation)

---

### Architecture: Elixir + Phoenix + Rust

```
┌─────────────────────────────────────────────────────┐
│           Exchange Workers (CHRONO-006)             │
│         (Binance, Coinbase, Kraken, etc.)           │
└─────────────────────┬───────────────────────────────┘
                      │ POST /internal/ingest
                      ▼
┌─────────────────────────────────────────────────────┐
│          Elixir/Phoenix API Server                  │
│  ┌─────────────────────────────────────────────┐   │
│  │     Phoenix REST Endpoints (Plug Router)    │   │
│  │  POST /internal/ingest, GET /prices/*, etc. │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │   Phoenix Channels (WebSocket Orchestration)│   │
│  │   - 2M connections per server               │   │
│  │   - Phoenix.PubSub (distributed)            │   │
│  │   - Sub-ms message passing                  │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │      GenServers (Business Logic)            │   │
│  │   - PriceAggregator (Rust NIF calls)        │   │
│  │   - CacheManager (Redis/ETS)                │   │
│  │   - DatabaseWorkerPool (Ecto)               │   │
│  └─────────────────────────────────────────────┘   │
│                                                     │
│  ┌─────────────────────────────────────────────┐   │
│  │   Rust NIFs (Native Implemented Functions)  │   │
│  │   - VWAP/TWAP calculations (<5ms)           │   │
│  │   - ML inference (anomaly detection)        │   │
│  │   - Cryptographic signing                   │   │
│  └─────────────────────────────────────────────┘   │
└───────┬─────────────────────────────────────────────┘
        │
        ├──► PostgreSQL 17 + TimescaleDB (hot data)
        ├──► Redis (optional caching)
        └──► ClickHouse (cold data analytics)
```

---

### Code Example: Phoenix Channels for WebSocket

```elixir
# lib/chrono_web/channels/price_channel.ex
defmodule ChronoWeb.PriceChannel do
  use Phoenix.Channel

  # Client subscribes to price updates
  def join("prices:lobby", _payload, socket) do
    {:ok, socket}
  end

  # Subscribe to specific symbols
  def handle_in("subscribe", %{"symbols" => symbols}, socket) do
    Enum.each(symbols, fn symbol ->
      Phoenix.PubSub.subscribe(Chrono.PubSub, "price_updates:#{symbol}")
    end)

    {:noreply, socket}
  end

  # Handle incoming price updates from PubSub
  def handle_info({:price_update, price_data}, socket) do
    push(socket, "price_update", price_data)
    {:noreply, socket}
  end
end
```

**Broadcast price to all subscribers** (from anywhere in the system):

```elixir
# When new price ingested
Phoenix.PubSub.broadcast(
  Chrono.PubSub,
  "price_updates:BTC/USD",
  {:price_update, %{symbol: "BTC/USD", price: "67234.56", ...}}
)
```

**Result**: All connected clients subscribed to `BTC/USD` receive updates instantly, across **all server nodes** in a cluster.

---

### Code Example: Elixir Orchestration + Rust Computation

```elixir
# lib/chrono/aggregator.ex
defmodule Chrono.Aggregator do
  # Aggregate prices from multiple sources in parallel
  def aggregate_prices(symbol, time_window) do
    {:ok, prices} = Repo.all(
      from p in PriceFeed,
      where: p.symbol == ^symbol and p.timestamp > ^time_window,
      select: %{price: p.price, volume: p.volume}
    )

    # Spawn 1000s of parallel tasks
    prices
    |> Task.async_stream(&calculate_metrics/1, max_concurrency: 1000)
    |> Enum.to_list()
    |> compute_final_aggregate()
  end

  # Call Rust NIF for heavy computation
  defp calculate_metrics(prices) do
    RustNIF.calculate_vwap(prices)  # <5ms for 10K data points
  end
end
```

**Rust NIF** (Native Implemented Function):

```rust
// native/chrono_nif/src/lib.rs
use rustler::{Encoder, Env, Term};

#[derive(NifStruct)]
#[module = "Chrono.PricePoint"]
struct PricePoint {
    price: f64,
    volume: f64,
}

#[rustler::nif]
fn calculate_vwap(prices: Vec<PricePoint>) -> f64 {
    let total_volume: f64 = prices.iter().map(|p| p.volume).sum();
    let weighted_sum: f64 = prices.iter()
        .map(|p| p.price * p.volume)
        .sum();

    weighted_sum / total_volume  // Ultra-fast calculation
}

rustler::init!("Elixir.RustNIF", [calculate_vwap]);
```

**Called from Elixir**: `RustNIF.calculate_vwap(prices)` — near-zero FFI overhead

---

### Code Example: OTP Supervision for Fault Tolerance

```elixir
# lib/chrono/application.ex
defmodule Chrono.Application do
  use Application

  def start(_type, _args) do
    children = [
      # Database connection pool
      Chrono.Repo,

      # Phoenix PubSub for distributed messaging
      {Phoenix.PubSub, name: Chrono.PubSub},

      # Price aggregator GenServer (supervised)
      Chrono.PriceAggregator,

      # WebSocket endpoint
      ChronoWeb.Endpoint
    ]

    # Supervision strategy: restart failed processes
    opts = [strategy: :one_for_one, name: Chrono.Supervisor]
    Supervisor.start_link(children, opts)
  end
end
```

**What this does**:
- If `PriceAggregator` crashes, it **automatically restarts** without affecting other processes
- WebSocket connections, database pool, etc. remain unaffected
- **No cascading failures** — isolated fault domains

---

### Performance Comparison

| Metric | Bun/TypeScript | Elixir/Phoenix |
|--------|---------------|---------------|
| **WebSocket Connections** | ~10K-50K per server | **2M+ per server** |
| **Concurrent Processes** | Limited by event loop | **Millions** (lightweight) |
| **Message Latency** | ~10ms (Redis pub/sub) | **<1ms** (native BEAM) |
| **Fault Tolerance** | Process crash = downtime | **Auto-restart** (OTP) |
| **Hot Code Reload** | Requires restart | **Zero-downtime** deploys |
| **Distributed Clustering** | Manual (sticky sessions) | **Built-in** (Erlang distribution) |
| **GC Pauses** | ~10-100ms (V8 GC) | **Per-process GC** (no pauses) |

---

### Migration Strategy

#### Phase 1: Run Both in Parallel
1. Deploy Phoenix API alongside Bun API
2. Route 10% of traffic to Phoenix (canary deployment)
3. Monitor performance, error rates, latency
4. Gradually increase traffic to Phoenix (25% → 50% → 100%)

#### Phase 2: Database Layer (Shared)
- Both Bun and Phoenix use the **same PostgreSQL database**
- No schema changes needed
- Ecto (Elixir ORM) maps to existing tables

#### Phase 3: WebSocket Migration
1. New clients connect to Phoenix Channels
2. Keep Bun WebSocket for existing connections (graceful drain)
3. After 24h, all connections migrated to Phoenix

#### Phase 4: Decommission Bun API
1. Verify Phoenix handles 100% of traffic reliably
2. Keep Bun as backup for 1 week
3. Decommission Bun servers

**Total Migration Time**: 2-4 weeks (zero downtime)

---

### When to Migrate?

Consider migrating when:
- **WebSocket connections exceed 10K** (Bun performance degrades)
- **Uptime requirements exceed 99.9%** (need OTP fault tolerance)
- **Multi-region deployment** required (Elixir clustering shines)
- **Real-time latency becomes critical** (sub-ms message passing)
- **Development team comfortable with Elixir** (learning curve)

**Current Recommendation**: Start with Bun/TypeScript, migrate when production scale demands it.

---

## Future Database Strategy: Hot/Cold Data Separation

### Why Add ClickHouse?

PostgreSQL + TimescaleDB excels at **OLTP** (transactional queries), but **OLAP** (analytical queries) benefits from column-oriented storage.

#### Hot Data (PostgreSQL 17 + TimescaleDB)
- **Last 30 days** of price feeds
- **Real-time queries**: Sub-50ms response
- **ACID transactions**: Critical for FTSO submissions
- **Use Cases**: Latest prices, consensus calculations, API queries

#### Cold Data (ClickHouse)
- **Historical analytics** (months/years)
- **Column-oriented storage**: 100x faster for analytical queries
- **Compression**: 10-100x better than PostgreSQL
- **Use Cases**: Backtesting, ML training data, long-term trends

---

### Performance Comparison: PostgreSQL vs ClickHouse

| Query Type | PostgreSQL (30 days) | ClickHouse (2 years) |
|-----------|---------------------|---------------------|
| **Recent price (BTC/USD, last 24h)** | 20ms | Not needed (use PostgreSQL) |
| **Historical analysis (1 billion rows)** | 60+ seconds | **2 seconds** |
| **Aggregation (avg price, 6 months)** | 10-30 seconds | **<1 second** |
| **Storage (1 year, 100M rows)** | ~50 GB | **~5 GB** (compressed) |

---

### Architecture: Hot/Cold Data Split

```
┌─────────────────────────────────────────────────────┐
│              Elixir/Phoenix API                     │
└───────┬─────────────────────────────────────────────┘
        │
        ├──► PostgreSQL 17 + TimescaleDB (Hot Data)
        │    └─ Last 30 days
        │    └─ Real-time queries (<50ms)
        │    └─ ACID transactions
        │
        └──► ClickHouse (Cold Data)
             └─ Historical data (30+ days old)
             └─ Analytical queries (backtesting, ML)
             └─ 100x compression
```

#### Write Path
1. **Exchange workers** → Elixir API → **PostgreSQL** (real-time insert)
2. **Background job** (daily): Copy data older than 30 days → **ClickHouse**
3. **Optional**: Delete from PostgreSQL after replication (or keep for ACID guarantees)

#### Read Path
- **Real-time query** (last 24h): Elixir → **PostgreSQL** → 20ms response
- **Analytical query** (last 6 months): Elixir → **ClickHouse** → 2s response

---

### Code Example: Hot/Cold Query Routing

```elixir
# lib/chrono/price_queries.ex
defmodule Chrono.PriceQueries do
  # Route to PostgreSQL for recent data
  def get_prices(symbol, from, to) when time_range_days(from, to) <= 30 do
    Repo.all(
      from p in PriceFeed,
      where: p.symbol == ^symbol and p.timestamp >= ^from and p.timestamp <= ^to,
      order_by: [desc: p.timestamp]
    )
  end

  # Route to ClickHouse for historical data
  def get_prices(symbol, from, to) do
    Clickhousex.query(
      Chrono.Clickhouse,
      "SELECT * FROM price_feeds WHERE symbol = ? AND timestamp BETWEEN ? AND ? ORDER BY timestamp DESC",
      [symbol, from, to]
    )
  end
end
```

---

### ClickHouse Schema

```sql
-- ClickHouse table (optimized for analytics)
CREATE TABLE price_feeds (
    id UUID,
    symbol String,
    price Decimal64(8),
    volume Nullable(Decimal64(8)),
    timestamp DateTime64(3),
    source String,
    ingested_at DateTime64(3),
    worker_id Nullable(String),
    metadata String  -- JSON as String (ClickHouse has limited JSON support)
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)  -- Partition by month
ORDER BY (symbol, timestamp)
SETTINGS index_granularity = 8192;

-- Compression settings (10-100x reduction)
ALTER TABLE price_feeds MODIFY COLUMN price CODEC(DoubleDelta, ZSTD(3));
ALTER TABLE price_feeds MODIFY COLUMN volume CODEC(DoubleDelta, ZSTD(3));
```

**Result**: 1 billion rows compressed to ~5-10 GB, queries in 1-2 seconds

---

### When to Add ClickHouse?

Consider adding ClickHouse when:
- **PostgreSQL exceeds 100 GB** (compression would save 90%+)
- **Analytical queries take >10 seconds** (ClickHouse 10-100x faster)
- **Backtesting requirements** (need fast access to historical data)
- **ML training data** (need efficient bulk exports)
- **Cost optimization** (ClickHouse storage 10x cheaper)

**Current Recommendation**: Start with PostgreSQL, add ClickHouse when analytics workload justifies it.

---

## Technology Evolution Roadmap

### Phase 1: MVP (Current)
- **API**: Bun/TypeScript + Hono
- **Database**: PostgreSQL 17 (no TimescaleDB yet)
- **Cache**: Redis
- **Engine**: Rust (standalone)
- **Deployment**: Mac mini M4 Pro

**Target**: Prove FTSO concept, achieve 99% uptime

---

### Phase 2: Production-Ready
- **API**: Bun/TypeScript (optimize, harden)
- **Database**: PostgreSQL 17 + **TimescaleDB** (hypertables, compression)
- **Cache**: Redis Cluster (HA)
- **Engine**: Rust (NIFs for Bun via N-API)
- **Deployment**: Mac mini + cloud backup (Fly.io, Railway)

**Target**: 99.9% uptime, 10K+ price feeds/sec

---

### Phase 3: Scale (If Needed)
- **API**: **Elixir/Phoenix** (2M WebSocket connections, OTP fault tolerance)
- **Database (Hot)**: PostgreSQL 17 + TimescaleDB (last 30 days)
- **Database (Cold)**: **ClickHouse** (historical analytics)
- **Cache**: Redis (optional, Phoenix.PubSub handles WebSocket)
- **Engine**: Rust (NIFs for Elixir)
- **Deployment**: Multi-region cluster (Fly.io, AWS)

**Target**: 99.99% uptime, millions of delegators, global edge deployment

---

### Technology Decision Matrix

| Requirement | Bun/TypeScript | Elixir/Phoenix |
|------------|---------------|---------------|
| **Fast MVP** | ✅ Best (familiar, fast setup) | ⚠️ Learning curve |
| **<10K WebSocket** | ✅ Sufficient | ⚠️ Overkill |
| **>50K WebSocket** | ❌ Performance issues | ✅ Ideal (2M+ connections) |
| **99.9% Uptime** | ⚠️ Requires manual supervision | ✅ Built-in (OTP) |
| **99.99% Uptime** | ❌ Very difficult | ✅ Battle-tested (WhatsApp, Discord) |
| **Zero-Downtime Deploys** | ❌ Requires load balancer tricks | ✅ Native (hot code reload) |
| **Distributed System** | ⚠️ Manual (sticky sessions) | ✅ Native (Erlang clustering) |
| **ML/Heavy Compute** | ⚠️ Rust via N-API | ✅ Rust via NIFs (faster FFI) |

**Pragmatic Path**: Start with Bun, migrate to Elixir when scale/reliability demands it.

---

## References

- **Architecture**: `docs/architecture/system-design.md`
- **Data Flow**: `docs/architecture/data-flow.md`
- **Database Schema**: `docs/specs/CHRONO-004-core-data-models.md`
- **Bun Documentation**: https://bun.sh/docs
- **Hono Framework**: https://hono.dev/
- **TimescaleDB Setup**: `docs/setup/timescaledb-setup.md`

---

## Related Issues

- **CHRONO-004**: Core Data Models (Dependency)
- **CHRONO-006**: Exchange Data Collection (Will ingest via this API)
- **CHRONO-008**: Flare Network Integration (Will consume this API)

---

*"The API awakens. Data flows through the gateway, precise and swift. The Nexus pulses with life. En Taro Tassadar!"*

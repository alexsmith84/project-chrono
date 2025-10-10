# Project Chrono API

High-performance Bun/TypeScript API server for FTSO price feeds.

## Features

- **High-throughput ingestion**: 1000+ price feeds/second
- **Low-latency queries**: P95 < 200ms (cache hit: < 50ms)
- **Redis caching**: Hot data caching with pub/sub for WebSocket
- **PostgreSQL**: Time-series optimized schema with connection pooling
- **Authentication**: API key-based (internal/public/admin tiers)
- **Rate limiting**: Redis-backed sliding window (1-minute buckets)
- **Observability**: Prometheus metrics, structured logging, health checks

## Quick Start

### Prerequisites

- Bun 1.0+ (`curl -fsSL https://bun.sh/install | bash`)
- PostgreSQL 17+ (running on localhost:5432)
- Redis 6+ (running on localhost:6379)

### Installation

```bash
cd apps/api
bun install
```

### Configuration

Copy `.env.example` to `.env` and update values:

```bash
cp .env.example .env
```

Key configuration:

```env
DATABASE_URL=postgresql://alex@localhost:5432/project_chrono_dev
REDIS_URL=redis://localhost:6379
INTERNAL_API_KEYS=chrono_internal_dev_key_001
PUBLIC_API_KEYS=chrono_public_dev_key_001
```

### Run Migrations

Ensure database schema is created:

```bash
../../scripts/database/run-migration.sh run ../../migrations/001_initial_schema.sql
```

### Test Connections

Verify PostgreSQL and Redis connectivity:

```bash
bun run src/test-connection.ts
```

Expected output:
```
✅ PostgreSQL connection: OK
✅ All 7 database tables found
✅ Redis connection: OK
✅ All connection tests passed!
```

### Start Development Server

```bash
bun run dev
```

Server starts on `http://localhost:3000`

## API Endpoints

### Health & Metrics

```bash
# Health check
curl http://localhost:3000/health

# Prometheus metrics
curl http://localhost:3000/metrics
```

### Internal Endpoints (require internal API key)

#### Ingest Price Feeds

```bash
POST /internal/ingest
Authorization: Bearer chrono_internal_dev_key_001
```

Request body:
```json
{
  "worker_id": "binance-worker-001",
  "timestamp": "2025-10-10T00:00:00Z",
  "feeds": [
    {
      "symbol": "BTC/USD",
      "price": "67234.56",
      "volume": "1234.567890",
      "source": "binance",
      "timestamp": "2025-10-10T00:00:00Z"
    }
  ]
}
```

Example:
```bash
curl -X POST http://localhost:3000/internal/ingest \
  -H "Authorization: Bearer chrono_internal_dev_key_001" \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": "test-worker",
    "timestamp": "2025-10-10T00:00:00Z",
    "feeds": [{
      "symbol": "BTC/USD",
      "price": "67234.56",
      "source": "test",
      "timestamp": "2025-10-10T00:00:00Z"
    }]
  }'
```

### Public Endpoints (require public API key)

#### Latest Prices

```bash
GET /prices/latest?symbols=BTC/USD,ETH/USD
Authorization: Bearer chrono_public_dev_key_001
```

Example:
```bash
curl "http://localhost:3000/prices/latest?symbols=BTC/USD,ETH/USD" \
  -H "Authorization: Bearer chrono_public_dev_key_001"
```

#### Price Range

```bash
GET /prices/range?symbol=BTC/USD&from=2025-10-09T00:00:00Z&to=2025-10-10T00:00:00Z&interval=1h&limit=100
Authorization: Bearer chrono_public_dev_key_001
```

Example:
```bash
curl "http://localhost:3000/prices/range?symbol=BTC/USD&from=2025-10-09T00:00:00Z&to=2025-10-10T00:00:00Z" \
  -H "Authorization: Bearer chrono_public_dev_key_001"
```

#### Consensus Prices

```bash
GET /aggregates/consensus?symbols=BTC/USD,ETH/USD
Authorization: Bearer chrono_public_dev_key_001
```

Example:
```bash
curl "http://localhost:3000/aggregates/consensus?symbols=BTC/USD" \
  -H "Authorization: Bearer chrono_public_dev_key_001"
```

## Rate Limits

| API Key Type | Rate Limit |
|--------------|------------|
| Internal | 5000 req/min |
| Public | 1000 req/min |
| Admin | Unlimited |

Rate limit headers:
- `X-RateLimit-Limit`: Maximum requests per minute
- `X-RateLimit-Remaining`: Requests remaining in current window
- `X-RateLimit-Reset`: Unix timestamp when limit resets

## Performance Targets

| Metric | Target |
|--------|--------|
| Ingestion Throughput | 1000 feeds/sec |
| Ingestion Latency (P95) | < 50ms |
| API Response (P95) | < 200ms (cache miss) |
| Cache Hit Latency (P95) | < 50ms |
| Memory Usage | < 512 MB |

## Development

### Scripts

```bash
# Development with hot reload
bun run dev

# Production
bun run start

# Test connections
bun run src/test-connection.ts

# Type checking
bun run type-check
```

### Project Structure

```
apps/api/
├── src/
│   ├── index.ts              # Entry point
│   ├── server.ts             # Hono app setup
│   ├── routes/
│   │   ├── internal/         # Internal endpoints
│   │   │   └── ingest.ts     # POST /internal/ingest
│   │   ├── public/           # Public endpoints
│   │   │   ├── prices.ts     # GET /prices/*
│   │   │   └── aggregates.ts # GET /aggregates/*
│   │   └── health.ts         # GET /health, /metrics
│   ├── db/
│   │   ├── client.ts         # PostgreSQL connection pool
│   │   ├── types.ts          # Database types
│   │   └── queries/          # Query functions
│   ├── cache/
│   │   ├── redis.ts          # Redis client
│   │   ├── price-cache.ts    # Caching logic
│   │   └── pubsub.ts         # Pub/sub for WebSocket
│   ├── middleware/
│   │   ├── auth.ts           # API key authentication
│   │   ├── rate-limit.ts     # Rate limiting
│   │   └── request-context.ts # Request ID, timing, errors
│   ├── schemas/
│   │   ├── ingest.ts         # Ingestion schemas
│   │   ├── queries.ts        # Query parameter schemas
│   │   └── responses.ts      # Response schemas
│   └── utils/
│       ├── config.ts         # Configuration (Zod validated)
│       ├── logger.ts         # Structured logging (Pino)
│       └── metrics.ts        # Prometheus metrics
└── tests/
    ├── integration/
    └── unit/
```

## Monitoring

### Prometheus Metrics

Access metrics at `http://localhost:3000/metrics`

Key metrics:
- `http_request_duration_ms` - Request latency histogram
- `price_ingestions_total` - Total price feeds ingested
- `price_ingestion_duration_ms` - Ingestion latency
- `cache_operations_total` - Cache hits/misses
- `rate_limit_rejections_total` - Rate limit violations
- `api_errors_total` - API errors by code

### Logs

Structured JSON logs with Pino:
- Development: Pretty-printed colorized output
- Production: JSON format for log aggregation

## Troubleshooting

### Connection Errors

Run the connection test to diagnose:
```bash
bun run src/test-connection.ts
```

### PostgreSQL Connection Failed

- Ensure PostgreSQL is running: `brew services list | grep postgresql`
- Check DATABASE_URL in `.env` matches your user/database
- Verify database exists: `psql -l | grep project_chrono_dev`

### Redis Connection Failed

- Ensure Redis is running: `redis-cli ping`
- Start Redis: `brew services start redis`

### Rate Limit Issues

Rate limits are per API key with 1-minute sliding windows. Wait 60 seconds or use a different API key.

## Next Steps

- [ ] Implement WebSocket server for real-time streaming
- [ ] Add integration tests
- [ ] Enable TimescaleDB for hypertables and compression
- [ ] Add GraphQL API
- [ ] Multi-region deployment

## Related Documentation

- **Specification**: `docs/specs/CHRONO-007-api-layer.md`
- **Architecture**: `docs/architecture/system-design.md`
- **Database Schema**: `docs/specs/CHRONO-004-core-data-models.md`
- **GitHub Issue**: #19

---

*"The API awakens. Data flows through the gateway, precise and swift. En Taro Tassadar!"*

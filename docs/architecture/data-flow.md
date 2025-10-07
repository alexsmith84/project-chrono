# Data Flow Architecture - Project Chrono

*"From edge to core to blockchain. The path of data through the Khala."*

---

## Overview

This document details how data flows through Project Chrono's architecture, from initial price collection at the edge to final FTSO submission on the Flare Network.

---

## Flow 1: Real-Time Price Collection

### Step-by-Step Flow

```
1. Cloudflare Worker (Edge)
   └─> Poll exchange API every 30 seconds
   └─> Normalize: { symbol, price, volume, timestamp, source }
   └─> POST to nexus.hayven.xyz/internal/ingest

2. Caddy Reverse Proxy
   └─> Authenticate internal request
   └─> Forward to Bun API (localhost:3000)

3. Bun API Server
   └─> Validate payload schema
   └─> Enrich with metadata
   └─> INSERT into PostgreSQL (price_feeds table)
   └─> PUBLISH to Redis channel "prices"

4. Redis Pub/Sub
   └─> Broadcast to all WebSocket subscribers

5. WebSocket Server (Bun)
   └─> Receive from Redis
   └─> Push to connected clients (SvelteKit UI)

6. SvelteKit Dashboard
   └─> Update UI in real-time
   └─> Display latest price feed
```

### Data Transformation

**Worker Output**:

```json
{
  "symbol": "BTC/USD",
  "price": 45123.45,
  "volume": 123.456,
  "timestamp": "2025-10-04T12:00:00Z",
  "source": "coinbase"
}
```

**After API Enrichment**:

```json
{
  "id": "uuid-here",
  "symbol": "BTC/USD",
  "price": 45123.45,
  "volume": 123.456,
  "timestamp": "2025-10-04T12:00:00Z",
  "source": "coinbase",
  "ingested_at": "2025-10-04T12:00:01Z",
  "worker_id": "worker-1",
  "metadata": {
    "exchange_timestamp": "2025-10-04T11:59:58Z",
    "api_latency_ms": 45
  }
}
```

---

## Flow 2: Price Aggregation & Consensus

### Step-by-Step Flow

```
1. Scheduler (Cron/Tokio)
   └─> Trigger every 90 seconds (FTSO epoch)

2. Bun Orchestrator
   └─> Query PostgreSQL: SELECT prices WHERE timestamp > NOW() - INTERVAL '3 minutes'
   └─> Group by symbol
   └─> POST to Rust Engine: forge.hayven.xyz/aggregate

3. Rust Aggregation Engine
   └─> Calculate VWAP (Volume-Weighted Average Price)
   └─> Calculate TWAP (Time-Weighted Average Price)
   └─> Calculate weighted median
   └─> Run ML anomaly detection
   └─> Determine consensus price (multi-algorithm voting)
   └─> Return aggregated price

4. Bun API
   └─> Receive aggregated price from Rust
   └─> INSERT into aggregated_prices table
   └─> SET in Redis: price:BTC:latest (5-min TTL)
   └─> Return to scheduler

5. FTSO Submission Preparation
   └─> Price ready for blockchain submission
```

### Aggregation Algorithm

**Input** (from PostgreSQL):

```json
[
  { "source": "coinbase", "price": 45120, "volume": 100, "timestamp": "12:00:00" },
  { "source": "binance", "price": 45125, "volume": 150, "timestamp": "12:00:15" },
  { "source": "kraken", "price": 45118, "volume": 80, "timestamp": "12:00:30" }
]
```

**Rust Processing**:

```rust
// VWAP Calculation
total_value = Σ(price × volume) = (45120×100) + (45125×150) + (45118×80)
total_volume = Σ(volume) = 100 + 150 + 80 = 330
vwap = total_value / total_volume = 45121.82

// Anomaly Detection
if |price - median| > 3×std_dev { flag_as_outlier() }

// Consensus
consensus_price = weighted_vote([vwap, twap, median])
```

**Output**:

```json
{
  "symbol": "BTC/USD",
  "consensus_price": 45121.82,
  "confidence": 0.95,
  "sources_used": 3,
  "algorithm": "weighted_consensus",
  "timestamp": "2025-10-04T12:01:30Z"
}
```

---

## Flow 3: FTSO Blockchain Submission

### Step-by-Step Flow

```
1. Epoch Timer
   └─> Trigger at FTSO epoch boundary (every 90s)

2. Blockchain Module (Rust)
   └─> Fetch consensus price from Redis/DB
   └─> Format for FTSO contract
   └─> Prepare transaction data

3. Hardware Wallet (Ledger)
   └─> Load private key (never touches disk)
   └─> Sign transaction
   └─> Return signed transaction

4. RPC Client (Rust)
   └─> Submit to Flare Network RPC
   └─> Monitor transaction hash
   └─> Wait for confirmation

5. Confirmation Handler
   └─> Transaction confirmed
   └─> INSERT into submissions_log
   └─> Update success metrics
   └─> If failed: Retry logic

6. Reward Monitoring (Scheduled)
   └─> Query FTSO contract for rewards
   └─> Calculate earned FLR
   └─> Auto-claim if threshold met
```

### Transaction Flow

**FTSO Submission Payload**:

```rust
struct FTSOSubmission {
    epoch_id: u64,
    prices: Vec<PriceData>,
    timestamp: u64,
    signature: Vec<u8>,
}

// Price data format
struct PriceData {
    symbol: String,      // "BTC"
    price: u128,         // 45121820000 (8 decimals)
    confidence: u8,      // 95 (0-100)
}
```

**Gas Optimization**:

- Batch multiple symbols in one transaction
- Dynamic gas price based on network congestion
- Target: <$0.10 per submission

---

## Flow 4: WebSocket Real-Time Updates

### Step-by-Step Flow

```
1. Client Connection
   └─> SvelteKit opens WebSocket: wss://nexus.hayven.xyz/ws
   └─> Caddy upgrades connection
   └─> Routes to Bun WebSocket server

2. Subscription
   └─> Client sends: { "action": "subscribe", "symbols": ["BTC", "ETH"] }
   └─> Server stores subscription in memory

3. Price Update (triggered by Redis)
   └─> Redis: PUBLISH prices { ... }
   └─> Bun WebSocket server receives
   └─> Filter by client subscriptions
   └─> Send to subscribed clients only

4. Client Receives
   └─> { "type": "price_update", "data": { ... } }
   └─> SvelteKit updates UI
   └─> Chart updates in real-time
```

### WebSocket Message Protocol

**Client → Server**:

```json
{
  "action": "subscribe",
  "symbols": ["BTC", "ETH", "FLR"],
  "client_id": "uuid"
}
```

**Server → Client** (Price Update):

```json
{
  "type": "price_update",
  "data": {
    "symbol": "BTC/USD",
    "price": 45121.82,
    "change_24h": 2.5,
    "timestamp": "2025-10-04T12:01:30Z"
  }
}
```

**Server → Client** (FTSO Submission):

```json
{
  "type": "ftso_submission",
  "data": {
    "epoch": 12345,
    "status": "confirmed",
    "tx_hash": "0x...",
    "gas_used": 45000
  }
}
```

---

## Flow 5: API Request Handling

### Public API Request Flow

```
1. Client Request
   └─> GET gateway.hayven.xyz/api/v1/price/BTC
   └─> Include: X-API-Key header

2. Caddy
   └─> Apply rate limit (30 req/min)
   └─> Check CORS headers
   └─> Forward to Bun API

3. Bun API
   └─> Validate API key
   └─> Check Redis cache: GET price:BTC:latest

4a. Cache Hit
   └─> Return cached price (sub-ms response)

4b. Cache Miss
   └─> Query PostgreSQL
   └─> Calculate on-demand (if no recent aggregation)
   └─> Cache result (5-min TTL)
   └─> Return price

5. Response
   └─> JSON with price data
   └─> Headers: rate limit info
```

### Response Format

```json
{
  "symbol": "BTC/USD",
  "price": 45121.82,
  "timestamp": "2025-10-04T12:01:30Z",
  "sources": 3,
  "confidence": 0.95,
  "cache": {
    "hit": true,
    "ttl_seconds": 287
  },
  "rate_limit": {
    "limit": 30,
    "remaining": 25,
    "reset_at": "2025-10-04T12:02:00Z"
  }
}
```

---

## Data Storage Strategy

### Hot Data (Redis - 5 min TTL)

- Latest aggregated prices
- Active WebSocket sessions
- Rate limit counters

### Warm Data (PostgreSQL - Recent)

- Last 7 days: Uncompressed, fast queries
- Used for real-time aggregation

### Cold Data (PostgreSQL + TimescaleDB - Compressed)

- 7 days to 2 years: Compressed, slower queries
- Used for historical analysis, backtesting

### Archive (Future - S3-compatible)
>
- >2 years: Compressed archives
- Used for long-term analysis only

---

## Performance Characteristics

### Latency Targets

| Flow | Target | Typical |
|------|--------|---------|
| Worker → API | <100ms | 45ms |
| API → Database Insert | <50ms | 20ms |
| Redis Pub/Sub | <10ms | 3ms |
| WebSocket Push | <50ms | 15ms |
| Price Aggregation | <10ms | 7ms |
| FTSO Submission | <5s | 2.5s |
| API Response (cached) | <50ms | 5ms |
| API Response (uncached) | <200ms | 85ms |

### Throughput

- **Price Ingestion**: 100 prices/second (3 exchanges × 30 symbols)
- **WebSocket Updates**: 1000 concurrent connections
- **API Requests**: 500 req/second sustained
- **Aggregation**: 10,000 calculations/second (Rust)

---

*"The data flows. The Khala unites all. En Taro Tassadar!"*

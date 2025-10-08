# System Design - Project Chrono

*"The architecture of the Protoss, refined over millennia. Efficiency. Power. Unity."*

---

## Overview

Project Chrono implements a hybrid edge + self-hosted architecture for FTSO price oracle operations. The system combines Cloudflare Workers for geographically distributed data collection with self-hosted Mac Mini M4 Pro processing for performance and cost optimization.

### Core Design Principles

1. **Performance First**: Sub-10ms price aggregation, <200ms API responses
2. **Cost Optimization**: Self-hosted core ($70-220/month) vs pure cloud ($375-1,250/month)
3. **Fault Tolerance**: Multi-source redundancy, automatic failover, graceful degradation
4. **Security by Design**: Multi-layer defense, zero-trust internal communication
5. **Observable Systems**: Comprehensive monitoring, proactive alerting, debugging insights

---

## High-Level Architecture

```
Edge Layer (Cloudflare Workers)
    ↓
Core Processing (Mac Mini M4 Pro)
    ├── Rust Engine (Price Aggregation, ML, Consensus)
    ├── TypeScript API (REST, WebSocket, Orchestration)
    ├── PostgreSQL + TimescaleDB (Time-series storage)
    └── Redis (Cache + Pub/Sub)
    ↓
Blockchain Layer (Flare Network)
    ↓
Frontend (SvelteKit Dashboard)
```

---

## Component Architecture

### 1. Edge Layer (Cloudflare Workers)

**Purpose**: Geographically distributed price data collection

**Technology**: TypeScript/JavaScript (Cloudflare Workers runtime)

**Responsibilities**:

- Collect price data from exchange APIs
- Normalize data to common format
- Handle rate limiting and quotas
- Implement retry logic with exponential backoff
- Forward sanitized data to core processing

**Why Edge**: Bypass geo-restrictions, lower latency to exchanges, isolation per worker

---

### 2. Rust Engine (Core Processing)

**Purpose**: High-performance price aggregation and consensus

**Technology**: Rust 1.75+, Tokio async runtime, Actix-web

**Responsibilities**:

- VWAP (Volume-Weighted Average Price) calculation
- TWAP (Time-Weighted Average Price) calculation
- Weighted median calculation
- Multi-source consensus algorithm
- ML-based anomaly detection
- Performance-critical blockchain operations

**Performance Targets**:

- Aggregation: <10ms for 1000 data points
- Memory: <500MB under normal load
- Throughput: 10,000+ calculations/second

**Why Rust**: 40% faster than Docker containers, memory safety, zero-cost abstractions

---

### 3. TypeScript API (Bun Runtime)

**Purpose**: REST/WebSocket API, orchestration, Web3 integration

**Technology**: Bun 1.0+, Hono framework, ws library, ethers.js

**Responsibilities**:

- REST API for external consumers
- WebSocket server for real-time price feeds
- Orchestrate Rust engine calls
- Web3 wallet integration
- User authentication and authorization
- Rate limiting and API key management

**Performance Targets**:

- API Response: P95 <200ms, P99 <500ms
- WebSocket Latency: <50ms for price updates
- Concurrent Connections: 1000+ WebSocket clients

**Why Bun**: 3x faster than Node.js, native TypeScript, built-in WebSocket

---

### 4. Database Layer

#### PostgreSQL + TimescaleDB

**Purpose**: Time-series optimized price data storage

**Technology**: PostgreSQL 15, TimescaleDB 2.13+

**Key Features**:

- Hypertables with 1-hour chunks for price_feeds
- Compression after 7 days (10-20x storage savings)
- 2-year retention policy
- Indexes optimized for (symbol, timestamp) queries
- Continuous aggregates for pre-computed summaries

**Why TimescaleDB**: 100-1000x faster than vanilla PostgreSQL for time queries

#### Redis Cache

**Purpose**: High-speed caching and pub/sub

**Technology**: Redis 7.2+, Redis Streams

**Usage Patterns**:

- Cache recent prices (5-minute TTL)
- Pub/Sub for real-time updates
- Rate limiting (sliding window)
- Session storage

**Why Redis**: Sub-millisecond latency, perfect for real-time needs

---

### 5. Blockchain Integration (Rust)

**Purpose**: Flare Network FTSO submissions

**Technology**: Rust, ethers-rs, Hardware wallet support (Ledger)

**Responsibilities**:

- Connect to Flare RPC nodes
- Sign and submit price data transactions
- Monitor transaction status
- Calculate and claim rewards
- Gas optimization

**Why Rust for Blockchain**: Memory safety critical for financial operations, hardware wallet never touches disk

**Gas Optimization**: <$0.10 per submission target

---

### 6. Frontend (SvelteKit)

**Purpose**: Delegation dashboard and analytics UI

**Technology**: SvelteKit 2.0+, Tailwind CSS, Chart.js, ethers.js

**Responsibilities**:

- Display real-time price feeds
- Show delegation statistics
- Wallet connection (MetaMask, WalletConnect)
- Analytics dashboards
- Admin controls

**Why SvelteKit**: Fast, small bundle size, excellent DX, SSR with client hydration

---

## Data Flow Patterns

### Real-Time Price Collection Flow

1. Cloudflare Worker polls exchange API (every 30s)
2. Worker normalizes data → `{ symbol, price, volume, timestamp, source }`
3. Worker POSTs to API: `POST /internal/ingest`
4. API validates & stores in PostgreSQL
5. API publishes to Redis: `PUBLISH prices`
6. WebSocket server receives from Redis
7. WebSocket broadcasts to connected clients
8. SvelteKit UI updates in real-time

### Price Aggregation Flow

1. Scheduler triggers aggregation (every 90s for FTSO epoch)
2. API queries PostgreSQL for recent prices (last 3 minutes)
3. API calls Rust engine: `POST /aggregate`
4. Rust calculates VWAP, TWAP, median
5. Rust runs ML anomaly detection
6. Rust determines consensus price
7. Return to API → Store in DB → Cache in Redis
8. Price ready for FTSO submission

### FTSO Submission Flow

1. Epoch timer triggers (every 90 seconds)
2. Fetch aggregated price from cache/DB
3. Rust blockchain module prepares transaction
4. Sign with hardware wallet
5. Submit to Flare Network
6. Monitor transaction status
7. Update submission_log table
8. Alert if submission fails

---

## Security Architecture

### Multi-Layer Defense

**Layer 1: Network** (Caddy + macOS Firewall)

- HTTPS only (automatic Let's Encrypt)
- Rate limiting (100 req/min per IP)
- DDoS protection (Cloudflare)

**Layer 2: Application** (API + Authentication)

- API key authentication
- JWT tokens (15-minute expiry)
- Role-based access control (RBAC)

**Layer 3: Data** (Encryption)

- PostgreSQL SSL connections required
- Redis AUTH enabled
- Secrets in environment variables

**Layer 4: Blockchain** (Hardware Wallet)

- Private keys on Ledger device
- Transaction signing requires physical confirmation
- Multi-sig for high-value operations (future)

---

## Monitoring & Observability

### Metrics Collection (Prometheus)

**System Metrics**: CPU, memory, disk, network utilization

**Application Metrics**: API response times, WebSocket connections, aggregation speed

**Business Metrics**: FTSO submission success, accuracy score, rewards earned, delegation amounts

### Visualization (Grafana)

**Dashboards**:

1. System Health (infrastructure metrics)
2. API Performance (response times, error rates)
3. FTSO Operations (submissions, accuracy, rewards)
4. Business Analytics (delegation growth, market share)

---

## Deployment Architecture

### Domain Routing (via Caddy)

- `nexus.hayven.xyz` → API (port 3000)
- `probe.hayven.xyz` → Worker status (port 3001)
- `forge.hayven.xyz` → Rust engine metrics (port 8080)
- `gateway.hayven.xyz` → Public API (rate-limited)
- `templar.hayven.xyz` → SvelteKit dashboard (port 5173)

---

## Technology Decision Matrix

| Component | Technology | Alternative | Why Chosen |
|-----------|------------|-------------|------------|
| Core Processing | Rust | Go, C++ | Memory safety + speed |
| API Server | Bun | Node.js, Deno | 3x faster, native TS |
| Database | PostgreSQL + TimescaleDB | ClickHouse | Better tooling |
| Cache | Redis | Memcached | Pub/sub + persistence |
| Frontend | SvelteKit | React, Vue | Small bundle, fast |
| Edge | Cloudflare Workers | AWS Lambda@Edge | Better DX, lower cost |

---

*"The architecture stands complete. Purity of form. Purity of function. En Taro Tassadar!"*

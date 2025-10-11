# Load Testing - Project Chrono

This document describes the load testing approach, results, and performance baselines for the Project Chrono API.

---

## Overview

Load testing ensures the API can handle expected production traffic and identifies performance bottlenecks before deployment.

**Testing Tool**: [k6](https://k6.io/) - Modern load testing tool with JavaScript DSL

**Test Coverage**:

- ✅ Price feed ingestion (`POST /internal/ingest`)
- ✅ Price queries (`GET /prices/*`)
- ✅ Consensus aggregates (`GET /aggregates/*`)
- ✅ WebSocket streaming (`/stream`)

---

## Quick Start

### Prerequisites

Install k6:

```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Run All Tests

```bash
# Start API server (in apps/api)
bun run dev

# Run all load tests (in project root)
./scripts/helpers/run-load-tests.sh
```

### Run Individual Tests

```bash
# Ingestion only
./scripts/helpers/run-load-tests.sh ingestion

# Queries only
./scripts/helpers/run-load-tests.sh queries

# WebSocket only
./scripts/helpers/run-load-tests.sh websocket
```

---

## Test Scenarios

### 1. Ingestion Load Test

**File**: `apps/api/tests/load/ingestion.load.js`

**Scenario**: Simulates Cloudflare Workers ingesting price feeds from exchanges

**Load Pattern**:

```
10 users  (30s ramp, 1m sustained)
  ↓
50 users  (30s ramp, 1m sustained)
  ↓
100 users (30s ramp, 1m sustained)
  ↓
0 users   (30s ramp down)
```

**Total Duration**: ~5 minutes

**Test Behavior**:

- Each VU (Virtual User) sends batches of 1-50 price feeds
- Random symbols: BTC/USD, ETH/USD, XRP/USD, etc.
- Random sources: coinbase, binance, kraken, etc.
- 1-3 second delay between requests

**Performance Targets**:

- ✅ P95 latency < 100ms
- ✅ P99 latency < 200ms
- ✅ Error rate < 1%
- ✅ Successfully handle 100+ concurrent writers

---

### 2. Query Endpoints Load Test

**File**: `apps/api/tests/load/queries.load.js`

**Scenario**: Simulates users and systems querying price data

**Load Pattern**:

```
20 users  (30s ramp, 2m sustained)
  ↓
100 users (30s ramp, 2m sustained)
  ↓
200 users (30s ramp, 1m sustained)
  ↓
0 users   (30s ramp down)
```

**Total Duration**: ~7 minutes

**Test Behavior**:

- Randomly executes different query types:
  - `GET /prices/latest` (single and multi-symbol)
  - `GET /prices/range` (raw data and OHLCV aggregates)
  - `GET /aggregates/consensus` (current and historical)
- 0.5-2.5 second think time between requests

**Performance Targets**:

- ✅ P95 latency < 100ms
- ✅ P99 latency < 200ms
- ✅ Cache hit rate > 50%
- ✅ Error rate < 1%
- ✅ Successfully handle 200+ concurrent readers

---

### 3. WebSocket Load Test

**File**: `apps/api/tests/load/websocket.load.js`

**Scenario**: Simulates real-time price feed subscribers

**Load Pattern**:

```
50 users   (1m ramp, 2m sustained)
  ↓
200 users  (1m ramp, 2m sustained)
  ↓
500 users  (1m ramp, 2m sustained)
  ↓
0 users    (1m ramp down)
```

**Total Duration**: ~10 minutes

**Test Behavior**:

- Each VU opens WebSocket connection
- Subscribes to 1-3 random symbols
- Maintains connection for 30-60 seconds
- Sends heartbeat pings every 10 seconds
- 50% gracefully unsubscribe before disconnect

**Performance Targets**:

- ✅ P95 connection time < 500ms
- ✅ P95 message latency < 100ms
- ✅ Connection error rate < 5%
- ✅ Message error rate < 1%
- ✅ Successfully handle 500+ concurrent connections

---

## Performance Baselines

### Local Development Environment

**System**: macOS (Apple Silicon M1/M2/M3), 16GB RAM, PostgreSQL 17, Redis 7

#### Ingestion Test Results

**Status**: 🟡 Baseline pending - run tests to establish

| Metric      | Target     | Actual | Status |
| ----------- | ---------- | ------ | ------ |
| Throughput  | 100+ req/s | _TBD_  | -      |
| P95 Latency | < 100ms    | _TBD_  | -      |
| P99 Latency | < 200ms    | _TBD_  | -      |
| Error Rate  | < 1%       | _TBD_  | -      |
| Feeds/sec   | 1000+      | _TBD_  | -      |

**Notes**: _Document observations here after running tests_

---

#### Query Test Results

**Status**: 🟡 Baseline pending - run tests to establish

| Metric         | Target     | Actual | Status |
| -------------- | ---------- | ------ | ------ |
| Throughput     | 200+ req/s | _TBD_  | -      |
| P95 Latency    | < 100ms    | _TBD_  | -      |
| P99 Latency    | < 200ms    | _TBD_  | -      |
| Cache Hit Rate | > 50%      | _TBD_  | -      |
| Error Rate     | < 1%       | _TBD_  | -      |

**Notes**: _Document observations here after running tests_

---

#### WebSocket Test Results

**Status**: 🟡 Baseline pending - run tests to establish

| Metric            | Target  | Actual | Status |
| ----------------- | ------- | ------ | ------ |
| Max Connections   | 500+    | _TBD_  | -      |
| P95 Connect Time  | < 500ms | _TBD_  | -      |
| P95 Msg Latency   | < 100ms | _TBD_  | -      |
| Connection Errors | < 5%    | _TBD_  | -      |
| Message Errors    | < 1%    | _TBD_  | -      |

**Notes**: _Document observations here after running tests_

---

### Staging Environment

**System**: _TBD - Document staging infrastructure_

**Status**: 🔴 Not yet tested

_Results will be documented after staging deployment_

---

### Production Environment

**System**: _TBD - Document production infrastructure_

**Status**: 🔴 Not yet tested

_Results will be documented after production deployment_

---

## Interpreting Results

### Understanding k6 Output

k6 provides comprehensive metrics after each test run:

```
scenarios: (100.00%) 1 scenario, 100 max VUs, 5m30s max duration
default: Up to 100 looping VUs for 5m0s (gracefulStop: 30s)

✓ status is 201
✓ response has ingested count
✓ ingested count matches
✓ response time < 100ms

checks.........................: 99.50% ✓ 39800   ✗ 200
data_received..................: 12 MB  40 kB/s
data_sent......................: 8.9 MB 30 kB/s
http_req_duration..............: avg=45ms   min=2ms med=40ms max=250ms p(95)=95ms p(99)=180ms
  { expected_response:true }...: avg=45ms   min=2ms med=40ms max=250ms p(95)=95ms p(99)=180ms
http_req_failed................: 0.50%  ✓ 200     ✗ 39800
http_reqs......................: 40000  133.33/s
iteration_duration.............: avg=1.5s   min=1s  med=1.4s max=3s
iterations.....................: 40000  133.33/s
vus............................: 1      min=1     max=100
vus_max........................: 100    min=100   max=100
```

**Key Metrics**:

- **checks**: Percentage of validation checks that passed (target: > 99%)
- **http_req_duration**: Request latency statistics
  - `avg`: Average response time
  - `p(95)`: 95th percentile (95% of requests faster than this)
  - `p(99)`: 99th percentile (99% of requests faster than this)
- **http_req_failed**: Percentage of failed requests (target: < 1%)
- **http_reqs**: Total requests and requests per second

### Custom Metrics

Our tests also track custom metrics:

**Ingestion**:

- `feeds_ingested`: Total price feeds successfully ingested
- `ingestion_duration`: Time to ingest each batch

**Queries**:

- `cache_hits`: Percentage of requests served from cache
- `queries_executed`: Total queries across all endpoints
- `latest_prices_duration`: Latency for `/prices/latest`
- `price_range_duration`: Latency for `/prices/range`
- `consensus_duration`: Latency for `/aggregates/consensus`

**WebSocket**:

- `connections_established`: Total WebSocket connections
- `messages_received`: Total messages received by clients
- `ws_connection_duration`: Time to establish connection
- `ws_message_latency`: Time from message creation to client receipt
- `ws_connection_errors`: Connection failures
- `ws_message_errors`: Message parsing/handling errors

---

## Troubleshooting

### Common Issues

#### 1. API Health Check Fails

**Symptom**: Test script exits with "API not healthy"

**Causes**:

- API server not running
- Wrong API URL
- Database not connected

**Solution**:

```bash
# Start API server
cd apps/api
bun run dev

# Verify health
curl http://localhost:3000/health
```

---

#### 2. High Error Rates (> 1%)

**Symptom**: `http_req_failed` or `errors` metric > 1%

**Causes**:

- Rate limiting triggered
- Database connection pool exhausted
- Redis connection limits reached
- Server resources (CPU/RAM) maxed out

**Solution**:

```bash
# Check API logs
cd apps/api
bun run dev  # Check console output

# Check PostgreSQL connections
psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# Check Redis connections
redis-cli CLIENT LIST | wc -l

# Monitor system resources
top  # or htop
```

---

#### 3. Slow Response Times (P95 > target)

**Symptom**: `http_req_duration` p(95) exceeds threshold

**Causes**:

- Database queries not optimized
- Missing indexes
- Cache not working
- High CPU/disk I/O

**Solution**:

- Check database query performance (see CURRENT-STATUS.md performance metrics)
- Verify indexes exist (run migration verification queries)
- Check Redis cache hit rate
- Monitor system resources

---

#### 4. Low Cache Hit Rate (< 50%)

**Symptom**: `cache_hits` metric below 50%

**Causes**:

- Cache TTL too short
- Redis not running
- Cache keys not matching

**Solution**:

```bash
# Check Redis is running
redis-cli PING

# Check cache statistics
redis-cli INFO stats

# Monitor cache in real-time
redis-cli MONITOR
```

---

#### 5. WebSocket Connection Failures

**Symptom**: `ws_connection_errors` > 5%

**Causes**:

- Server connection limits
- Memory exhausted
- Network/firewall issues

**Solution**:

- Check server logs for WebSocket upgrade failures
- Monitor server memory usage
- Increase system file descriptor limits if needed:
  ```bash
  ulimit -n 10000
  ```

---

## Performance Optimization Tips

### Database

1. **Connection Pooling**: Ensure PostgreSQL pool size is adequate
   - Default: 20 connections
   - Recommendation for load testing: 50-100

2. **Indexes**: Verify indexes exist on frequently queried columns

   ```sql
   -- Check index usage
   SELECT schemaname, tablename, indexname, idx_scan
   FROM pg_stat_user_indexes
   ORDER BY idx_scan DESC;
   ```

3. **Query Optimization**: Use `EXPLAIN ANALYZE` for slow queries

### Caching

1. **Cache TTL**: Balance freshness vs hit rate
   - Latest prices: 2 seconds (current)
   - Consider increasing to 5s for higher hit rate

2. **Cache Warming**: Pre-populate cache before load tests
   ```bash
   # Warm cache with popular symbols
   for symbol in BTC/USD ETH/USD XRP/USD; do
     curl "http://localhost:3000/prices/latest?symbols=$symbol" \
       -H "Authorization: Bearer chrono_public_dev_key_001"
   done
   ```

### Server Configuration

1. **Increase Connection Limits**:

   ```typescript
   // apps/api/src/db/client.ts
   export const pool = new Pool({
     max: 100, // Increase for load testing
   });
   ```

2. **Tune Redis**:

   ```bash
   # /opt/homebrew/etc/redis.conf
   maxclients 10000
   ```

3. **Monitor Resource Usage**:
   - CPU: Should stay < 80%
   - Memory: Should stay < 80%
   - Connections: Should be well below limits

---

## Next Steps

### 1. Establish Baselines

- [ ] Run load tests on local development environment
- [ ] Document results in this file (Performance Baselines section)
- [ ] Identify any performance issues or bottlenecks
- [ ] Optimize if needed and re-test

### 2. Set Up Monitoring

- [ ] Configure Prometheus metrics collection
- [ ] Set up Grafana dashboards
- [ ] Add alerts for threshold violations
- [ ] Monitor during load tests

### 3. Staging Environment Testing

- [ ] Deploy to staging environment
- [ ] Run load tests against staging
- [ ] Compare results to local baseline
- [ ] Document staging performance characteristics

### 4. Production Readiness

- [ ] Establish production performance targets
- [ ] Create runbook for handling load issues
- [ ] Set up automated load testing in CI/CD
- [ ] Plan capacity based on load test results

---

## References

- [k6 Documentation](https://k6.io/docs/)
- [k6 Best Practices](https://k6.io/docs/misc/fine-tuning-os/)
- [PostgreSQL Performance Tuning](https://wiki.postgresql.org/wiki/Performance_Optimization)
- [Redis Performance](https://redis.io/docs/management/optimization/)

---

_"Power overwhelming! Your API is ready for the swarm."_

# Load Testing with k6

This directory contains k6 load test scripts for the Project Chrono API.

## Prerequisites

### Install k6

**macOS (Homebrew)**:
```bash
brew install k6
```

**Linux**:
```bash
# Debian/Ubuntu
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows (Chocolatey)**:
```powershell
choco install k6
```

**Or download from**: https://k6.io/docs/getting-started/installation/

---

## Test Scripts

### 1. Ingestion Load Test (`ingestion.load.js`)

Tests the `POST /internal/ingest` endpoint performance.

**What it tests**:
- Batch ingestion with varying payload sizes (1-50 feeds)
- High throughput write operations
- Database insertion performance
- API response times under load

**Load profile**:
- Ramps from 10 → 50 → 100 concurrent users
- Total duration: ~5 minutes
- Generates realistic price feed data

**Run**:
```bash
# Default test
k6 run apps/api/tests/load/ingestion.load.js

# Custom load
k6 run --vus 50 --duration 2m apps/api/tests/load/ingestion.load.js

# With custom API endpoint
API_URL=http://api.example.com k6 run apps/api/tests/load/ingestion.load.js
```

### 2. Query Endpoints Load Test (`queries.load.js`)

Tests all query endpoints: `/prices/latest`, `/prices/range`, `/aggregates/consensus`.

**What it tests**:
- Read performance across all query endpoints
- Cache hit rates (Redis caching)
- Database query optimization
- Multi-symbol queries
- Time-range queries with OHLCV aggregation

**Load profile**:
- Ramps from 20 → 100 → 200 concurrent users
- Total duration: ~7 minutes
- Mix of different query types

**Run**:
```bash
# Default test
k6 run apps/api/tests/load/queries.load.js

# Sustained high load
k6 run --vus 200 --duration 5m apps/api/tests/load/queries.load.js

# With custom keys
API_KEY=your_public_key INTERNAL_API_KEY=your_internal_key k6 run apps/api/tests/load/queries.load.js
```

### 3. WebSocket Load Test (`websocket.load.js`)

Tests the `/stream` WebSocket endpoint scalability.

**What it tests**:
- Concurrent WebSocket connections
- Message throughput and latency
- Subscribe/unsubscribe operations
- Connection stability over time
- Bidirectional communication (ping/pong)

**Load profile**:
- Ramps from 50 → 200 → 500 concurrent connections
- Total duration: ~10 minutes
- Each connection stays open 30-60 seconds

**Run**:
```bash
# Default test
k6 run apps/api/tests/load/websocket.load.js

# High concurrency test
k6 run --vus 500 --duration 5m apps/api/tests/load/websocket.load.js

# Custom WebSocket URL
WS_URL=ws://api.example.com k6 run apps/api/tests/load/websocket.load.js
```

---

## Environment Variables

All tests support these environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `API_URL` | `http://localhost:3000` | HTTP API base URL |
| `WS_URL` | `ws://localhost:3000` | WebSocket base URL |
| `API_KEY` | `chrono_public_dev_key_001` | Public API key |
| `INTERNAL_API_KEY` | `chrono_internal_dev_key_001` | Internal API key (for seeding) |

**Example**:
```bash
API_URL=https://api.chrono.dev \
WS_URL=wss://api.chrono.dev \
API_KEY=prod_key_123 \
  k6 run apps/api/tests/load/queries.load.js
```

---

## Running All Tests

To run all load tests sequentially:

```bash
#!/bin/bash
# run-all-load-tests.sh

echo "🚀 Starting comprehensive load test suite"

echo "\n📥 Test 1/3: Ingestion Load Test"
k6 run apps/api/tests/load/ingestion.load.js

echo "\n📊 Test 2/3: Query Endpoints Load Test"
k6 run apps/api/tests/load/queries.load.js

echo "\n🔌 Test 3/3: WebSocket Load Test"
k6 run apps/api/tests/load/websocket.load.js

echo "\n✅ All load tests complete!"
```

---

## Performance Targets

These are the expected performance thresholds defined in the tests:

### Ingestion Endpoint
- ✅ 95% of requests < 100ms
- ✅ 99% of requests < 200ms
- ✅ Error rate < 1%

### Query Endpoints
- ✅ 95% of requests < 100ms
- ✅ 99% of requests < 200ms
- ✅ Cache hit rate > 50%
- ✅ Error rate < 1%

### WebSocket
- ✅ 95% connection time < 500ms
- ✅ 95% message latency < 100ms
- ✅ Connection error rate < 5%
- ✅ Message error rate < 1%

---

## Interpreting Results

### Key Metrics to Watch

**HTTP Metrics**:
- `http_req_duration`: Total request time (target: p95 < 100ms)
- `http_req_failed`: Failed requests rate (target: < 1%)
- `http_reqs`: Total requests per second

**Custom Metrics**:
- `cache_hits`: Cache hit rate (target: > 50%)
- `feeds_ingested`: Total price feeds ingested
- `queries_executed`: Total queries executed
- `messages_received`: WebSocket messages received
- `connections_established`: WebSocket connections

### Reading k6 Output

```
✓ status is 200
✓ response time < 100ms

checks.........................: 99.50% ✓ 1990    ✗ 10
data_received..................: 1.2 MB 20 kB/s
data_sent......................: 890 kB 15 kB/s
http_req_duration..............: avg=45ms   min=2ms  med=40ms  max=250ms p(95)=95ms  p(99)=180ms
http_reqs......................: 2000   33.33/s
iteration_duration.............: avg=1.5s   min=1s   med=1.4s  max=3s
iterations.....................: 2000   33.33/s
vus............................: 50     min=10    max=50
```

**Green checkmarks** = Tests passed
**Red X marks** = Tests failed (investigate thresholds)

---

## Troubleshooting

### Test Fails: "API not healthy"
**Cause**: API server is not running or not accessible
**Fix**: Start API server: `bun run dev` in `apps/api`

### High Error Rates
**Causes**:
- Database connection pool exhausted
- Redis connection limits
- Rate limiting triggered
- Server resource constraints

**Fix**:
- Check server logs
- Increase connection pool sizes
- Monitor system resources (CPU, RAM, connections)

### Low Cache Hit Rates
**Cause**: Cache TTL too short or cache not working
**Fix**: Check Redis connection and cache configuration

### WebSocket Connection Errors
**Causes**:
- Server WebSocket limits reached
- Firewall/proxy blocking WebSocket upgrades
- Server resource exhaustion

**Fix**:
- Check server max connections config
- Monitor server memory/CPU
- Check network configuration

---

## Performance Baselines

After running tests on a local development environment, document your baseline results here.

### Local Development (macOS M1, 16GB RAM)

**Ingestion**:
- Throughput: ___ requests/sec
- P95 latency: ___ ms
- Error rate: ___ %

**Queries**:
- Throughput: ___ requests/sec
- P95 latency: ___ ms
- Cache hit rate: ___ %

**WebSocket**:
- Max concurrent connections: ___
- P95 message latency: ___ ms
- Connection error rate: ___ %

### Staging Environment

_Document staging results here after deployment_

### Production Environment

_Document production results here after deployment_

---

## Advanced Usage

### Custom Test Scenarios

Create custom load patterns by modifying the `options.stages` array:

```javascript
export const options = {
  stages: [
    { duration: '1m', target: 100 },  // Ramp-up
    { duration: '5m', target: 100 },  // Sustained load
    { duration: '1m', target: 0 },    // Ramp-down
  ],
};
```

### Running in Cloud

k6 Cloud allows distributed load testing from multiple regions:

```bash
# Login to k6 Cloud
k6 login cloud

# Run test in cloud
k6 cloud apps/api/tests/load/ingestion.load.js
```

### CI/CD Integration

Add to GitHub Actions workflow:

```yaml
- name: Run Load Tests
  run: |
    k6 run --summary-export=results.json apps/api/tests/load/queries.load.js

- name: Upload Results
  uses: actions/upload-artifact@v3
  with:
    name: load-test-results
    path: results.json
```

---

## Next Steps

1. **Run baseline tests** on local development environment
2. **Document results** in "Performance Baselines" section above
3. **Set up monitoring** (Prometheus/Grafana) to track metrics during tests
4. **Run tests in staging** environment and compare to local baseline
5. **Establish thresholds** for production acceptance
6. **Integrate into CI/CD** for continuous performance testing

---

*"En Taro Tassadar! May your servers withstand the swarm."*

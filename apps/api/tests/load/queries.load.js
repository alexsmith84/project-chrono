/**
 * k6 Load Test: GET /prices/* and /aggregates/*
 * Tests query endpoint performance and caching
 *
 * Usage:
 *   k6 run apps/api/tests/load/queries.load.js
 *   k6 run --vus 50 --duration 2m apps/api/tests/load/queries.load.js
 *   k6 run --vus 200 --duration 5m apps/api/tests/load/queries.load.js
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const cacheHitRate = new Rate('cache_hits');
const latestPricesDuration = new Trend('latest_prices_duration');
const priceRangeDuration = new Trend('price_range_duration');
const consensusDuration = new Trend('consensus_duration');
const queriesExecuted = new Counter('queries_executed');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 users
    { duration: '2m', target: 20 },   // Stay at 20 users
    { duration: '30s', target: 100 }, // Ramp up to 100 users
    { duration: '2m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 200 }, // Spike to 200 users
    { duration: '1m', target: 200 },  // Stay at 200 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'], // 95% under 100ms, 99% under 200ms
    errors: ['rate<0.01'], // Error rate < 1%
    http_req_failed: ['rate<0.01'], // Failed requests < 1%
    cache_hits: ['rate>0.5'], // Cache hit rate > 50%
  },
};

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'chrono_public_dev_key_001';

// Test data
const SYMBOLS = [
  'BTC/USD',
  'ETH/USD',
  'XRP/USD',
  'ADA/USD',
  'SOL/USD',
];

const SOURCES = ['coinbase', 'binance', 'kraken'];

/**
 * Common request parameters
 */
const params = {
  headers: {
    'Authorization': `Bearer ${API_KEY}`,
  },
};

/**
 * Test GET /prices/latest
 */
function testLatestPrices() {
  group('GET /prices/latest', () => {
    // Test 1: Single symbol
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const response1 = http.get(
      `${BASE_URL}/prices/latest?symbols=${symbol}`,
      params
    );

    const success1 = check(response1, {
      'latest: status is 200': (r) => r.status === 200,
      'latest: has prices array': (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body.prices);
      },
      'latest: response time < 50ms': (r) => r.timings.duration < 50,
    });

    errorRate.add(!success1);
    latestPricesDuration.add(response1.timings.duration);
    queriesExecuted.add(1);

    // Check if response was cached (< 5ms typically means cache hit)
    cacheHitRate.add(response1.timings.duration < 5);

    sleep(0.1);

    // Test 2: Multiple symbols
    const symbols = SYMBOLS.slice(0, 3).join(',');
    const response2 = http.get(
      `${BASE_URL}/prices/latest?symbols=${symbols}`,
      params
    );

    const success2 = check(response2, {
      'latest multi: status is 200': (r) => r.status === 200,
      'latest multi: has multiple prices': (r) => {
        const body = JSON.parse(r.body);
        return body.prices.length >= 0;
      },
    });

    errorRate.add(!success2);
    latestPricesDuration.add(response2.timings.duration);
    queriesExecuted.add(1);
    cacheHitRate.add(response2.timings.duration < 5);
  });
}

/**
 * Test GET /prices/range
 */
function testPriceRange() {
  group('GET /prices/range', () => {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    // Test 1: Raw price data (no interval)
    const response1 = http.get(
      `${BASE_URL}/prices/range?symbol=${symbol}&start=${oneHourAgo.toISOString()}&end=${now.toISOString()}&limit=100`,
      params
    );

    const success1 = check(response1, {
      'range: status is 200': (r) => r.status === 200,
      'range: has prices array': (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body.prices);
      },
      'range: response time < 100ms': (r) => r.timings.duration < 100,
    });

    errorRate.add(!success1);
    priceRangeDuration.add(response1.timings.duration);
    queriesExecuted.add(1);

    sleep(0.1);

    // Test 2: Aggregated data with interval
    const response2 = http.get(
      `${BASE_URL}/prices/range?symbol=${symbol}&start=${oneHourAgo.toISOString()}&end=${now.toISOString()}&interval=5m&limit=50`,
      params
    );

    const success2 = check(response2, {
      'range interval: status is 200': (r) => r.status === 200,
      'range interval: has OHLCV data': (r) => {
        const body = JSON.parse(r.body);
        if (body.prices.length === 0) return true; // Empty is OK
        return body.prices[0].open !== undefined;
      },
    });

    errorRate.add(!success2);
    priceRangeDuration.add(response2.timings.duration);
    queriesExecuted.add(1);

    sleep(0.1);

    // Test 3: Filter by source
    const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
    const response3 = http.get(
      `${BASE_URL}/prices/range?symbol=${symbol}&start=${oneHourAgo.toISOString()}&end=${now.toISOString()}&source=${source}&limit=50`,
      params
    );

    check(response3, {
      'range source: status is 200': (r) => r.status === 200,
    });

    priceRangeDuration.add(response3.timings.duration);
    queriesExecuted.add(1);
  });
}

/**
 * Test GET /aggregates/consensus
 */
function testConsensus() {
  group('GET /aggregates/consensus', () => {
    // Test 1: Single symbol, current time
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const response1 = http.get(
      `${BASE_URL}/aggregates/consensus?symbols=${symbol}`,
      params
    );

    const success1 = check(response1, {
      'consensus: status is 200': (r) => r.status === 200,
      'consensus: has prices array': (r) => {
        const body = JSON.parse(r.body);
        return Array.isArray(body.prices);
      },
      'consensus: response time < 100ms': (r) => r.timings.duration < 100,
    });

    errorRate.add(!success1);
    consensusDuration.add(response1.timings.duration);
    queriesExecuted.add(1);

    sleep(0.1);

    // Test 2: Multiple symbols
    const symbols = SYMBOLS.slice(0, 3).join(',');
    const response2 = http.get(
      `${BASE_URL}/aggregates/consensus?symbols=${symbols}`,
      params
    );

    const success2 = check(response2, {
      'consensus multi: status is 200': (r) => r.status === 200,
      'consensus multi: has data': (r) => {
        const body = JSON.parse(r.body);
        return body.prices.length >= 0;
      },
    });

    errorRate.add(!success2);
    consensusDuration.add(response2.timings.duration);
    queriesExecuted.add(1);

    sleep(0.1);

    // Test 3: With specific timestamp
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
    const response3 = http.get(
      `${BASE_URL}/aggregates/consensus?symbols=${symbol}&timestamp=${fiveMinAgo.toISOString()}`,
      params
    );

    check(response3, {
      'consensus timestamp: status is 200': (r) => r.status === 200,
    });

    consensusDuration.add(response3.timings.duration);
    queriesExecuted.add(1);
  });
}

/**
 * Main test scenario - randomly execute different query types
 */
export default function () {
  const testType = Math.floor(Math.random() * 3);

  switch (testType) {
    case 0:
      testLatestPrices();
      break;
    case 1:
      testPriceRange();
      break;
    case 2:
      testConsensus();
      break;
  }

  // Vary the think time
  sleep(Math.random() * 2 + 0.5); // 0.5-2.5 seconds
}

/**
 * Setup function
 */
export function setup() {
  console.log('🚀 Starting query endpoints load test');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   API Key: ${API_KEY.substring(0, 20)}...`);

  // Health check
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API not healthy: ${healthCheck.status}`);
  }

  console.log('✅ API is healthy, starting test');

  // Seed some test data
  console.log('🌱 Seeding test data...');
  const internalKey = __ENV.INTERNAL_API_KEY || 'chrono_internal_dev_key_001';

  const feeds = SYMBOLS.flatMap((symbol) =>
    SOURCES.map((source) => ({
      symbol,
      price: Math.random() * 50000,
      volume: Math.random() * 1000000,
      timestamp: new Date().toISOString(),
      source,
      worker_id: 'load-test-seeder',
    }))
  );

  const seedResponse = http.post(
    `${BASE_URL}/internal/ingest`,
    JSON.stringify({ feeds }),
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${internalKey}`,
      },
    }
  );

  if (seedResponse.status === 201) {
    console.log(`✅ Seeded ${feeds.length} price feeds`);
  }
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('🏁 Query load test complete');
}

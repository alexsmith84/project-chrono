/**
 * k6 Load Test: POST /internal/ingest
 * Tests price feed ingestion endpoint performance
 *
 * Usage:
 *   k6 run apps/api/tests/load/ingestion.load.js
 *   k6 run --vus 10 --duration 30s apps/api/tests/load/ingestion.load.js
 *   k6 run --vus 50 --duration 2m apps/api/tests/load/ingestion.load.js
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const ingestionDuration = new Trend('ingestion_duration');
const feedsIngested = new Counter('feeds_ingested');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },  // Ramp up to 10 users
    { duration: '1m', target: 10 },   // Stay at 10 users
    { duration: '30s', target: 50 },  // Ramp up to 50 users
    { duration: '1m', target: 50 },   // Stay at 50 users
    { duration: '30s', target: 100 }, // Spike to 100 users
    { duration: '1m', target: 100 },  // Stay at 100 users
    { duration: '30s', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_duration: ['p(95)<100', 'p(99)<200'], // 95% of requests under 100ms, 99% under 200ms
    errors: ['rate<0.01'], // Error rate should be less than 1%
    http_req_failed: ['rate<0.01'], // Failed requests should be less than 1%
  },
};

// Configuration
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'chrono_internal_dev_key_001';

// Sample symbols for testing
const SYMBOLS = [
  'BTC/USD',
  'ETH/USD',
  'XRP/USD',
  'ADA/USD',
  'SOL/USD',
  'DOGE/USD',
  'MATIC/USD',
  'DOT/USD',
];

// Sample sources
const SOURCES = [
  'coinbase',
  'binance',
  'kraken',
  'bitstamp',
  'gemini',
];

/**
 * Generate random price feed data
 */
function generatePriceFeed(symbol, source) {
  const basePrice = {
    'BTC/USD': 45000,
    'ETH/USD': 2500,
    'XRP/USD': 0.50,
    'ADA/USD': 0.45,
    'SOL/USD': 100,
    'DOGE/USD': 0.08,
    'MATIC/USD': 0.90,
    'DOT/USD': 7.50,
  }[symbol] || 100;

  // Add 1% price variance
  const variance = basePrice * 0.01;
  const price = basePrice + (Math.random() * variance * 2 - variance);

  return {
    symbol,
    price: parseFloat(price.toFixed(8)),
    volume: parseFloat((Math.random() * 1000000).toFixed(8)),
    timestamp: new Date().toISOString(),
    source,
    worker_id: `load-test-worker-${__VU}`,
  };
}

/**
 * Generate batch of price feeds
 */
function generateBatch(size = 10) {
  const feeds = [];
  for (let i = 0; i < size; i++) {
    const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
    const source = SOURCES[Math.floor(Math.random() * SOURCES.length)];
    feeds.push(generatePriceFeed(symbol, source));
  }
  return feeds;
}

/**
 * Main test scenario
 */
export default function () {
  // Generate random batch size (1-50 feeds)
  const batchSize = Math.floor(Math.random() * 50) + 1;
  const feeds = generateBatch(batchSize);

  const payload = JSON.stringify({ feeds });
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  // Send ingestion request
  const response = http.post(
    `${BASE_URL}/internal/ingest`,
    payload,
    params
  );

  // Check response
  const success = check(response, {
    'status is 201': (r) => r.status === 201,
    'response has ingested count': (r) => {
      const body = JSON.parse(r.body);
      return body.ingested !== undefined;
    },
    'ingested count matches': (r) => {
      const body = JSON.parse(r.body);
      return body.ingested === batchSize;
    },
    'response time < 100ms': (r) => r.timings.duration < 100,
  });

  // Record metrics
  errorRate.add(!success);
  ingestionDuration.add(response.timings.duration);

  if (response.status === 201) {
    feedsIngested.add(batchSize);
  }

  // Small delay between requests (simulate real worker behavior)
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

/**
 * Setup function - runs once at start
 */
export function setup() {
  console.log('🚀 Starting ingestion load test');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   API Key: ${API_KEY.substring(0, 20)}...`);

  // Verify endpoint is accessible
  const healthCheck = http.get(`${BASE_URL}/health`);
  if (healthCheck.status !== 200) {
    throw new Error(`API not healthy: ${healthCheck.status}`);
  }

  console.log('✅ API is healthy, starting test');
}

/**
 * Teardown function - runs once at end
 */
export function teardown(data) {
  console.log('🏁 Load test complete');
}

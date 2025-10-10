/**
 * Integration tests for price query endpoints
 * GET /prices/latest
 * GET /prices/range
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import {
  setupTests,
  teardownTests,
  createTestApp,
  createAuthHeaders,
  TEST_API_KEYS,
} from '../helpers/test-setup';
import { sql } from '../../src/db/client';
import { redis } from '../../src/cache/redis';
import type { LatestPricesResponse, PriceRangeResponse } from '../../src/schemas/responses';

const app = createTestApp();

beforeAll(async () => {
  await setupTests();

  // Insert test data for price queries
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
  const twoHoursAgo = new Date(now.getTime() - 7200 * 1000);

  await sql`
    INSERT INTO price_feeds (symbol, price, volume, source, timestamp, worker_id)
    VALUES
      ('BTC/USD', '67234.56', '1000.0', 'binance', ${now}, 'test-worker'),
      ('ETH/USD', '2678.90', '2000.0', 'binance', ${now}, 'test-worker'),
      ('BTC/USD', '67100.00', '1100.0', 'binance', ${oneHourAgo}, 'test-worker'),
      ('BTC/USD', '66900.00', '1200.0', 'binance', ${twoHoursAgo}, 'test-worker'),
      ('ETH/USD', '2670.00', '2100.0', 'kraken', ${oneHourAgo}, 'test-worker'),
      ('SOL/USD', '100.50', '500.0', 'binance', ${now}, 'test-worker')
  `;
});

afterAll(async () => {
  await teardownTests();
});

describe('GET /prices/latest', () => {
  test('should fetch latest prices for multiple symbols', async () => {
    const response = await app.request('/prices/latest?symbols=BTC/USD,ETH/USD', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.public),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as LatestPricesResponse;
    expect(data.data).toHaveLength(2);
    expect(data.latency_ms).toBeGreaterThanOrEqual(0);

    // Check BTC/USD data
    const btcPrice = data.data.find((p) => p.symbol === 'BTC/USD');
    expect(btcPrice).toBeDefined();
    expect(parseFloat(btcPrice!.price)).toBe(67234.56);
    expect(btcPrice!.source).toBe('binance');
    expect(btcPrice!.staleness_ms).toBeGreaterThanOrEqual(0);
  });

  test('should fetch single symbol', async () => {
    const response = await app.request('/prices/latest?symbols=SOL/USD', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.public),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as LatestPricesResponse;
    expect(data.data).toHaveLength(1);
    expect(data.data[0].symbol).toBe('SOL/USD');
    expect(parseFloat(data.data[0].price)).toBe(100.50);
  });

  test('should use cache for subsequent requests', async () => {
    // First request (cache miss - may be from previous tests, so just checking structure)
    const response1 = await app.request('/prices/latest?symbols=BTC/USD', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.public),
    });

    expect(response1.status).toBe(200);
    const data1 = (await response1.json()) as LatestPricesResponse;
    expect(data1.data).toHaveLength(1);

    // Second request (should be cached)
    const response2 = await app.request('/prices/latest?symbols=BTC/USD', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.public),
    });

    const data2 = (await response2.json()) as LatestPricesResponse;
    expect(data2.cached).toBe(true);
    expect(data2.latency_ms).toBeGreaterThanOrEqual(0);
  });

  test('should return empty array for unknown symbol', async () => {
    const response = await app.request('/prices/latest?symbols=UNKNOWN/USD', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.public),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as LatestPricesResponse;
    expect(data.data).toHaveLength(0);
  });

  test('should reject request without authentication', async () => {
    const response = await app.request('/prices/latest?symbols=BTC/USD', {
      method: 'GET',
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  test('should reject request with internal API key', async () => {
    const response = await app.request('/prices/latest?symbols=BTC/USD', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.internal),
    });

    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  test('should validate symbols parameter is required', async () => {
    const response = await app.request('/prices/latest', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.public),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  test('should validate symbols format', async () => {
    const response = await app.request('/prices/latest?symbols=INVALID', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.public),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  test('should accept admin API key', async () => {
    const response = await app.request('/prices/latest?symbols=BTC/USD', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.admin),
    });

    expect(response.status).toBe(200);
  });
});

describe('GET /prices/range', () => {
  test('should fetch price range without interval (raw data)', async () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 10800 * 1000);

    const response = await app.request(
      `/prices/range?symbol=BTC/USD&from=${threeHoursAgo.toISOString()}&to=${now.toISOString()}`,
      {
        method: 'GET',
        headers: createAuthHeaders(TEST_API_KEYS.public),
      }
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as PriceRangeResponse;
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.count).toBeGreaterThan(0);
    expect(data.latency_ms).toBeGreaterThanOrEqual(0);

    // Each raw data point should have OHLCV structure
    const firstPoint = data.data[0];
    expect(firstPoint).toHaveProperty('timestamp');
    expect(firstPoint).toHaveProperty('open');
    expect(firstPoint).toHaveProperty('high');
    expect(firstPoint).toHaveProperty('low');
    expect(firstPoint).toHaveProperty('close');
  });

  test('should fetch price range with interval (aggregated)', async () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 10800 * 1000);

    const response = await app.request(
      `/prices/range?symbol=BTC/USD&from=${threeHoursAgo.toISOString()}&to=${now.toISOString()}&interval=1h`,
      {
        method: 'GET',
        headers: createAuthHeaders(TEST_API_KEYS.public),
      }
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as PriceRangeResponse;
    expect(data.interval).toBe('1h');
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('should filter by source', async () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 10800 * 1000);

    const response = await app.request(
      `/prices/range?symbol=ETH/USD&from=${threeHoursAgo.toISOString()}&to=${now.toISOString()}&source=kraken`,
      {
        method: 'GET',
        headers: createAuthHeaders(TEST_API_KEYS.public),
      }
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as PriceRangeResponse;
    expect(data.data.length).toBeGreaterThan(0);
  });

  test('should respect limit parameter', async () => {
    const now = new Date();
    const threeHoursAgo = new Date(now.getTime() - 10800 * 1000);

    const response = await app.request(
      `/prices/range?symbol=BTC/USD&from=${threeHoursAgo.toISOString()}&to=${now.toISOString()}&limit=2`,
      {
        method: 'GET',
        headers: createAuthHeaders(TEST_API_KEYS.public),
      }
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as PriceRangeResponse;
    expect(data.data.length).toBeLessThanOrEqual(2);
  });

  test('should return empty array for time range with no data', async () => {
    const futureDate = new Date('2030-01-01');
    const futureEnd = new Date('2030-01-02');

    const response = await app.request(
      `/prices/range?symbol=BTC/USD&from=${futureDate.toISOString()}&to=${futureEnd.toISOString()}`,
      {
        method: 'GET',
        headers: createAuthHeaders(TEST_API_KEYS.public),
      }
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as PriceRangeResponse;
    expect(data.data).toHaveLength(0);
    expect(data.count).toBe(0);
  });

  test('should reject request without authentication', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);

    const response = await app.request(
      `/prices/range?symbol=BTC/USD&from=${oneHourAgo.toISOString()}&to=${now.toISOString()}`,
      {
        method: 'GET',
      }
    );

    expect(response.status).toBe(401);
  });

  test('should validate required parameters', async () => {
    const response = await app.request('/prices/range?symbol=BTC/USD', {
      method: 'GET',
      headers: createAuthHeaders(TEST_API_KEYS.public),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  test('should validate date format', async () => {
    const response = await app.request(
      '/prices/range?symbol=BTC/USD&from=invalid-date&to=2024-01-01',
      {
        method: 'GET',
        headers: createAuthHeaders(TEST_API_KEYS.public),
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  test('should validate symbol format', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);

    const response = await app.request(
      `/prices/range?symbol=INVALID&from=${oneHourAgo.toISOString()}&to=${now.toISOString()}`,
      {
        method: 'GET',
        headers: createAuthHeaders(TEST_API_KEYS.public),
      }
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});

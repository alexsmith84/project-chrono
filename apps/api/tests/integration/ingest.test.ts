/**
 * Integration tests for POST /internal/ingest
 * Tests price feed ingestion endpoint
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
import type { IngestResponse } from '../../src/schemas/ingest';

const app = createTestApp();

beforeAll(async () => {
  await setupTests();
});

afterAll(async () => {
  await teardownTests();
});

describe('POST /internal/ingest', () => {
  test('should successfully ingest price feeds', async () => {
    const payload = {
      worker_id: 'test-worker-001',
      timestamp: new Date().toISOString(),
      feeds: [
        {
          symbol: 'BTC/USD',
          price: '67234.56',
          volume: '1234.567890',
          source: 'binance',
          timestamp: new Date().toISOString(),
        },
        {
          symbol: 'ETH/USD',
          price: '2678.90',
          volume: '5678.901234',
          source: 'binance',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await app.request('/internal/ingest', {
      method: 'POST',
      headers: createAuthHeaders(TEST_API_KEYS.internal),
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as IngestResponse;
    expect(data.status).toBe('success');
    expect(data.ingested).toBe(2);
    expect(data.failed).toBe(0);
    expect(data.latency_ms).toBeGreaterThan(0);

    // Verify data was inserted into database
    const dbResults = await sql`
      SELECT * FROM price_feeds
      WHERE worker_id = 'test-worker-001'
      ORDER BY timestamp DESC
    `;

    expect(dbResults.length).toBe(2);
    expect(dbResults[0].symbol).toMatch(/^(BTC\/USD|ETH\/USD)$/);
    expect(dbResults[0].source).toBe('binance');

    // Verify data was cached in Redis
    const cachedBTC = await redis.get('latest:BTC/USD');
    const cachedETH = await redis.get('latest:ETH/USD');

    expect(cachedBTC).not.toBeNull();
    expect(cachedETH).not.toBeNull();

    const btcData = JSON.parse(cachedBTC!);
    expect(btcData.price).toBe('67234.56');
  });

  test('should reject request without authentication', async () => {
    const payload = {
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
    };

    const response = await app.request('/internal/ingest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error.code).toBe('UNAUTHORIZED');
  });

  test('should reject request with public API key', async () => {
    const payload = {
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
    };

    const response = await app.request('/internal/ingest', {
      method: 'POST',
      headers: createAuthHeaders(TEST_API_KEYS.public),
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error.code).toBe('FORBIDDEN');
  });

  test('should validate request payload', async () => {
    const invalidPayload = {
      worker_id: 'test-worker',
      timestamp: new Date().toISOString(),
      feeds: [
        {
          symbol: 'INVALID_SYMBOL', // Invalid format (should be BASE/QUOTE)
          price: '67234.56',
          source: 'binance',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await app.request('/internal/ingest', {
      method: 'POST',
      headers: createAuthHeaders(TEST_API_KEYS.internal),
      body: JSON.stringify(invalidPayload),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });

  test('should reject empty feeds array', async () => {
    const payload = {
      worker_id: 'test-worker',
      timestamp: new Date().toISOString(),
      feeds: [],
    };

    const response = await app.request('/internal/ingest', {
      method: 'POST',
      headers: createAuthHeaders(TEST_API_KEYS.internal),
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('At least one price feed required');
  });

  test('should reject batch larger than 100 feeds', async () => {
    const feeds = Array.from({ length: 101 }, (_, i) => ({
      symbol: 'BTC/USD',
      price: `${67000 + i}`,
      source: 'binance',
      timestamp: new Date().toISOString(),
    }));

    const payload = {
      worker_id: 'test-worker',
      timestamp: new Date().toISOString(),
      feeds,
    };

    const response = await app.request('/internal/ingest', {
      method: 'POST',
      headers: createAuthHeaders(TEST_API_KEYS.internal),
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
    expect(data.error.message).toContain('Maximum 100 price feeds per batch');
  });

  test('should handle negative prices validation', async () => {
    const payload = {
      worker_id: 'test-worker',
      timestamp: new Date().toISOString(),
      feeds: [
        {
          symbol: 'BTC/USD',
          price: '-100', // Invalid negative price
          source: 'binance',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await app.request('/internal/ingest', {
      method: 'POST',
      headers: createAuthHeaders(TEST_API_KEYS.internal),
      body: JSON.stringify(payload),
    });

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe('VALIDATION_ERROR');
  });
});

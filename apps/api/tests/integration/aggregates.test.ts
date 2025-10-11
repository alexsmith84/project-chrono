/**
 * Integration tests for aggregated price endpoints
 * GET /aggregates/consensus
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  setupTests,
  teardownTests,
  createTestApp,
  createAuthHeaders,
  TEST_API_KEYS,
} from "../helpers/test-setup";
import { sql } from "../../src/db/client";
import type { ConsensusPricesResponse } from "../../src/schemas/responses";

const app = createTestApp();

beforeAll(async () => {
  await setupTests();

  // Insert test data for consensus queries
  // Insert multiple price feeds from different sources to compute consensus
  const now = new Date();

  await sql`
    INSERT INTO price_feeds (symbol, price, volume, source, timestamp, worker_id)
    VALUES
      ('BTC/USD', '67200.00', '1000.0', 'binance', ${now}, 'test-worker'),
      ('BTC/USD', '67250.00', '1100.0', 'kraken', ${now}, 'test-worker'),
      ('BTC/USD', '67300.00', '1200.0', 'coinbase', ${now}, 'test-worker'),
      ('ETH/USD', '2670.00', '2000.0', 'binance', ${now}, 'test-worker'),
      ('ETH/USD', '2680.00', '2100.0', 'kraken', ${now}, 'test-worker')
  `;
});

afterAll(async () => {
  await teardownTests();
});

describe("GET /aggregates/consensus", () => {
  test("should fetch consensus prices for multiple symbols", async () => {
    const timestamp = new Date().toISOString();
    const response = await app.request(
      `/aggregates/consensus?symbols=BTC/USD,ETH/USD&timestamp=${timestamp}`,
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.public),
      },
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as ConsensusPricesResponse;
    expect(data.data.length).toBeGreaterThan(0);
    expect(data.latency_ms).toBeGreaterThanOrEqual(0);

    // Check BTC/USD consensus data
    const btcConsensus = data.data.find((p) => p.symbol === "BTC/USD");
    if (btcConsensus) {
      expect(btcConsensus).toHaveProperty("price");
      expect(btcConsensus).toHaveProperty("median");
      expect(btcConsensus).toHaveProperty("mean");
      expect(btcConsensus.num_sources).toBeGreaterThan(0);
      expect(btcConsensus.sources).toBeInstanceOf(Array);
      expect(btcConsensus.sources.length).toBeGreaterThan(0);
    }
  });

  test("should fetch consensus for single symbol", async () => {
    const timestamp = new Date().toISOString();
    const response = await app.request(
      `/aggregates/consensus?symbols=BTC/USD&timestamp=${timestamp}`,
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.public),
      },
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as ConsensusPricesResponse;
    expect(data.data.length).toBeGreaterThan(0);

    const btcConsensus = data.data[0];
    expect(btcConsensus.symbol).toBe("BTC/USD");
    expect(parseFloat(btcConsensus.price)).toBeGreaterThan(0);
    expect(parseFloat(btcConsensus.median)).toBeGreaterThan(0);
    expect(parseFloat(btcConsensus.mean)).toBeGreaterThan(0);
    expect(btcConsensus.num_sources).toBeGreaterThanOrEqual(1);
  });

  test("should compute consensus from multiple sources", async () => {
    const timestamp = new Date().toISOString();
    const response = await app.request(
      `/aggregates/consensus?symbols=BTC/USD&timestamp=${timestamp}`,
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.public),
      },
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as ConsensusPricesResponse;
    expect(data.data.length).toBeGreaterThan(0);

    const btcConsensus = data.data[0];
    // Should have multiple sources (binance, kraken, coinbase from test data)
    expect(btcConsensus.num_sources).toBeGreaterThanOrEqual(2);
    expect(btcConsensus.sources.length).toBeGreaterThanOrEqual(2);
  });

  test("should return empty array for unknown symbol", async () => {
    const timestamp = new Date().toISOString();
    const response = await app.request(
      `/aggregates/consensus?symbols=UNKNOWN/USD&timestamp=${timestamp}`,
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.public),
      },
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as ConsensusPricesResponse;
    expect(data.data).toHaveLength(0);
  });

  test("should use default timestamp if not provided", async () => {
    const response = await app.request(
      "/aggregates/consensus?symbols=BTC/USD",
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.public),
      },
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as ConsensusPricesResponse;
    // Should still find data since we have recent data
    expect(data.data.length).toBeGreaterThan(0);
  });

  test("should reject request without authentication", async () => {
    const timestamp = new Date().toISOString();
    const response = await app.request(
      `/aggregates/consensus?symbols=BTC/USD&timestamp=${timestamp}`,
      {
        method: "GET",
      },
    );

    expect(response.status).toBe(401);

    const data = await response.json();
    expect(data.error.code).toBe("UNAUTHORIZED");
  });

  test("should reject request with internal API key", async () => {
    const timestamp = new Date().toISOString();
    const response = await app.request(
      `/aggregates/consensus?symbols=BTC/USD&timestamp=${timestamp}`,
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.internal),
      },
    );

    expect(response.status).toBe(403);

    const data = await response.json();
    expect(data.error.code).toBe("FORBIDDEN");
  });

  test("should validate symbols parameter is required", async () => {
    const timestamp = new Date().toISOString();
    const response = await app.request(
      `/aggregates/consensus?timestamp=${timestamp}`,
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.public),
      },
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  test("should validate symbols format", async () => {
    const timestamp = new Date().toISOString();
    const response = await app.request(
      `/aggregates/consensus?symbols=INVALID&timestamp=${timestamp}`,
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.public),
      },
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  test("should validate timestamp format", async () => {
    const response = await app.request(
      "/aggregates/consensus?symbols=BTC/USD&timestamp=invalid-date",
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.public),
      },
    );

    expect(response.status).toBe(400);

    const data = await response.json();
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  test("should accept admin API key", async () => {
    const timestamp = new Date().toISOString();
    const response = await app.request(
      `/aggregates/consensus?symbols=BTC/USD&timestamp=${timestamp}`,
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.admin),
      },
    );

    expect(response.status).toBe(200);
  });

  test("should handle old timestamp with no data", async () => {
    const oldTimestamp = new Date("2020-01-01").toISOString();
    const response = await app.request(
      `/aggregates/consensus?symbols=BTC/USD&timestamp=${oldTimestamp}`,
      {
        method: "GET",
        headers: createAuthHeaders(TEST_API_KEYS.public),
      },
    );

    expect(response.status).toBe(200);

    const data = (await response.json()) as ConsensusPricesResponse;
    expect(data.data).toHaveLength(0);
  });
});

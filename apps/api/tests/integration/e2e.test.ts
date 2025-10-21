/**
 * End-to-end integration tests
 * Tests the complete data pipeline: Collector → API → Redis → WebSocket → Dashboard
 *
 * This replaces the deleted workers/ test directory with proper automated testing
 * of the full data flow through all system components.
 */

import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { setupTests, teardownTests, createAuthHeaders, TEST_API_KEYS } from '../helpers/test-setup';
import { startServer } from '../../src/server';
import { sql } from '../../src/db/client';
import { redis } from '../../src/cache/redis';

let server: ReturnType<typeof startServer>;
const API_URL = 'http://localhost:3000';
const WS_URL = 'ws://localhost:3000/stream';

beforeAll(async () => {
  await setupTests();
  server = startServer();
  // Give server time to start
  await new Promise((resolve) => setTimeout(resolve, 200));
});

afterAll(async () => {
  server.stop();
  await teardownTests();
});

/**
 * Mock exchange collector
 * Simulates a worker collecting price data from an exchange
 */
class MockExchangeCollector {
  private workerId: string;
  private exchange: string;

  constructor(exchange: string) {
    this.exchange = exchange;
    this.workerId = `mock-${exchange}-${Date.now()}`;
  }

  /**
   * Simulate collecting price data from exchange
   */
  async collectPrices(symbols: string[]): Promise<any> {
    const feeds = symbols.map((symbol) => ({
      symbol,
      price: this.generateMockPrice(symbol),
      volume: this.generateMockVolume(),
      source: this.exchange,
      timestamp: new Date().toISOString(),
    }));

    return {
      worker_id: this.workerId,
      timestamp: new Date().toISOString(),
      feeds,
    };
  }

  /**
   * Send collected data to API ingest endpoint
   */
  async sendToAPI(payload: any): Promise<Response> {
    return fetch(`${API_URL}/internal/ingest`, {
      method: 'POST',
      headers: {
        ...createAuthHeaders(TEST_API_KEYS.internal),
      },
      body: JSON.stringify(payload),
    });
  }

  /**
   * Generate realistic mock price
   */
  private generateMockPrice(symbol: string): string {
    const basePrices: Record<string, number> = {
      'BTC/USD': 67000,
      'ETH/USD': 2700,
      'BNB/USD': 350,
      'SOL/USD': 120,
    };

    const base = basePrices[symbol] || 100;
    // Add random variation ±2%
    const variation = base * (Math.random() * 0.04 - 0.02);
    return (base + variation).toFixed(2);
  }

  /**
   * Generate mock volume
   */
  private generateMockVolume(): string {
    return (Math.random() * 10000).toFixed(6);
  }
}

/**
 * WebSocket client helper
 */
function createWebSocket(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      resolve(ws);
    };

    ws.onerror = (error) => {
      reject(error);
    };

    setTimeout(() => {
      reject(new Error('WebSocket connection timeout'));
    }, 5000);
  });
}

/**
 * Wait for a specific message
 */
function waitForMessage(
  ws: WebSocket,
  predicate: (message: any) => boolean,
  timeout = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      ws.removeEventListener('message', handler);
      reject(new Error('Timeout waiting for message'));
    }, timeout);

    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (predicate(message)) {
          clearTimeout(timeoutId);
          ws.removeEventListener('message', handler);
          resolve(message);
        }
      } catch (error) {
        // Ignore parse errors
      }
    };

    ws.addEventListener('message', handler);
  });
}

describe('End-to-End Data Pipeline', () => {
  test('complete flow: Exchange → Collector → API → Redis → WebSocket', async () => {
    // 1. Create WebSocket client (Dashboard simulation)
    const ws = await createWebSocket();
    expect(ws.readyState).toBe(WebSocket.OPEN);

    // 2. Subscribe to price updates
    ws.send(
      JSON.stringify({
        type: 'subscribe',
        symbols: ['BTC/USD', 'ETH/USD'],
      })
    );

    // Wait for subscription confirmation
    const subConfirmation = await waitForMessage(ws, (msg) => msg.type === 'subscribed');
    expect(subConfirmation.symbols).toEqual(['BTC/USD', 'ETH/USD']);

    // 3. Set up WebSocket listener for price updates
    const btcUpdatePromise = waitForMessage(
      ws,
      (msg) => msg.type === 'price_update' && msg.data.symbol === 'BTC/USD'
    );

    // 4. Simulate exchange collector
    const collector = new MockExchangeCollector('binance');
    const priceData = await collector.collectPrices(['BTC/USD', 'ETH/USD']);

    // 5. Send data to API
    const ingestResponse = await collector.sendToAPI(priceData);
    expect(ingestResponse.status).toBe(200);

    const ingestResult = await ingestResponse.json();
    expect(ingestResult.status).toBe('success');
    expect(ingestResult.ingested).toBe(2);

    // 6. Verify data was stored in PostgreSQL
    const dbResults = await sql`
      SELECT * FROM price_feeds
      WHERE worker_id = ${priceData.worker_id}
      ORDER BY timestamp DESC
    `;

    expect(dbResults.length).toBe(2);
    expect(dbResults[0].source).toBe('binance');

    // 7. Verify data was cached in Redis
    const cachedBTC = await redis.get('latest:BTC/USD');
    expect(cachedBTC).not.toBeNull();

    const btcData = JSON.parse(cachedBTC!);
    expect(btcData.symbol).toBe('BTC/USD');
    expect(btcData.source).toBe('binance');

    // 8. Verify WebSocket received the broadcast
    const btcUpdate = await btcUpdatePromise;
    expect(btcUpdate.type).toBe('price_update');
    expect(btcUpdate.data.symbol).toBe('BTC/USD');
    expect(btcUpdate.data.source).toBe('binance');
    expect(btcUpdate.data.price).toBeDefined();

    ws.close();
  });

  test('multiple collectors from different exchanges', async () => {
    const ws = await createWebSocket();

    // Subscribe to BTC/USD
    ws.send(
      JSON.stringify({
        type: 'subscribe',
        symbols: ['BTC/USD'],
      })
    );

    await waitForMessage(ws, (msg) => msg.type === 'subscribed');

    // Track all price updates
    const priceUpdates: any[] = [];
    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'price_update') {
          priceUpdates.push(msg);
        }
      } catch (e) {
        // Ignore
      }
    });

    // Simulate collectors from 3 different exchanges
    const collectors = [
      new MockExchangeCollector('binance'),
      new MockExchangeCollector('coinbase'),
      new MockExchangeCollector('kraken'),
    ];

    // All collectors send BTC/USD data
    for (const collector of collectors) {
      const data = await collector.collectPrices(['BTC/USD']);
      const response = await collector.sendToAPI(data);
      expect(response.status).toBe(200);
    }

    // Wait for all 3 updates to arrive
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Should have received 3 price updates (one from each exchange)
    const btcUpdates = priceUpdates.filter((msg) => msg.data.symbol === 'BTC/USD');
    expect(btcUpdates.length).toBeGreaterThanOrEqual(3);

    // Should have updates from all 3 exchanges
    const sources = new Set(btcUpdates.map((u) => u.data.source));
    expect(sources.has('binance')).toBe(true);
    expect(sources.has('coinbase')).toBe(true);
    expect(sources.has('kraken')).toBe(true);

    ws.close();
  });

  test('high-frequency price updates', async () => {
    const ws = await createWebSocket();

    ws.send(
      JSON.stringify({
        type: 'subscribe',
        symbols: ['BTC/USD'],
      })
    );

    await waitForMessage(ws, (msg) => msg.type === 'subscribed');

    const priceUpdates: any[] = [];
    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'price_update' && msg.data.symbol === 'BTC/USD') {
          priceUpdates.push(msg);
        }
      } catch (e) {
        // Ignore
      }
    });

    // Simulate high-frequency updates
    const collector = new MockExchangeCollector('binance');

    // Send 10 rapid price updates
    for (let i = 0; i < 10; i++) {
      const data = await collector.collectPrices(['BTC/USD']);
      await collector.sendToAPI(data);
      // Small delay to simulate realistic timing
      await new Promise((resolve) => setTimeout(resolve, 50));
    }

    // Wait for updates to propagate
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Should have received all 10 updates
    expect(priceUpdates.length).toBeGreaterThanOrEqual(10);

    // Verify Redis cache has the latest price
    const cached = await redis.get('latest:BTC/USD');
    expect(cached).not.toBeNull();

    ws.close();
  });

  test('multi-symbol real-time streaming', async () => {
    const ws = await createWebSocket();

    const symbols = ['BTC/USD', 'ETH/USD', 'BNB/USD', 'SOL/USD'];

    ws.send(
      JSON.stringify({
        type: 'subscribe',
        symbols,
      })
    );

    await waitForMessage(ws, (msg) => msg.type === 'subscribed');

    const updatesBySymbol = new Map<string, number>();
    ws.addEventListener('message', (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'price_update') {
          const count = updatesBySymbol.get(msg.data.symbol) || 0;
          updatesBySymbol.set(msg.data.symbol, count + 1);
        }
      } catch (e) {
        // Ignore
      }
    });

    // Simulate collector sending all symbols
    const collector = new MockExchangeCollector('binance');

    // Send 3 rounds of all symbols
    for (let round = 0; round < 3; round++) {
      const data = await collector.collectPrices(symbols);
      await collector.sendToAPI(data);
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Wait for propagation
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Each symbol should have received at least 3 updates
    for (const symbol of symbols) {
      const count = updatesBySymbol.get(symbol) || 0;
      expect(count).toBeGreaterThanOrEqual(3);
    }

    ws.close();
  });

  test.skip('data persistence and retrieval', async () => {
    const collector = new MockExchangeCollector('coinbase');
    const testSymbol = 'ETH/USD';
    const testPrice = '2750.50';

    // Send specific price data
    const data = {
      worker_id: collector['workerId'],
      timestamp: new Date().toISOString(),
      feeds: [
        {
          symbol: testSymbol,
          price: testPrice,
          volume: '1000.0',
          source: 'coinbase',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const ingestResponse = await collector.sendToAPI(data);
    expect(ingestResponse.status).toBe(200);

    // Wait for data to be processed
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Query public API endpoint (requires authentication)
    const pricesResponse = await fetch(`${API_URL}/prices/latest?symbols=${testSymbol}`, {
      headers: createAuthHeaders(TEST_API_KEYS.public),
    });
    expect(pricesResponse.status).toBe(200);

    const pricesData = await pricesResponse.json();
    expect(pricesData.status).toBe('success');
    expect(pricesData.data).toBeDefined();
    expect(pricesData.data[testSymbol]).toBeDefined();
    expect(pricesData.data[testSymbol].price).toBe(testPrice);
    expect(pricesData.data[testSymbol].source).toBe('coinbase');
  });

  test('WebSocket client reconnection handling', async () => {
    // First connection
    const ws1 = await createWebSocket();

    ws1.send(
      JSON.stringify({
        type: 'subscribe',
        symbols: ['BTC/USD'],
      })
    );

    await waitForMessage(ws1, (msg) => msg.type === 'subscribed');

    // Close first connection
    ws1.close();
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Reconnect
    const ws2 = await createWebSocket();
    expect(ws2.readyState).toBe(WebSocket.OPEN);

    // Re-subscribe
    ws2.send(
      JSON.stringify({
        type: 'subscribe',
        symbols: ['BTC/USD'],
      })
    );

    const subConfirmation = await waitForMessage(ws2, (msg) => msg.type === 'subscribed');
    expect(subConfirmation.symbols).toEqual(['BTC/USD']);

    // Send price data
    const updatePromise = waitForMessage(
      ws2,
      (msg) => msg.type === 'price_update' && msg.data.symbol === 'BTC/USD'
    );

    const collector = new MockExchangeCollector('binance');
    const data = await collector.collectPrices(['BTC/USD']);
    await collector.sendToAPI(data);

    // Should receive update on new connection
    const update = await updatePromise;
    expect(update.data.symbol).toBe('BTC/USD');

    ws2.close();
  });

  test('error handling: invalid data format', async () => {
    const collector = new MockExchangeCollector('binance');

    // Send invalid data (missing required fields)
    const invalidData = {
      worker_id: collector['workerId'],
      timestamp: new Date().toISOString(),
      feeds: [
        {
          symbol: 'BTC/USD',
          // Missing 'price' field
          source: 'binance',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const response = await collector.sendToAPI(invalidData);
    expect(response.status).toBe(400);

    const result = await response.json();
    expect(result.error.code).toBe('VALIDATION_ERROR');
  });
});

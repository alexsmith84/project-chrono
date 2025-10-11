/**
 * Integration tests for WebSocket streaming
 * WS /stream
 */

import {
  describe,
  test,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
} from "bun:test";
import { setupTests, teardownTests } from "../helpers/test-setup";
import { startServer } from "../../src/server";
import { sql } from "../../src/db/client";
import { publishPriceUpdate } from "../../src/cache/pubsub";
import type { PriceFeed } from "../../src/db/types";

let server: ReturnType<typeof startServer>;
const WS_URL = "ws://localhost:3000/stream";

beforeAll(async () => {
  await setupTests();
  server = startServer();
  // Give server time to start
  await new Promise((resolve) => setTimeout(resolve, 100));
});

afterAll(async () => {
  server.stop();
  await teardownTests();
});

/**
 * Helper to create WebSocket connection
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

    // Timeout after 5 seconds
    setTimeout(() => {
      reject(new Error("WebSocket connection timeout"));
    }, 5000);
  });
}

/**
 * Helper to wait for a specific message
 */
function waitForMessage(
  ws: WebSocket,
  predicate: (message: any) => boolean,
  timeout = 5000,
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      ws.removeEventListener("message", handler);
      reject(new Error("Timeout waiting for message"));
    }, timeout);

    const handler = (event: MessageEvent) => {
      try {
        const message = JSON.parse(event.data);
        if (predicate(message)) {
          clearTimeout(timeoutId);
          ws.removeEventListener("message", handler);
          resolve(message);
        }
      } catch (error) {
        // Ignore parse errors
      }
    };

    ws.addEventListener("message", handler);
  });
}

describe("WebSocket /stream", () => {
  test("should establish WebSocket connection", async () => {
    const ws = await createWebSocket();
    expect(ws.readyState).toBe(WebSocket.OPEN);
    ws.close();
  });

  test(
    "should receive heartbeat (pong) messages",
    async () => {
      const ws = await createWebSocket();

      const pong = await waitForMessage(
        ws,
        (msg) => msg.type === "pong",
        35000, // Wait for heartbeat (30s + buffer)
      );

      expect(pong.type).toBe("pong");
      expect(pong.timestamp).toBeDefined();

      ws.close();
    },
    { timeout: 40000 }, // Set test timeout to 40s
  );

  test("should subscribe to symbols", async () => {
    const ws = await createWebSocket();

    // Send subscribe message
    ws.send(
      JSON.stringify({
        type: "subscribe",
        symbols: ["BTC/USD", "ETH/USD"],
      }),
    );

    // Wait for subscribed confirmation
    const response = await waitForMessage(
      ws,
      (msg) => msg.type === "subscribed",
    );

    expect(response.type).toBe("subscribed");
    expect(response.symbols).toEqual(["BTC/USD", "ETH/USD"]);

    ws.close();
  });

  test("should reject invalid symbol format", async () => {
    const ws = await createWebSocket();

    ws.send(
      JSON.stringify({
        type: "subscribe",
        symbols: ["INVALID", "btc/usd"], // lowercase not allowed
      }),
    );

    const response = await waitForMessage(ws, (msg) => msg.type === "error");

    expect(response.type).toBe("error");
    expect(response.message).toContain("No valid symbols");

    ws.close();
  });

  test("should receive price updates after subscription", async () => {
    const ws = await createWebSocket();

    // Subscribe to BTC/USD
    ws.send(
      JSON.stringify({
        type: "subscribe",
        symbols: ["BTC/USD"],
      }),
    );

    // Wait for subscription confirmation
    await waitForMessage(ws, (msg) => msg.type === "subscribed");

    // Publish a price update
    const priceFeed: PriceFeed = {
      id: crypto.randomUUID(),
      symbol: "BTC/USD",
      price: "67500.00",
      volume: "1000.0",
      source: "binance",
      timestamp: new Date(),
      worker_id: "test-worker",
      metadata: null,
      ingested_at: new Date(),
    };

    await publishPriceUpdate(priceFeed);

    // Wait for price update
    const update = await waitForMessage(
      ws,
      (msg) => msg.type === "price_update" && msg.data.symbol === "BTC/USD",
    );

    expect(update.type).toBe("price_update");
    expect(update.data.symbol).toBe("BTC/USD");
    expect(update.data.price).toBe("67500.00");
    expect(update.data.source).toBe("binance");

    ws.close();
  });

  test("should only receive updates for subscribed symbols", async () => {
    const ws = await createWebSocket();

    // Subscribe only to ETH/USD
    ws.send(
      JSON.stringify({
        type: "subscribe",
        symbols: ["ETH/USD"],
      }),
    );

    await waitForMessage(ws, (msg) => msg.type === "subscribed");

    // Track all received messages
    const messages: any[] = [];
    ws.addEventListener("message", (event) => {
      messages.push(JSON.parse(event.data));
    });

    // Set up listener for ETH update first
    const ethUpdatePromise = waitForMessage(
      ws,
      (msg) => msg.type === "price_update" && msg.data.symbol === "ETH/USD",
    );

    // Publish BTC/USD update (should NOT receive)
    await publishPriceUpdate({
      id: crypto.randomUUID(),
      symbol: "BTC/USD",
      price: "67000.00",
      volume: null,
      source: "binance",
      timestamp: new Date(),
      worker_id: "test",
      metadata: null,
      ingested_at: new Date(),
    });

    // Publish ETH/USD update (SHOULD receive)
    await publishPriceUpdate({
      id: crypto.randomUUID(),
      symbol: "ETH/USD",
      price: "2700.00",
      volume: null,
      source: "binance",
      timestamp: new Date(),
      worker_id: "test",
      metadata: null,
      ingested_at: new Date(),
    });

    // Wait for ETH update
    await ethUpdatePromise;

    // Check that we didn't receive BTC update
    const btcUpdates = messages.filter(
      (msg) => msg.type === "price_update" && msg.data.symbol === "BTC/USD",
    );
    expect(btcUpdates.length).toBe(0);

    ws.close();
  });

  test("should handle unsubscribe", async () => {
    const ws = await createWebSocket();

    // Subscribe to multiple symbols
    ws.send(
      JSON.stringify({
        type: "subscribe",
        symbols: ["BTC/USD", "ETH/USD"],
      }),
    );

    await waitForMessage(ws, (msg) => msg.type === "subscribed");

    // Unsubscribe from BTC/USD
    ws.send(
      JSON.stringify({
        type: "unsubscribe",
        symbols: ["BTC/USD"],
      }),
    );

    const unsubResponse = await waitForMessage(
      ws,
      (msg) => msg.type === "unsubscribed",
    );

    expect(unsubResponse.type).toBe("unsubscribed");
    expect(unsubResponse.symbols).toEqual(["BTC/USD"]);

    ws.close();
  });

  test("should respond to ping with pong", async () => {
    const ws = await createWebSocket();

    ws.send(
      JSON.stringify({
        type: "ping",
      }),
    );

    const pong = await waitForMessage(ws, (msg) => msg.type === "pong");

    expect(pong.type).toBe("pong");
    expect(pong.timestamp).toBeDefined();

    ws.close();
  });

  test("should handle invalid JSON", async () => {
    const ws = await createWebSocket();

    ws.send("invalid json{{{");

    const error = await waitForMessage(ws, (msg) => msg.type === "error");

    expect(error.type).toBe("error");
    expect(error.message).toContain("Invalid message format");

    ws.close();
  });

  test("should handle unknown message type", async () => {
    const ws = await createWebSocket();

    ws.send(
      JSON.stringify({
        type: "unknown_type",
      }),
    );

    const error = await waitForMessage(ws, (msg) => msg.type === "error");

    expect(error.type).toBe("error");
    expect(error.message).toContain("Unknown message type");

    ws.close();
  });

  test("should handle multiple concurrent connections", async () => {
    const ws1 = await createWebSocket();
    const ws2 = await createWebSocket();
    const ws3 = await createWebSocket();

    expect(ws1.readyState).toBe(WebSocket.OPEN);
    expect(ws2.readyState).toBe(WebSocket.OPEN);
    expect(ws3.readyState).toBe(WebSocket.OPEN);

    // Subscribe all to same symbol
    const subscribeMsg = JSON.stringify({
      type: "subscribe",
      symbols: ["BTC/USD"],
    });

    ws1.send(subscribeMsg);
    ws2.send(subscribeMsg);
    ws3.send(subscribeMsg);

    // Wait for all subscriptions
    await Promise.all([
      waitForMessage(ws1, (msg) => msg.type === "subscribed"),
      waitForMessage(ws2, (msg) => msg.type === "subscribed"),
      waitForMessage(ws3, (msg) => msg.type === "subscribed"),
    ]);

    // Set up listeners for price updates (start waiting before publishing)
    const updatePromises = [
      waitForMessage(ws1, (msg) => msg.type === "price_update"),
      waitForMessage(ws2, (msg) => msg.type === "price_update"),
      waitForMessage(ws3, (msg) => msg.type === "price_update"),
    ];

    // Publish one update
    await publishPriceUpdate({
      id: crypto.randomUUID(),
      symbol: "BTC/USD",
      price: "68000.00",
      volume: null,
      source: "binance",
      timestamp: new Date(),
      worker_id: "test",
      metadata: null,
      ingested_at: new Date(),
    });

    // All clients should receive it
    await Promise.all(updatePromises);

    ws1.close();
    ws2.close();
    ws3.close();
  });

  test("should clean up on connection close", async () => {
    const ws = await createWebSocket();

    // Subscribe
    ws.send(
      JSON.stringify({
        type: "subscribe",
        symbols: ["BTC/USD"],
      }),
    );

    await waitForMessage(ws, (msg) => msg.type === "subscribed");

    // Close connection
    ws.close();

    // Wait for close to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Connection should be closed
    expect(ws.readyState).toBe(WebSocket.CLOSED);
  });
});

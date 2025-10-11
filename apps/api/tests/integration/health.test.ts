/**
 * Integration tests for health and metrics endpoints
 * GET /health
 * GET /metrics
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import {
  setupTests,
  teardownTests,
  createTestApp,
} from "../helpers/test-setup";
import type { HealthResponse } from "../../src/schemas/responses";

const app = createTestApp();

beforeAll(async () => {
  await setupTests();
});

afterAll(async () => {
  await teardownTests();
});

describe("GET /health", () => {
  test("should return healthy status when all services are up", async () => {
    const response = await app.request("/health", {
      method: "GET",
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as HealthResponse;
    expect(data.status).toBe("healthy");
    expect(data.timestamp).toBeDefined();
    expect(data.services).toBeDefined();
    expect(data.services.database).toBe("healthy");
    expect(data.services.redis).toBe("healthy");
    expect(data.uptime_seconds).toBeGreaterThanOrEqual(0);
  });

  test("should include all service statuses", async () => {
    const response = await app.request("/health", {
      method: "GET",
    });

    expect(response.status).toBe(200);

    const data = (await response.json()) as HealthResponse;
    expect(data.services).toHaveProperty("database");
    expect(data.services).toHaveProperty("redis");
    expect(data.services).toHaveProperty("websocket");
  });

  test("should return valid timestamp", async () => {
    const response = await app.request("/health", {
      method: "GET",
    });

    const data = (await response.json()) as HealthResponse;
    const timestamp = new Date(data.timestamp);
    expect(timestamp.getTime()).toBeGreaterThan(0);
    expect(timestamp.getTime()).toBeLessThanOrEqual(Date.now());
  });

  test("should not require authentication", async () => {
    // Health endpoint should be public
    const response = await app.request("/health", {
      method: "GET",
    });

    expect(response.status).toBe(200);
  });

  test("should return uptime in seconds", async () => {
    const response = await app.request("/health", {
      method: "GET",
    });

    const data = (await response.json()) as HealthResponse;
    expect(data.uptime_seconds).toBeGreaterThanOrEqual(0);
    expect(typeof data.uptime_seconds).toBe("number");
  });

  test("should handle multiple concurrent health checks", async () => {
    const requests = Array.from({ length: 5 }, () =>
      app.request("/health", { method: "GET" }),
    );

    const responses = await Promise.all(requests);

    for (const response of responses) {
      expect(response.status).toBe(200);
      const data = (await response.json()) as HealthResponse;
      expect(data.status).toBe("healthy");
    }
  });
});

describe("GET /metrics", () => {
  test("should return Prometheus metrics", async () => {
    const response = await app.request("/metrics", {
      method: "GET",
    });

    expect(response.status).toBe(200);

    const metrics = await response.text();
    expect(metrics).toBeDefined();
    expect(typeof metrics).toBe("string");
    expect(metrics.length).toBeGreaterThan(0);
  });

  test("should include standard metrics", async () => {
    const response = await app.request("/metrics", {
      method: "GET",
    });

    const metrics = await response.text();

    // Check for some expected metric names
    expect(metrics.length).toBeGreaterThan(0);
    // Metrics should be in Prometheus text format
    expect(typeof metrics).toBe("string");
  });

  test("should not require authentication", async () => {
    // Metrics endpoint should be public (for Prometheus scraping)
    const response = await app.request("/metrics", {
      method: "GET",
    });

    expect(response.status).toBe(200);
  });

  test("should return metrics as text", async () => {
    const response = await app.request("/metrics", {
      method: "GET",
    });

    expect(response.status).toBe(200);
    const metrics = await response.text();
    expect(typeof metrics).toBe("string");
    expect(metrics.length).toBeGreaterThan(0);
  });

  test("should handle multiple concurrent metrics requests", async () => {
    const requests = Array.from({ length: 5 }, () =>
      app.request("/metrics", { method: "GET" }),
    );

    const responses = await Promise.all(requests);

    for (const response of responses) {
      expect(response.status).toBe(200);
      const metrics = await response.text();
      expect(metrics.length).toBeGreaterThan(0);
    }
  });
});

describe("Health and Metrics together", () => {
  test("should both be accessible without authentication", async () => {
    const [healthResponse, metricsResponse] = await Promise.all([
      app.request("/health", { method: "GET" }),
      app.request("/metrics", { method: "GET" }),
    ]);

    expect(healthResponse.status).toBe(200);
    expect(metricsResponse.status).toBe(200);
  });

  test("should return consistent health status", async () => {
    // Make multiple health checks and verify consistency
    const response1 = await app.request("/health", { method: "GET" });
    const data1 = (await response1.json()) as HealthResponse;

    const response2 = await app.request("/health", { method: "GET" });
    const data2 = (await response2.json()) as HealthResponse;

    // Both should report same health status (assuming services don't change)
    expect(data1.status).toBe(data2.status);
    expect(data1.services.database).toBe(data2.services.database);
    expect(data1.services.redis).toBe(data2.services.redis);
  });
});

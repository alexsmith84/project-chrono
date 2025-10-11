/**
 * Health check and metrics endpoints
 * GET /health - Service health status
 * GET /metrics - Prometheus metrics
 */

import { Hono } from "hono";
import type { HealthResponse } from "../schemas/responses";
import { checkDatabaseHealth } from "../db/client";
import { checkRedisHealth } from "../cache/redis";
import { getMetrics } from "../utils/metrics";

const app = new Hono();

// Track server start time for uptime calculation
const serverStartTime = Date.now();

/**
 * GET /health
 * Returns health status of all services
 */
app.get("/", async (c) => {
  const [dbHealthy, redisHealthy] = await Promise.all([
    checkDatabaseHealth(),
    checkRedisHealth(),
  ]);

  const allHealthy = dbHealthy && redisHealthy;

  const response: HealthResponse = {
    status: allHealthy ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    services: {
      database: dbHealthy ? "healthy" : "unhealthy",
      redis: redisHealthy ? "healthy" : "unhealthy",
      websocket: "healthy", // TODO: Add WebSocket health check
    },
    uptime_seconds: Math.floor((Date.now() - serverStartTime) / 1000),
  };

  const statusCode = allHealthy ? 200 : 503;

  return c.json(response, statusCode);
});

/**
 * GET /metrics
 * Returns Prometheus metrics
 */
app.get("/metrics", async (c) => {
  const metrics = await getMetrics();
  return c.text(metrics, 200, {
    "Content-Type": "text/plain; version=0.0.4",
  });
});

export default app;

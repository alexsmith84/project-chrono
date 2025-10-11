/**
 * Prometheus metrics
 * Exposes application and business metrics
 */

import { Registry, Counter, Histogram, Gauge } from 'prom-client';
import { config } from './config';

/**
 * Global metrics registry
 */
export const register = new Registry();

// Add default labels to all metrics
register.setDefaultLabels({
  app: 'project-chrono-api',
  env: config.NODE_ENV,
});

/**
 * HTTP request duration histogram
 */
export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_ms',
  help: 'HTTP request duration in milliseconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 200, 500, 1000, 2000, 5000],
  registers: [register],
});

/**
 * Price ingestions counter
 */
export const priceIngestionsTotal = new Counter({
  name: 'price_ingestions_total',
  help: 'Total number of price feeds ingested',
  labelNames: ['worker_id', 'symbol', 'status'],
  registers: [register],
});

/**
 * Price ingestion duration histogram
 */
export const priceIngestionDuration = new Histogram({
  name: 'price_ingestion_duration_ms',
  help: 'Price ingestion duration in milliseconds',
  labelNames: ['worker_id'],
  buckets: [10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

/**
 * Active WebSocket connections gauge
 */
export const websocketConnections = new Gauge({
  name: 'websocket_connections_active',
  help: 'Number of active WebSocket connections',
  registers: [register],
});

/**
 * WebSocket messages sent counter
 */
export const websocketMessagesSent = new Counter({
  name: 'websocket_messages_sent_total',
  help: 'Total number of WebSocket messages sent',
  labelNames: ['type'],
  registers: [register],
});

/**
 * Cache hits/misses counter
 */
export const cacheOperations = new Counter({
  name: 'cache_operations_total',
  help: 'Total number of cache operations',
  labelNames: ['operation', 'status'],
  registers: [register],
});

/**
 * Database query duration histogram
 */
export const databaseQueryDuration = new Histogram({
  name: 'database_query_duration_ms',
  help: 'Database query duration in milliseconds',
  labelNames: ['query_type'],
  buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  registers: [register],
});

/**
 * Rate limit rejections counter
 */
export const rateLimitRejections = new Counter({
  name: 'rate_limit_rejections_total',
  help: 'Total number of requests rejected due to rate limiting',
  labelNames: ['api_key_type'],
  registers: [register],
});

/**
 * API errors counter
 */
export const apiErrors = new Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['error_code', 'route'],
  registers: [register],
});

/**
 * Get metrics in Prometheus format
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Clear all metrics (useful for testing)
 */
export function clearMetrics(): void {
  register.clear();
}

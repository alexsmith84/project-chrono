/**
 * Response schemas for API endpoints
 * Ensures consistent response formats
 */

import { z } from "zod";

/**
 * Standard error response
 */
export const errorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.record(z.unknown()).optional(),
    request_id: z.string().optional(),
  }),
  status: z.number().int(),
});

/**
 * Latest price data
 */
export const latestPriceDataSchema = z.object({
  symbol: z.string(),
  price: z.string(),
  volume: z.string().nullable(),
  source: z.string(),
  timestamp: z.string(), // ISO 8601
  staleness_ms: z.number().int(), // Time since last update
});

/**
 * Latest prices response
 */
export const latestPricesResponseSchema = z.object({
  data: z.array(latestPriceDataSchema),
  cached: z.boolean(),
  latency_ms: z.number(),
});

/**
 * OHLCV (Open, High, Low, Close, Volume) data point
 */
export const ohlcvDataSchema = z.object({
  timestamp: z.string(), // ISO 8601
  open: z.string(),
  high: z.string(),
  low: z.string(),
  close: z.string(),
  volume: z.string(),
  num_feeds: z.number().int(),
});

/**
 * Price range response
 */
export const priceRangeResponseSchema = z.object({
  data: z.array(ohlcvDataSchema),
  interval: z.string().optional(),
  count: z.number().int(),
  latency_ms: z.number(),
});

/**
 * Consensus price data
 */
export const consensusPriceDataSchema = z.object({
  symbol: z.string(),
  price: z.string(), // Median price
  median: z.string(),
  mean: z.string(),
  std_dev: z.string().nullable(),
  num_sources: z.number().int(),
  timestamp: z.string(), // ISO 8601
  sources: z.array(z.string()),
});

/**
 * Consensus prices response
 */
export const consensusPricesResponseSchema = z.object({
  data: z.array(consensusPriceDataSchema),
  latency_ms: z.number(),
});

/**
 * Health check response
 */
export const healthResponseSchema = z.object({
  status: z.enum(["healthy", "degraded", "unhealthy"]),
  timestamp: z.string(), // ISO 8601
  services: z.object({
    database: z.enum(["healthy", "unhealthy"]),
    redis: z.enum(["healthy", "unhealthy"]),
    websocket: z.enum(["healthy", "unhealthy"]),
  }),
  uptime_seconds: z.number().int(),
});

/**
 * Type exports
 */
export type ErrorResponse = z.infer<typeof errorResponseSchema>;
export type LatestPriceData = z.infer<typeof latestPriceDataSchema>;
export type LatestPricesResponse = z.infer<typeof latestPricesResponseSchema>;
export type OHLCVData = z.infer<typeof ohlcvDataSchema>;
export type PriceRangeResponse = z.infer<typeof priceRangeResponseSchema>;
export type ConsensusPriceData = z.infer<typeof consensusPriceDataSchema>;
export type ConsensusPricesResponse = z.infer<
  typeof consensusPricesResponseSchema
>;
export type HealthResponse = z.infer<typeof healthResponseSchema>;

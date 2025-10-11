/**
 * OpenAPI-enhanced Zod schemas
 * Uses @hono/zod-openapi for Bun compatibility
 */

import { z } from "@hono/zod-openapi";

// =====================================================
// Ingest Schemas
// =====================================================

export const PriceFeedSchema = z
  .object({
    symbol: z.string().openapi({
      example: "BTC/USD",
      description: "Trading pair symbol (e.g., BTC/USD, ETH/USD)",
    }),
    price: z.number().positive().openapi({
      example: 45123.5,
      description: "Asset price (must be positive)",
    }),
    volume: z.number().nonnegative().optional().openapi({
      example: 1234567.89,
      description: "Trading volume (optional)",
    }),
    timestamp: z.string().datetime().openapi({
      example: "2025-10-10T14:30:00Z",
      description: "Price timestamp in ISO 8601 format",
    }),
    source: z.string().openapi({
      example: "coinbase",
      description: "Exchange source identifier",
    }),
    worker_id: z.string().optional().openapi({
      example: "worker-us-east-1",
      description: "Worker ID that collected this data",
    }),
    metadata: z.record(z.unknown()).optional().openapi({
      description: "Additional exchange-specific metadata",
    }),
  })
  .openapi("PriceFeed");

export const IngestRequestSchema = z
  .object({
    feeds: z.array(PriceFeedSchema).min(1).max(100).openapi({
      description: "Array of price feed data (1-100 feeds per batch)",
    }),
  })
  .openapi("IngestRequest");

export const IngestResponseSchema = z
  .object({
    ingested: z.number().openapi({
      description: "Number of price feeds successfully ingested",
    }),
    message: z.string().openapi({
      description: "Success message",
    }),
  })
  .openapi("IngestResponse");

// =====================================================
// Query Schemas
// =====================================================

export const LatestPricesQuerySchema = z
  .object({
    symbols: z.string().openapi({
      example: "BTC/USD,ETH/USD",
      description: "Comma-separated list of trading pair symbols",
    }),
  })
  .openapi("LatestPricesQuery");

export const PriceDataSchema = z
  .object({
    symbol: z.string().openapi({ example: "BTC/USD" }),
    price: z.number().openapi({ example: 45123.5 }),
    volume: z.number().nullable().openapi({ example: 1234567.89 }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: "2025-10-10T14:30:00Z" }),
    source: z.string().openapi({ example: "coinbase" }),
  })
  .openapi("PriceData");

export const LatestPricesResponseSchema = z
  .object({
    prices: z.array(PriceDataSchema).openapi({
      description: "Array of latest price data",
    }),
  })
  .openapi("LatestPricesResponse");

export const PriceRangeQuerySchema = z
  .object({
    symbol: z.string().openapi({
      example: "BTC/USD",
      description: "Trading pair symbol",
    }),
    start: z.string().datetime().openapi({
      example: "2025-10-10T00:00:00Z",
      description: "Start timestamp (ISO 8601)",
    }),
    end: z.string().datetime().openapi({
      example: "2025-10-10T23:59:59Z",
      description: "End timestamp (ISO 8601)",
    }),
    interval: z
      .enum(["1m", "5m", "15m", "30m", "1h", "4h", "1d"])
      .optional()
      .openapi({
        example: "5m",
        description:
          "OHLCV aggregation interval (optional, returns raw data if omitted)",
      }),
    source: z.string().optional().openapi({
      example: "coinbase",
      description: "Filter by specific exchange source (optional)",
    }),
    limit: z.coerce.number().int().positive().max(1000).optional().openapi({
      example: 100,
      description: "Maximum number of results (default: 100, max: 1000)",
    }),
  })
  .openapi("PriceRangeQuery");

export const OHLCVDataSchema = z
  .object({
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: "2025-10-10T14:30:00Z" }),
    open: z.number().openapi({ example: 45000.0 }),
    high: z.number().openapi({ example: 45200.0 }),
    low: z.number().openapi({ example: 44900.0 }),
    close: z.number().openapi({ example: 45100.0 }),
    volume: z.number().openapi({ example: 1500000.0 }),
    count: z.number().int().openapi({ example: 125 }),
  })
  .openapi("OHLCVData");

export const PriceRangeResponseSchema = z
  .object({
    prices: z
      .union([z.array(PriceDataSchema), z.array(OHLCVDataSchema)])
      .openapi({
        description:
          "Array of price data (raw or OHLCV depending on interval parameter)",
      }),
  })
  .openapi("PriceRangeResponse");

export const ConsensusQuerySchema = z
  .object({
    symbols: z.string().openapi({
      example: "BTC/USD,ETH/USD",
      description: "Comma-separated list of trading pair symbols",
    }),
    timestamp: z.string().datetime().optional().openapi({
      example: "2025-10-10T14:30:00Z",
      description:
        "Timestamp for consensus calculation (default: current time)",
    }),
  })
  .openapi("ConsensusQuery");

export const ConsensusPriceSchema = z
  .object({
    symbol: z.string().openapi({ example: "BTC/USD" }),
    consensus_price: z.number().openapi({ example: 45123.5 }),
    vwap: z.number().nullable().openapi({ example: 45125.3 }),
    twap: z.number().nullable().openapi({ example: 45120.1 }),
    weighted_median: z.number().nullable().openapi({ example: 45123.0 }),
    confidence: z.number().nullable().openapi({ example: 0.95 }),
    sources_used: z.number().int().openapi({ example: 3 }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: "2025-10-10T14:30:00Z" }),
  })
  .openapi("ConsensusPrice");

export const ConsensusResponseSchema = z
  .object({
    prices: z.array(ConsensusPriceSchema).openapi({
      description: "Array of consensus price data",
    }),
  })
  .openapi("ConsensusResponse");

// =====================================================
// Health & Metrics Schemas
// =====================================================

export const HealthResponseSchema = z
  .object({
    status: z
      .enum(["healthy", "degraded", "unhealthy"])
      .openapi({ example: "healthy" }),
    timestamp: z
      .string()
      .datetime()
      .openapi({ example: "2025-10-10T14:30:00Z" }),
    uptime: z.number().openapi({
      example: 3600.5,
      description: "Server uptime in seconds",
    }),
    services: z
      .object({
        database: z
          .enum(["healthy", "unhealthy"])
          .openapi({ example: "healthy" }),
        redis: z.enum(["healthy", "unhealthy"]).openapi({ example: "healthy" }),
      })
      .openapi({
        description: "Status of dependent services",
      }),
  })
  .openapi("HealthResponse");

// =====================================================
// Error Schemas
// =====================================================

export const ErrorResponseSchema = z
  .object({
    error: z.string().openapi({
      description: "Error message",
    }),
    details: z.unknown().optional().openapi({
      description: "Additional error details",
    }),
  })
  .openapi("ErrorResponse");

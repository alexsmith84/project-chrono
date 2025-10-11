/**
 * OpenAPI 3.1 Specification Generator
 * Uses @hono/zod-openapi for Bun compatibility
 */

import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import {
  IngestRequestSchema,
  IngestResponseSchema,
  LatestPricesQuerySchema,
  LatestPricesResponseSchema,
  PriceRangeQuerySchema,
  PriceRangeResponseSchema,
  ConsensusQuerySchema,
  ConsensusResponseSchema,
  HealthResponseSchema,
  ErrorResponseSchema,
} from "./schemas";

export function generateOpenApiSpec() {
  const app = new OpenAPIHono();

  // =====================================================
  // Internal Endpoints
  // =====================================================

  const ingestRoute = createRoute({
    method: "post",
    path: "/internal/ingest",
    summary: "Ingest price feeds",
    description:
      "Batch ingestion endpoint for Cloudflare Workers to submit price data from exchanges. Requires internal API key.",
    tags: ["Internal"],
    security: [{ bearerAuth: [] }],
    request: {
      body: {
        content: {
          "application/json": {
            schema: IngestRequestSchema,
          },
        },
      },
    },
    responses: {
      201: {
        description: "Successfully ingested price feeds",
        content: {
          "application/json": {
            schema: IngestResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request payload",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Missing or invalid authentication token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      403: {
        description: "Insufficient permissions (requires internal API key)",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });

  // =====================================================
  // Price Endpoints
  // =====================================================

  const latestPricesRoute = createRoute({
    method: "get",
    path: "/prices/latest",
    summary: "Get latest prices",
    description:
      "Retrieve the most recent price for one or more trading pairs. Results are cached for 2 seconds.",
    tags: ["Prices"],
    security: [{ bearerAuth: [] }],
    request: {
      query: LatestPricesQuerySchema,
    },
    responses: {
      200: {
        description: "Latest price data",
        content: {
          "application/json": {
            schema: LatestPricesResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid query parameters",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Missing or invalid authentication token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });

  const priceRangeRoute = createRoute({
    method: "get",
    path: "/prices/range",
    summary: "Get price history",
    description:
      "Retrieve historical price data for a trading pair within a time range. Optionally aggregate into OHLCV candles using the interval parameter.",
    tags: ["Prices"],
    security: [{ bearerAuth: [] }],
    request: {
      query: PriceRangeQuerySchema,
    },
    responses: {
      200: {
        description: "Historical price data (raw or OHLCV)",
        content: {
          "application/json": {
            schema: PriceRangeResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid query parameters",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Missing or invalid authentication token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });

  // =====================================================
  // Aggregate Endpoints
  // =====================================================

  const consensusRoute = createRoute({
    method: "get",
    path: "/aggregates/consensus",
    summary: "Get consensus prices",
    description:
      "Calculate consensus prices for one or more trading pairs using VWAP, TWAP, and weighted median algorithms across multiple exchange sources.",
    tags: ["Aggregates"],
    security: [{ bearerAuth: [] }],
    request: {
      query: ConsensusQuerySchema,
    },
    responses: {
      200: {
        description: "Consensus price data",
        content: {
          "application/json": {
            schema: ConsensusResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid query parameters",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
      401: {
        description: "Missing or invalid authentication token",
        content: {
          "application/json": {
            schema: ErrorResponseSchema,
          },
        },
      },
    },
  });

  // =====================================================
  // System Endpoints
  // =====================================================

  const healthRoute = createRoute({
    method: "get",
    path: "/health",
    summary: "Health check",
    description:
      "Check API server health and status of dependent services (PostgreSQL, Redis). No authentication required.",
    tags: ["System"],
    responses: {
      200: {
        description: "Service health status",
        content: {
          "application/json": {
            schema: HealthResponseSchema,
          },
        },
      },
    },
  });

  const metricsRoute = createRoute({
    method: "get",
    path: "/metrics",
    summary: "Prometheus metrics",
    description:
      "Prometheus-compatible metrics endpoint for monitoring and observability. No authentication required.",
    tags: ["System"],
    responses: {
      200: {
        description: "Prometheus metrics in text format",
        content: {
          "text/plain": {
            schema: {
              type: "string",
              example:
                '# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",path="/health",status="200"} 1234',
            },
          },
        },
      },
    },
  });

  // Register routes (required to generate OpenAPI spec)
  app.openapi(ingestRoute, () => ({ ingested: 0, message: "" }));
  app.openapi(latestPricesRoute, () => ({ prices: [] }));
  app.openapi(priceRangeRoute, () => ({ prices: [] }));
  app.openapi(consensusRoute, () => ({ prices: [] }));
  app.openapi(healthRoute, () => ({
    status: "healthy" as const,
    timestamp: "",
    uptime: 0,
    services: { database: "healthy" as const, redis: "healthy" as const },
  }));
  app.openapi(
    metricsRoute,
    () => new Response("", { headers: { "Content-Type": "text/plain" } }),
  );

  // Generate OpenAPI document
  app.doc("/openapi.json", {
    openapi: "3.1.0",
    info: {
      title: "Project Chrono API",
      version: "1.0.0",
      description: `
# FTSO Price Feed Aggregation and Consensus API

Project Chrono provides real-time and historical cryptocurrency price data with multi-source consensus algorithms.

## Features

- **Price Ingestion**: High-throughput batch ingestion from multiple exchanges
- **Latest Prices**: Cached real-time price queries
- **Historical Data**: Time-range queries with optional OHLCV aggregation
- **Consensus Pricing**: Multi-algorithm consensus (VWAP, TWAP, weighted median)
- **WebSocket Streaming**: Real-time price updates via WebSocket (see [WebSocket docs](https://github.com/alexsmith84/project-chrono/blob/main/docs/api/websocket.md))

## Authentication

All endpoints (except /health and /metrics) require API key authentication via Bearer token:

\`\`\`
Authorization: Bearer chrono_{type}_{env}_key_{id}
\`\`\`

**API Key Types**:
- \`internal\`: Ingestion endpoints (Cloudflare Workers)
- \`public\`: Query endpoints (external developers)
- \`admin\`: Administrative access (all endpoints)

See [Authentication Guide](https://github.com/alexsmith84/project-chrono/blob/main/docs/api/authentication.md) for details.

## Rate Limiting

- **Internal API**: 5000 requests/minute
- **Public API**: 1000 requests/minute (free tier)
- **Admin API**: Unlimited
      `.trim(),
      contact: {
        name: "Project Chrono Team",
      },
      license: {
        name: "MIT",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
      {
        url: "https://api-staging.chrono.dev",
        description: "Staging server",
      },
      {
        url: "https://api.chrono.dev",
        description: "Production server",
      },
    ],
    tags: [
      {
        name: "Prices",
        description: "Query endpoints for current and historical price data",
      },
      {
        name: "Aggregates",
        description: "Consensus price calculations across multiple exchanges",
      },
      {
        name: "Internal",
        description:
          "Internal endpoints for data ingestion (restricted access)",
      },
      {
        name: "System",
        description: "Health monitoring and metrics endpoints",
      },
    ],
    externalDocs: {
      description: "Full API documentation and guides",
      url: "https://github.com/alexsmith84/project-chrono/tree/main/docs/api",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "API Key",
          description:
            "API key authentication using Bearer token. Format: `chrono_{type}_{env}_key_{id}` where type is internal/public/admin.",
        },
      },
    },
  });

  return app;
}

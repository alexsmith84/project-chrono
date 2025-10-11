/**
 * Documentation Routes
 * Serves OpenAPI specification and Scalar UI interactive documentation
 */

import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";
import spec from "../openapi/spec.json";

export const docsRouter = new Hono();

/**
 * GET /openapi.json
 * Serves OpenAPI 3.1 specification as JSON
 */
docsRouter.get("/openapi.json", (c) => {
  return c.json(spec);
});

/**
 * GET /docs
 * Serves interactive API documentation powered by Scalar UI
 */
docsRouter.get(
  "/docs",
  apiReference({
    spec: {
      url: "/openapi.json",
    },
    theme: "purple",
    darkMode: true,
    layout: "modern",
    defaultHttpClient: {
      targetKey: "javascript",
      clientKey: "fetch",
    },
    customCss: `
      .scalar-api-reference {
        --scalar-color-1: #8b5cf6;
        --scalar-color-2: #a78bfa;
        --scalar-color-3: #c4b5fd;
        --scalar-font: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      }

      .scalar-api-reference .scalar-card {
        border-radius: 8px;
      }

      .scalar-api-reference code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      }
    `,
    searchHotKey: "k",
  }),
);

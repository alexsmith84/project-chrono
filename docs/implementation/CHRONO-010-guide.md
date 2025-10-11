# CHRONO-010 Implementation Guide

**Ticket**: CHRONO-010: API Documentation
**Estimated Time**: 1-2 hours
**Prerequisites**: CHRONO-007, CHRONO-008, CHRONO-009 merged

---

## Implementation Checklist

### Phase 1: OpenAPI Specification (~30 min)

- [ ] **Step 1.1**: Install dependencies

  ```bash
  cd apps/api
  bun add @asteasolutions/zod-to-openapi @scalar/hono-api-reference
  ```

- [ ] **Step 1.2**: Create OpenAPI directory structure

  ```bash
  mkdir -p src/openapi
  ```

- [ ] **Step 1.3**: Extend Zod schemas with OpenAPI metadata
  - File: `apps/api/src/openapi/schemas.ts`
  - Import existing schemas from `src/schemas/*`
  - Add `.describe()` and `.openapi()` methods
  - Add example values for all fields

- [ ] **Step 1.4**: Create OpenAPI spec generator
  - File: `apps/api/src/openapi/spec.ts`
  - Define API info (title, version, description)
  - Define servers (development, staging, production)
  - Define security schemes (Bearer auth)
  - Register all paths and components

- [ ] **Step 1.5**: Test OpenAPI spec generation
  ```bash
  bun run src/openapi/spec.ts
  # Should output valid JSON without errors
  ```

### Phase 2: Scalar UI Integration (~15 min)

- [ ] **Step 2.1**: Create docs route
  - File: `apps/api/src/routes/docs.ts`
  - Add `GET /docs` endpoint with Scalar UI
  - Add `GET /openapi.json` endpoint serving spec
  - Configure Scalar theme and branding

- [ ] **Step 2.2**: Register docs routes in server
  - File: `apps/api/src/server.ts`
  - Import and register docs routes
  - Ensure `/docs` is accessible without authentication

- [ ] **Step 2.3**: Test documentation UI

  ```bash
  bun run dev
  # Open http://localhost:3000/docs
  # Verify UI loads and displays all endpoints
  ```

- [ ] **Step 2.4**: Test interactive features
  - Try "Try It Out" button on `/health` endpoint
  - Test authentication with public API key
  - Verify code generation works (curl, JavaScript, etc.)

### Phase 3: Developer Guides (~15 min)

- [ ] **Step 3.1**: Create API docs directory

  ```bash
  mkdir -p docs/api/examples
  ```

- [ ] **Step 3.2**: Write authentication guide
  - File: `docs/api/authentication.md`
  - Document three API key types
  - Explain Bearer token usage
  - Include security best practices

- [ ] **Step 3.3**: Write WebSocket documentation
  - File: `docs/api/websocket.md`
  - Document connection process
  - Define all message types with JSON schemas
  - Include JavaScript client example

- [ ] **Step 3.4**: Write integration examples
  - File: `docs/api/examples/curl.md` - curl examples for all endpoints
  - File: `docs/api/examples/javascript.md` - JS/TS client examples
  - File: `docs/api/examples/python.md` - Python client examples

- [ ] **Step 3.5**: Write API overview
  - File: `docs/api/README.md`
  - Quick start guide
  - Links to all other documentation
  - Rate limiting information

### Phase 4: Validation and Testing (~15 min)

- [ ] **Step 4.1**: Validate OpenAPI spec
  - Visit https://editor.swagger.io/
  - Paste content from `http://localhost:3000/openapi.json`
  - Fix any validation errors

- [ ] **Step 4.2**: Manual testing checklist
  - [ ] All endpoints appear in `/docs`
  - [ ] Request/response schemas are complete
  - [ ] Authentication requirements are shown
  - [ ] Examples are present and realistic
  - [ ] Try-it-out works for public endpoints
  - [ ] Code generation produces valid code

- [ ] **Step 4.3**: Test developer guides
  - [ ] Follow authentication guide - verify clarity
  - [ ] Copy curl examples - verify they work
  - [ ] Copy JavaScript examples - verify they work
  - [ ] Follow WebSocket guide - can connect successfully

- [ ] **Step 4.4**: External developer test
  - Close all code editors
  - Only use `/docs` and `docs/api/*` guides
  - Attempt to integrate with API
  - Note any confusing parts

---

## Detailed Implementation Steps

### Step 1.3: Extend Zod Schemas

**File**: `apps/api/src/openapi/schemas.ts`

```typescript
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

// Enable OpenAPI extensions on Zod
extendZodWithOpenApi(z);

// Re-export existing schemas with OpenAPI metadata
export const IngestRequestSchema = z
  .object({
    feeds: z
      .array(
        z.object({
          symbol: z
            .string()
            .describe("Trading pair symbol (e.g., BTC/USD)")
            .openapi({ example: "BTC/USD" }),
          price: z
            .number()
            .positive()
            .describe("Asset price (must be positive)")
            .openapi({ example: 45123.5 }),
          volume: z
            .number()
            .nonnegative()
            .optional()
            .describe("Trading volume (optional)")
            .openapi({ example: 1234567.89 }),
          timestamp: z
            .string()
            .datetime()
            .describe("Price timestamp in ISO 8601 format")
            .openapi({ example: "2025-10-10T14:30:00Z" }),
          source: z
            .string()
            .describe("Exchange source identifier")
            .openapi({ example: "coinbase" }),
          worker_id: z
            .string()
            .optional()
            .describe("Worker ID that collected this data")
            .openapi({ example: "worker-us-east-1" }),
          metadata: z
            .record(z.unknown())
            .optional()
            .describe("Additional exchange-specific metadata"),
        }),
      )
      .min(1)
      .max(100)
      .describe("Array of price feed data (1-100 feeds per batch)"),
  })
  .openapi("IngestRequest");

// Continue for all schemas...
```

### Step 1.4: Create OpenAPI Spec

**File**: `apps/api/src/openapi/spec.ts`

```typescript
import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
} from "@asteasolutions/zod-to-openapi";
import {
  IngestRequestSchema,
  LatestPricesQuerySchema /* ... */,
} from "./schemas";

export function generateOpenApiSpec() {
  const registry = new OpenAPIRegistry();

  // Register security schemes
  registry.registerComponent("securitySchemes", "bearerAuth", {
    type: "http",
    scheme: "bearer",
    bearerFormat: "API Key",
    description: "API key with format: chrono_{type}_{env}_key_{id}",
  });

  // Register paths
  registry.registerPath({
    method: "post",
    path: "/internal/ingest",
    summary: "Ingest price feeds",
    description:
      "Batch ingestion endpoint for Cloudflare Workers to submit price data",
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
            schema: z.object({
              ingested: z.number(),
              message: z.string(),
            }),
          },
        },
      },
      400: { description: "Invalid request payload" },
      401: { description: "Missing or invalid authentication" },
      403: { description: "Insufficient permissions" },
    },
  });

  // Continue for all endpoints...

  const generator = new OpenApiGeneratorV31(registry.definitions);

  return generator.generateDocument({
    openapi: "3.1.0",
    info: {
      title: "Project Chrono API",
      version: "1.0.0",
      description: "FTSO Price Feed Aggregation and Consensus API",
      contact: {
        name: "Project Chrono Team",
      },
    },
    servers: [
      {
        url: "http://localhost:3000",
        description: "Development server",
      },
    ],
    tags: [
      { name: "Prices", description: "Price query endpoints" },
      { name: "Aggregates", description: "Consensus price aggregates" },
      { name: "Internal", description: "Internal API endpoints (restricted)" },
      { name: "System", description: "Health and monitoring endpoints" },
    ],
  });
}
```

### Step 2.1: Create Docs Route

**File**: `apps/api/src/routes/docs.ts`

```typescript
import { Hono } from "hono";
import { apiReference } from "@scalar/hono-api-reference";
import { generateOpenApiSpec } from "../openapi/spec";

export const docsRouter = new Hono();

// Serve OpenAPI spec as JSON
docsRouter.get("/openapi.json", (c) => {
  const spec = generateOpenApiSpec();
  return c.json(spec);
});

// Serve interactive API documentation
docsRouter.get(
  "/docs",
  apiReference({
    spec: {
      url: "/openapi.json",
    },
    theme: "purple",
    darkMode: true,
    layout: "modern",
    customCss: `
      .scalar-api-reference {
        --scalar-color-1: #8b5cf6;
        --scalar-color-2: #a78bfa;
        --scalar-color-3: #c4b5fd;
      }
    `,
  }),
);
```

### Step 2.2: Register Docs Routes

**File**: `apps/api/src/server.ts`

```typescript
import { docsRouter } from "./routes/docs";

// ... existing imports and setup ...

export function createApp(): Hono {
  const app = new Hono();

  // ... existing middleware ...

  // Documentation routes (no auth required)
  app.route("/", docsRouter);

  // ... existing routes ...

  return app;
}
```

---

## Code Examples to Include in Docs

### Authentication Example (docs/api/authentication.md)

```bash
# Using public API key
curl -X GET "http://localhost:3000/prices/latest?symbols=BTC/USD" \
  -H "Authorization: Bearer chrono_public_dev_key_001"

# Using internal API key
curl -X POST "http://localhost:3000/internal/ingest" \
  -H "Authorization: Bearer chrono_internal_dev_key_001" \
  -H "Content-Type: application/json" \
  -d '{
    "feeds": [{
      "symbol": "BTC/USD",
      "price": 45123.50,
      "timestamp": "2025-10-10T14:30:00Z",
      "source": "coinbase"
    }]
  }'
```

### WebSocket Example (docs/api/websocket.md)

```javascript
// Connect to WebSocket
const ws = new WebSocket("ws://localhost:3000/stream", {
  headers: {
    Authorization: "Bearer chrono_public_dev_key_001",
  },
});

ws.on("open", () => {
  // Subscribe to price feeds
  ws.send(
    JSON.stringify({
      type: "subscribe",
      symbols: ["BTC/USD", "ETH/USD"],
    }),
  );
});

ws.on("message", (data) => {
  const message = JSON.parse(data);

  if (message.type === "price_update") {
    console.log(`${message.symbol}: $${message.price}`);
  }
});
```

---

## Testing Checklist

### OpenAPI Spec Validation

- [ ] Visit https://editor.swagger.io/
- [ ] Paste OpenAPI JSON
- [ ] No validation errors
- [ ] All endpoints present
- [ ] All schemas valid

### Documentation UI Testing

- [ ] Navigate to `/docs`
- [ ] Page loads successfully
- [ ] All endpoints listed
- [ ] Endpoints organized by tags
- [ ] Authentication shown for protected endpoints
- [ ] Request/response examples present

### Try-It-Out Testing

- [ ] Test `/health` endpoint (no auth)
- [ ] Test `/prices/latest` with API key
- [ ] Verify authentication errors without key
- [ ] Verify code generation works
- [ ] Generated code is valid

### Developer Guide Testing

- [ ] Authentication guide is clear
- [ ] curl examples work
- [ ] JavaScript examples work
- [ ] Python examples work (if included)
- [ ] WebSocket example connects successfully

---

## Common Issues and Solutions

### Issue: OpenAPI spec doesn't include all endpoints

**Solution**: Verify all paths are registered in `spec.ts`:

```typescript
registry.registerPath({ ... });
```

### Issue: Zod schemas don't appear in OpenAPI

**Solution**: Ensure you called `extendZodWithOpenApi(z)` before defining schemas.

### Issue: Try-It-Out doesn't work

**Solution**: Check CORS configuration allows requests from `/docs` page.

### Issue: Examples don't show in documentation

**Solution**: Add `.openapi({ example: '...' })` to all schema fields.

---

## Definition of Done

- [ ] All code committed and pushed
- [ ] `/docs` endpoint accessible
- [ ] OpenAPI spec validates successfully
- [ ] All endpoints documented
- [ ] Authentication guide complete
- [ ] WebSocket guide complete
- [ ] Integration examples complete
- [ ] External developer can integrate using only docs
- [ ] PR created with link to live `/docs` in description

---

_"The knowledge is preserved. The Khala provides guidance to all who seek it."_

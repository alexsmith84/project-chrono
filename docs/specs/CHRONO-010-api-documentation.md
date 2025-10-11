# CHRONO-010: API Documentation

**Status**: Ready
**Priority**: High
**Supply Cost**: 34 (1-2 hours)
**Prerequisites**: CHRONO-007 (REST API), CHRONO-008 (WebSocket), CHRONO-009 (Load Testing)
**Created**: 2025-10-10

---

## Overview

Create comprehensive, interactive API documentation for Project Chrono's REST and WebSocket APIs. This documentation will serve developers integrating with the API, internal team members, and future contributors.

**Goal**: Provide a single source of truth for all API endpoints, authentication, and usage patterns with interactive exploration capabilities.

---

## Problem Statement

Currently, the API has:

- ✅ Working REST endpoints (`/prices/*`, `/aggregates/*`, `/internal/ingest`)
- ✅ WebSocket streaming endpoint (`/stream`)
- ✅ Integration tests documenting behavior
- ❌ No formal API documentation
- ❌ No interactive API explorer
- ❌ No authentication guide for external developers

Without proper documentation:

- External developers don't know how to use the API
- Internal team members need to read code to understand endpoints
- Testing API manually requires writing curl commands
- No visibility into API capabilities for stakeholders

---

## Solution

Add three components:

### 1. OpenAPI Specification (Swagger)

- Machine-readable API definition (OpenAPI 3.1)
- Describes all endpoints, parameters, request/response schemas
- Includes authentication requirements
- Provides example requests and responses

### 2. Interactive API Documentation (Scalar UI)

- Beautiful, modern documentation interface
- Try-it-out feature for testing endpoints live
- Automatic code generation (curl, JavaScript, Python, etc.)
- Served at `/docs` endpoint

### 3. Developer Guides

- Authentication guide (API key types, usage)
- WebSocket protocol documentation (message types, lifecycle)
- Integration examples (common use cases)
- Rate limiting and best practices

---

## Requirements

### Functional Requirements

**FR-1: OpenAPI Specification**

- MUST define all public endpoints (`/prices/*`, `/aggregates/*`)
- MUST define internal endpoints (`/internal/ingest`)
- MUST define health/metrics endpoints (`/health`, `/metrics`)
- MUST include request/response schemas using existing Zod schemas
- MUST document authentication requirements per endpoint
- MUST include example values for all parameters
- SHOULD include error response schemas (400, 401, 403, 404, 500)

**FR-2: Interactive Documentation UI**

- MUST serve at `/docs` endpoint
- MUST allow testing endpoints with authentication
- MUST generate code examples in multiple languages
- MUST be visually consistent and easy to navigate
- SHOULD work without JavaScript (progressive enhancement)
- SHOULD be lightweight (< 1MB total assets)

**FR-3: WebSocket Documentation**

- MUST document connection upgrade process
- MUST define all message types (subscribe, unsubscribe, ping, pong, price_update, error)
- MUST include JSON schema for each message type
- MUST document authentication requirements
- MUST include connection lifecycle (connect → auth → subscribe → receive → unsubscribe → close)
- SHOULD include example WebSocket client code

**FR-4: Authentication Guide**

- MUST document three API key types (internal, public, admin)
- MUST explain `Authorization: Bearer <key>` header usage
- MUST list which endpoints require which key types
- SHOULD include security best practices
- SHOULD explain rate limiting per key type

**FR-5: Integration Examples**

- MUST include curl examples for all endpoints
- SHOULD include JavaScript/TypeScript examples
- SHOULD include Python examples
- SHOULD document common integration patterns (polling vs WebSocket)

### Non-Functional Requirements

**NFR-1: Performance**

- Documentation page MUST load in < 2 seconds
- Documentation assets SHOULD be cached (1 hour)
- OpenAPI spec SHOULD be generated at build time, not runtime

**NFR-2: Maintainability**

- OpenAPI spec SHOULD be generated from existing Zod schemas (single source of truth)
- Documentation MUST stay in sync with actual API implementation
- Adding new endpoints SHOULD automatically update docs

**NFR-3: Accessibility**

- Documentation UI MUST be keyboard navigable
- Documentation MUST have proper semantic HTML
- Code examples MUST be screen-reader friendly

---

## Technical Design

### Architecture

```
┌─────────────────────────────────────────┐
│         Hono API Server                 │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Existing API Routes            │  │
│  │   /prices/*, /aggregates/*       │  │
│  │   /internal/ingest, /health      │  │
│  │   /stream (WebSocket)            │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   NEW: Documentation Routes      │  │
│  │                                  │  │
│  │   GET /docs                      │  │
│  │   └─> Scalar UI (HTML)           │  │
│  │                                  │  │
│  │   GET /openapi.json              │  │
│  │   └─> OpenAPI 3.1 spec           │  │
│  │                                  │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │   Zod Schemas (existing)         │  │
│  │   IngestRequestSchema            │  │
│  │   LatestPricesQuerySchema        │  │
│  │   PriceRangeQuerySchema          │  │
│  │   ConsensusQuerySchema           │  │
│  └──────────────────────────────────┘  │
│             │                           │
│             ▼                           │
│  ┌──────────────────────────────────┐  │
│  │   OpenAPI Generator              │  │
│  │   (zod-to-openapi)               │  │
│  └──────────────────────────────────┘  │
└─────────────────────────────────────────┘
```

### Technology Stack

**OpenAPI Generation**:

- `@asteasolutions/zod-to-openapi` - Convert Zod schemas to OpenAPI
- OpenAPI 3.1 specification format

**Documentation UI**:

- `@scalar/hono-api-reference` - Scalar UI integration for Hono
- Modern, interactive API documentation
- Alternative considered: Swagger UI (rejected - heavier, older design)

**Documentation Storage**:

- `docs/api/` - Developer guides (Markdown)
- `apps/api/src/openapi/` - OpenAPI spec generation code
- Generated spec served at runtime

### File Structure

```
apps/api/
├── src/
│   ├── openapi/
│   │   ├── generator.ts          # Generate OpenAPI spec from schemas
│   │   ├── schemas.ts            # Enhanced schemas with OpenAPI metadata
│   │   └── spec.ts               # Full OpenAPI specification
│   ├── routes/
│   │   └── docs.ts               # NEW: /docs and /openapi.json routes
│   └── server.ts                 # Register docs routes

docs/api/
├── README.md                      # API overview and quick start
├── authentication.md              # Authentication guide
├── websocket.md                   # WebSocket protocol documentation
├── examples/
│   ├── curl.md                    # curl examples
│   ├── javascript.md              # JS/TS examples
│   └── python.md                  # Python examples
└── rate-limiting.md               # Rate limiting guide
```

---

## Implementation Plan

### Phase 1: OpenAPI Specification (30 min)

1. Install dependencies:

   ```bash
   bun add @asteasolutions/zod-to-openapi @scalar/hono-api-reference
   ```

2. Create OpenAPI generator:
   - `apps/api/src/openapi/generator.ts` - Convert Zod schemas to OpenAPI
   - Add metadata to existing schemas (descriptions, examples)

3. Create OpenAPI spec:
   - `apps/api/src/openapi/spec.ts` - Full API specification
   - Define servers, authentication, tags
   - Include all endpoints

4. Add `/openapi.json` route:
   - Serve generated OpenAPI spec as JSON

### Phase 2: Scalar UI Integration (15 min)

1. Create docs route:
   - `apps/api/src/routes/docs.ts` - Serve Scalar UI at `/docs`
   - Configure Scalar with custom branding

2. Register in server:
   - Add docs routes to `apps/api/src/server.ts`
   - No authentication required for `/docs`

3. Test documentation:
   - Verify all endpoints appear
   - Test try-it-out functionality
   - Verify authentication works

### Phase 3: Developer Guides (15 min)

1. Authentication guide:
   - `docs/api/authentication.md` - API key types, usage, security

2. WebSocket documentation:
   - `docs/api/websocket.md` - Protocol, message types, examples

3. Integration examples:
   - `docs/api/examples/curl.md` - curl examples for all endpoints
   - `docs/api/examples/javascript.md` - JS/TS client examples
   - `docs/api/examples/python.md` - Python client examples

4. API overview:
   - `docs/api/README.md` - Quick start, links to other guides

---

## API Endpoints

### New Endpoints

#### `GET /docs`

- **Purpose**: Serve interactive API documentation (Scalar UI)
- **Authentication**: None (public)
- **Response**: HTML page with embedded Scalar UI
- **Status Codes**: 200 (success)

#### `GET /openapi.json`

- **Purpose**: Serve OpenAPI specification
- **Authentication**: None (public)
- **Response**: JSON (OpenAPI 3.1 spec)
- **Status Codes**: 200 (success)

---

## Data Models

### OpenAPI Metadata Extensions

Enhance existing Zod schemas with OpenAPI metadata:

```typescript
// Example: Add descriptions and examples to schemas
import { z } from "zod";
import { extendZodWithOpenApi } from "@asteasolutions/zod-to-openapi";

extendZodWithOpenApi(z);

export const LatestPricesQuerySchema = z
  .object({
    symbols: z
      .string()
      .describe(
        'Comma-separated list of trading pair symbols (e.g., "BTC/USD,ETH/USD")',
      )
      .openapi({ example: "BTC/USD,ETH/USD" }),
  })
  .openapi("LatestPricesQuery");
```

---

## Testing Strategy

### Manual Testing

1. **Documentation UI**:
   - [ ] Navigate to `http://localhost:3000/docs`
   - [ ] Verify all endpoints are listed
   - [ ] Verify authentication requirements are shown
   - [ ] Test try-it-out for public endpoint
   - [ ] Test try-it-out with authentication
   - [ ] Verify code examples are generated

2. **OpenAPI Spec**:
   - [ ] Navigate to `http://localhost:3000/openapi.json`
   - [ ] Verify valid JSON
   - [ ] Verify all endpoints present
   - [ ] Verify schemas are complete

3. **Developer Guides**:
   - [ ] Read authentication guide - verify clarity
   - [ ] Follow WebSocket guide - verify examples work
   - [ ] Try curl examples - verify they execute correctly
   - [ ] Try JavaScript examples - verify they work

### Validation

- OpenAPI spec MUST validate against OpenAPI 3.1 schema
- Use online validator: https://editor.swagger.io/
- Use CLI: `npx @redocly/cli lint apps/api/src/openapi/spec.ts`

---

## Security Considerations

**SC-1: API Key Exposure**

- Documentation examples MUST use placeholder keys (e.g., `your_api_key_here`)
- MUST NOT include actual development keys in examples
- SHOULD warn users not to commit keys to version control

**SC-2: Internal Endpoints**

- `/internal/ingest` MUST be clearly marked as internal-only
- SHOULD include warning about authentication requirements

**SC-3: Rate Limiting**

- Documentation MUST mention rate limits
- SHOULD explain consequences of exceeding limits

---

## Success Criteria

- [ ] `/docs` endpoint serves interactive API documentation
- [ ] All REST endpoints documented with request/response examples
- [ ] WebSocket protocol fully documented
- [ ] Authentication guide explains all three API key types
- [ ] Try-it-out feature works for all public endpoints
- [ ] Code examples generate for curl, JavaScript, Python
- [ ] OpenAPI spec validates successfully
- [ ] Documentation loads in < 2 seconds
- [ ] All links in developer guides work
- [ ] External developer can successfully integrate using only the docs (no code reading)

---

## Future Enhancements

**Phase 2 (Post-CHRONO-010)**:

- API changelog (version history)
- Webhook documentation (when webhooks are added)
- GraphQL schema documentation (if GraphQL is added)
- Postman collection generation from OpenAPI spec
- SDK documentation (when SDKs are built)

---

## References

- [OpenAPI 3.1 Specification](https://spec.openapis.org/oas/v3.1.0)
- [Scalar Documentation](https://github.com/scalar/scalar)
- [Zod to OpenAPI](https://github.com/asteasolutions/zod-to-openapi)
- [Hono OpenAPI Integration](https://hono.dev/snippets/openapi)

---

_"The archives are complete. All knowledge shall be preserved for the Khala."_

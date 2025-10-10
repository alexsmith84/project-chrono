/**
 * Hono server setup
 * Configures routes, middleware, and error handling
 */

import { Hono } from 'hono';
import { logger } from './utils/logger';
import { config } from './utils/config';

// Middleware
import {
  requestIdMiddleware,
  timingMiddleware,
  errorHandlerMiddleware,
  corsMiddleware,
} from './middleware/request-context';
import { authMiddleware, requireApiKeyType, ApiKeyType } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';

// Routes
import ingestRoute from './routes/internal/ingest';
import pricesRoute from './routes/public/prices';
import aggregatesRoute from './routes/public/aggregates';
import healthRoute from './routes/health';

/**
 * Create and configure Hono app
 */
export function createApp() {
  const app = new Hono();

  // Hono onError handler (catches all errors)
  app.onError((error, c) => {
    const requestId = c.get('requestId') as string;

    // Import ZodError dynamically to avoid circular deps
    const { ZodError } = require('zod');

    if (error instanceof ZodError) {
      const firstError = error.errors[0];
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Validation failed: ${firstError.path.join('.')}: ${firstError.message}`,
            details: {
              field: firstError.path.join('.'),
              errors: error.errors.map((e: any) => ({
                path: e.path.join('.'),
                message: e.message,
              })),
            },
            request_id: requestId,
          },
          status: 400,
        },
        400
      );
    }

    // Default error response
    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred',
          request_id: requestId,
        },
        status: 500,
      },
      500
    );
  });

  // Global middleware (applied to all routes)
  app.use('*', corsMiddleware);
  app.use('*', requestIdMiddleware);
  app.use('*', timingMiddleware);

  // Welcome route (no auth required)
  app.get('/', (c) => {
    return c.json({
      name: 'Project Chrono API',
      version: '0.1.0',
      description: 'High-performance FTSO price feed API',
      endpoints: {
        health: 'GET /health',
        metrics: 'GET /metrics',
        internal: {
          ingest: 'POST /internal/ingest',
        },
        public: {
          latest: 'GET /prices/latest?symbols=BTC/USD,ETH/USD',
          range: 'GET /prices/range?symbol=BTC/USD&from=...&to=...&interval=1h',
          consensus: 'GET /aggregates/consensus?symbols=BTC/USD,ETH/USD',
        },
      },
      documentation: 'https://github.com/alexsmith84/project-chrono',
    });
  });

  // Health check routes (no auth required)
  app.route('/health', healthRoute);
  app.route('/metrics', healthRoute);

  // Internal routes (require internal API key)
  app.use('/internal/*', authMiddleware);
  app.use('/internal/*', requireApiKeyType(ApiKeyType.Internal, ApiKeyType.Admin));
  app.use('/internal/*', rateLimitMiddleware);
  app.route('/internal/ingest', ingestRoute);

  // Public routes (require public or admin API key)
  app.use('/prices/*', authMiddleware);
  app.use('/prices/*', requireApiKeyType(ApiKeyType.Public, ApiKeyType.Admin));
  app.use('/prices/*', rateLimitMiddleware);
  app.route('/prices', pricesRoute);

  app.use('/aggregates/*', authMiddleware);
  app.use('/aggregates/*', requireApiKeyType(ApiKeyType.Public, ApiKeyType.Admin));
  app.use('/aggregates/*', rateLimitMiddleware);
  app.route('/aggregates', aggregatesRoute);

  // 404 handler
  app.notFound((c) => {
    return c.json(
      {
        error: {
          code: 'NOT_FOUND',
          message: `Route not found: ${c.req.method} ${c.req.path}`,
          request_id: c.get('requestId'),
        },
        status: 404,
      },
      404
    );
  });

  return app;
}

/**
 * Start HTTP server
 */
export function startServer() {
  const app = createApp();

  const server = Bun.serve({
    port: config.PORT,
    fetch: app.fetch,
  });

  logger.info(
    {
      port: config.PORT,
      env: config.NODE_ENV,
      database_pool_size: config.DATABASE_POOL_SIZE,
      redis_cache_ttl: config.REDIS_CACHE_TTL,
    },
    `🚀 Project Chrono API server started on port ${config.PORT}`
  );

  return server;
}

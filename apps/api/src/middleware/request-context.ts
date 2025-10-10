/**
 * Request context middleware
 * Adds request ID, timing, and error handling
 */

import type { Context, Next } from 'hono';
import { logger } from '../utils/logger';
import { ZodError } from 'zod';
import { DatabaseError } from '../db/client';
import { CacheError } from '../cache/redis';

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Request ID middleware
 * Adds unique request ID to context and response headers
 */
export async function requestIdMiddleware(c: Context, next: Next) {
  const requestId = generateRequestId();
  c.set('requestId', requestId);
  c.header('X-Request-ID', requestId);

  await next();
}

/**
 * Request timing middleware
 * Tracks request duration and logs completed requests
 */
export async function timingMiddleware(c: Context, next: Next) {
  const startTime = Date.now();

  await next();

  const latency = Date.now() - startTime;
  const requestId = c.get('requestId') as string;

  logger.info(
    {
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      latency_ms: latency,
      request_id: requestId,
    },
    'Request completed'
  );
}

/**
 * Global error handler middleware
 * Catches and formats errors consistently
 */
export async function errorHandlerMiddleware(c: Context, next: Next) {
  try {
    await next();
  } catch (error) {
    const requestId = c.get('requestId') as string;

    // Debug: log error type
    logger.debug(
      {
        error_name: error instanceof Error ? error.constructor.name : typeof error,
        is_zod: error instanceof ZodError,
        request_id: requestId,
      },
      'Error caught in middleware'
    );

    // Zod validation error
    if (error instanceof ZodError) {
      const firstError = error.errors[0];
      return c.json(
        {
          error: {
            code: 'VALIDATION_ERROR',
            message: `Validation failed: ${firstError.path.join('.')}: ${firstError.message}`,
            details: {
              field: firstError.path.join('.'),
              errors: error.errors.map((e) => ({
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

    // Database error
    if (error instanceof DatabaseError) {
      logger.error(
        {
          err: error,
          query: error.query,
          request_id: requestId,
        },
        'Database error'
      );

      return c.json(
        {
          error: {
            code: 'DATABASE_ERROR',
            message: 'Database operation failed',
            details: {
              message: error.message,
            },
            request_id: requestId,
          },
          status: 503,
        },
        503
      );
    }

    // Cache error
    if (error instanceof CacheError) {
      logger.error(
        {
          err: error,
          operation: error.operation,
          request_id: requestId,
        },
        'Cache error'
      );

      // Cache errors are non-fatal - continue without cache
      return c.json(
        {
          error: {
            code: 'CACHE_ERROR',
            message: 'Cache operation failed (non-fatal)',
            details: {
              message: error.message,
              operation: error.operation,
            },
            request_id: requestId,
          },
          status: 503,
        },
        503
      );
    }

    // Generic error
    logger.error(
      {
        err: error,
        request_id: requestId,
      },
      'Unhandled error'
    );

    return c.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred',
          details: {
            message: error instanceof Error ? error.message : 'Unknown error',
          },
          request_id: requestId,
        },
        status: 500,
      },
      500
    );
  }
}

/**
 * CORS middleware (development mode allows all origins)
 */
export async function corsMiddleware(c: Context, next: Next) {
  // Allow all origins in development
  c.header('Access-Control-Allow-Origin', '*');
  c.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  c.header('Access-Control-Max-Age', '86400');

  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return c.text('', 204);
  }

  await next();
}

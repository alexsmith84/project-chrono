/**
 * Structured logging with Pino
 * Provides request tracing and contextual logging
 */

import pino from 'pino';
import { config } from './config';

/**
 * Create logger instance with pretty printing in development
 */
export const logger = pino({
  level: config.LOG_LEVEL,
  transport:
    config.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
          },
        }
      : undefined,
});

/**
 * Create child logger with request context
 */
export function createRequestLogger(requestId: string) {
  return logger.child({ request_id: requestId });
}

/**
 * Log price ingestion event
 */
export function logPriceIngestion(params: {
  worker_id: string;
  count: number;
  latency_ms: number;
  request_id?: string;
}) {
  logger.info(params, 'Price feeds ingested');
}

/**
 * Log API request
 */
export function logApiRequest(params: {
  method: string;
  path: string;
  status: number;
  latency_ms: number;
  request_id: string;
  cached?: boolean;
}) {
  logger.info(params, 'API request completed');
}

/**
 * Log WebSocket event
 */
export function logWebSocketEvent(params: {
  event: 'connect' | 'disconnect' | 'subscribe' | 'error';
  client_id?: string;
  symbols?: string[];
  error?: string;
}) {
  logger.info(params, `WebSocket ${params.event}`);
}

/**
 * Log database error
 */
export function logDatabaseError(error: Error, query?: string) {
  logger.error(
    {
      err: error,
      query: query?.substring(0, 200), // Truncate long queries
    },
    'Database error'
  );
}

/**
 * Log cache error
 */
export function logCacheError(error: Error, operation: string) {
  logger.error(
    {
      err: error,
      operation,
    },
    'Cache error'
  );
}

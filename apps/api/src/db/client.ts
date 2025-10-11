/**
 * PostgreSQL database client with connection pooling
 * Uses the postgres package for high-performance queries
 */

import postgres from 'postgres';
import { config } from '../utils/config';
import { logger, logDatabaseError } from '../utils/logger';

/**
 * PostgreSQL connection pool
 */
export const sql = postgres(config.DATABASE_URL, {
  max: config.DATABASE_POOL_SIZE,
  idle_timeout: 30,
  connect_timeout: config.DATABASE_TIMEOUT_MS / 1000,
  onnotice: () => {}, // Suppress NOTICE messages
  transform: {
    undefined: null, // Transform undefined to NULL
  },
});

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const result = await sql`SELECT 1 as ok`;
    return result.length > 0 && result[0].ok === 1;
  } catch (error) {
    logDatabaseError(error as Error, 'Health check');
    return false;
  }
}

/**
 * Gracefully close database connections
 */
export async function closeDatabaseConnection(): Promise<void> {
  try {
    await sql.end();
    logger.info('Database connection closed');
  } catch (error) {
    logDatabaseError(error as Error, 'Connection close');
  }
}

/**
 * Database error types
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly query?: string,
    public readonly originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
  }
}

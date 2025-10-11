/**
 * Test setup and teardown helpers
 * Manages test database, Redis, and server lifecycle
 */

import { sql } from "../../src/db/client";
import { redis } from "../../src/cache/redis";
import { createApp } from "../../src/server";
import type { Hono } from "hono";

/**
 * Clean up test data from database
 * Truncates all tables for a fresh test environment
 */
export async function cleanDatabase() {
  await sql`TRUNCATE TABLE price_feeds CASCADE`;
  await sql`TRUNCATE TABLE aggregated_prices CASCADE`;
  await sql`TRUNCATE TABLE ftso_submissions CASCADE`;
  await sql`TRUNCATE TABLE delegators CASCADE`;
  await sql`TRUNCATE TABLE delegations CASCADE`;
  await sql`TRUNCATE TABLE ftso_rewards CASCADE`;
  await sql`TRUNCATE TABLE system_metadata CASCADE`;
}

/**
 * Clean up test data from Redis
 * Flushes all test-related keys
 */
export async function cleanRedis() {
  // Flush all keys (safe in test environment)
  await redis.flushall();
}

/**
 * Create a test application instance
 * Returns configured Hono app for testing
 */
export function createTestApp(): Hono {
  return createApp();
}

/**
 * Setup function to run before all tests
 */
export async function setupTests() {
  await cleanDatabase();
  await cleanRedis();
}

/**
 * Teardown function to run after all tests
 */
export async function teardownTests() {
  await cleanDatabase();
  await cleanRedis();
}

/**
 * Create a test request with authentication
 */
export function createAuthHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  };
}

/**
 * Test API keys (from .env.example)
 */
export const TEST_API_KEYS = {
  internal: "chrono_internal_dev_key_001",
  public: "chrono_public_dev_key_001",
  admin: "chrono_admin_dev_key_001",
};

/**
 * Wait for a condition to be true (polling)
 */
export async function waitFor(
  condition: () => Promise<boolean>,
  timeout = 5000,
  interval = 100,
): Promise<void> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    if (await condition()) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }

  throw new Error(`Timeout waiting for condition after ${timeout}ms`);
}

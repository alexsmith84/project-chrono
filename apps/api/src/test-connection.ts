/**
 * Connection test script
 * Validates PostgreSQL and Redis connections before running the full API
 */

import { logger } from "./utils/logger";
import { config } from "./utils/config";
import { checkDatabaseHealth, sql, closeDatabaseConnection } from "./db/client";
import { checkRedisHealth, redis, closeRedisConnection } from "./cache/redis";

async function testConnections() {
  logger.info("🧪 Testing database and cache connections...");
  logger.info(
    {
      config: {
        NODE_ENV: config.NODE_ENV,
        PORT: config.PORT,
        DATABASE_POOL_SIZE: config.DATABASE_POOL_SIZE,
        REDIS_CACHE_TTL: config.REDIS_CACHE_TTL,
      },
    },
    "Configuration loaded",
  );

  let exitCode = 0;

  try {
    // Test PostgreSQL connection
    logger.info("Testing PostgreSQL connection...");
    const dbHealthy = await checkDatabaseHealth();

    if (dbHealthy) {
      logger.info("✅ PostgreSQL connection: OK");

      // Test a simple query
      const result = await sql`
        SELECT
          current_database() as database,
          version() as version,
          current_timestamp as timestamp
      `;

      logger.info(
        {
          database: result[0].database,
          version: result[0].version.split("\n")[0], // First line only
          timestamp: result[0].timestamp,
        },
        "PostgreSQL info",
      );

      // Check if our tables exist
      const tables = await sql`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name IN ('price_feeds', 'aggregated_prices', 'ftso_submissions', 'delegators', 'delegations', 'ftso_rewards', 'system_metadata')
        ORDER BY table_name
      `;

      if (tables.length > 0) {
        logger.info(
          {
            tables: tables.map((t) => t.table_name),
            count: tables.length,
          },
          "Database tables found",
        );
      } else {
        logger.warn(
          "⚠️  No tables found - run migrations first: ./scripts/database/run-migration.sh",
        );
      }
    } else {
      logger.error("❌ PostgreSQL connection: FAILED");
      exitCode = 1;
    }
  } catch (error) {
    logger.error({ err: error }, "❌ PostgreSQL error");
    exitCode = 1;
  }

  try {
    // Test Redis connection
    logger.info("Testing Redis connection...");
    const redisHealthy = await checkRedisHealth();

    if (redisHealthy) {
      logger.info("✅ Redis connection: OK");

      // Test a simple SET/GET
      const testKey = "test:connection";
      const testValue = JSON.stringify({ timestamp: new Date().toISOString() });

      await redis.setex(testKey, 10, testValue);
      const retrieved = await redis.get(testKey);

      if (retrieved === testValue) {
        logger.info("✅ Redis SET/GET: OK");
      } else {
        logger.error("❌ Redis SET/GET: FAILED");
        exitCode = 1;
      }

      // Clean up test key
      await redis.del(testKey);

      // Get Redis info
      const info = await redis.info("server");
      const versionMatch = info.match(/redis_version:([^\r\n]+)/);
      const version = versionMatch ? versionMatch[1] : "unknown";

      logger.info({ version }, "Redis info");
    } else {
      logger.error("❌ Redis connection: FAILED");
      exitCode = 1;
    }
  } catch (error) {
    logger.error({ err: error }, "❌ Redis error");
    exitCode = 1;
  }

  // Cleanup
  logger.info("Closing connections...");
  await closeDatabaseConnection();
  await closeRedisConnection();

  if (exitCode === 0) {
    logger.info("✅ All connection tests passed!");
  } else {
    logger.error("❌ Some connection tests failed");
  }

  process.exit(exitCode);
}

// Run tests
testConnections().catch((error) => {
  logger.fatal({ err: error }, "Fatal error during connection tests");
  process.exit(1);
});

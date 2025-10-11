/**
 * Application entry point
 * Starts the HTTP server and handles graceful shutdown
 */

import { startServer } from "./server";
import { closeDatabaseConnection } from "./db/client";
import { closeRedisConnection } from "./cache/redis";
import { logger } from "./utils/logger";

// Start server
const server = startServer();

// Graceful shutdown handler
async function shutdown(signal: string) {
  logger.info(
    { signal },
    "Received shutdown signal, starting graceful shutdown...",
  );

  try {
    // Stop accepting new connections
    server.stop();
    logger.info("HTTP server stopped");

    // Close database connections
    await closeDatabaseConnection();

    // Close Redis connections
    await closeRedisConnection();

    logger.info("Graceful shutdown complete");
    process.exit(0);
  } catch (error) {
    logger.error({ err: error }, "Error during graceful shutdown");
    process.exit(1);
  }
}

// Register shutdown handlers
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

// Handle unhandled rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error({ reason, promise }, "Unhandled promise rejection");
});

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  shutdown("uncaughtException");
});

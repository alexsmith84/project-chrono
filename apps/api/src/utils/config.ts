/**
 * Environment configuration loader
 * Validates and provides type-safe access to environment variables
 */

import { z } from "zod";

const configSchema = z.object({
  // Server
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3000),

  // Database
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_SIZE: z.coerce.number().default(20),
  DATABASE_TIMEOUT_MS: z.coerce.number().default(5000),

  // Redis
  REDIS_URL: z.string().url(),
  REDIS_CACHE_TTL: z.coerce.number().default(60),

  // Authentication
  INTERNAL_API_KEYS: z.string().transform((val) => val.split(",")),
  PUBLIC_API_KEYS: z.string().transform((val) => val.split(",")),
  ADMIN_API_KEYS: z.string().transform((val) => val.split(",")),

  // Rate Limits
  RATE_LIMIT_INTERNAL: z.coerce.number().default(5000),
  RATE_LIMIT_PUBLIC_FREE: z.coerce.number().default(1000),
  RATE_LIMIT_PUBLIC_PAID: z.coerce.number().default(10000),
  RATE_LIMIT_ADMIN: z.coerce.number().default(0), // 0 = unlimited

  // Observability
  LOG_LEVEL: z
    .enum(["trace", "debug", "info", "warn", "error", "fatal"])
    .default("info"),
  METRICS_ENABLED: z.coerce.boolean().default(true),

  // WebSocket
  WS_HEARTBEAT_INTERVAL: z.coerce.number().default(30000),
  WS_MAX_CONNECTIONS: z.coerce.number().default(10000),
});

export type Config = z.infer<typeof configSchema>;

/**
 * Load and validate configuration from environment variables
 */
export function loadConfig(): Config {
  try {
    return configSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error("❌ Invalid configuration:");
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join(".")}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
}

/**
 * Global configuration instance
 */
export const config = loadConfig();

/**
 * Validation schemas for price ingestion endpoint
 * POST /internal/ingest
 */

import { z } from 'zod';

/**
 * Price feed schema (single feed from exchange)
 */
export const priceFeedSchema = z.object({
  symbol: z
    .string()
    .regex(/^[A-Z]+\/[A-Z]+$/, 'Symbol must be in format BASE/QUOTE (e.g., BTC/USD)')
    .min(5)
    .max(20),
  price: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Price must be a decimal number as string')
    .refine((val) => parseFloat(val) > 0, 'Price must be greater than 0'),
  volume: z
    .string()
    .regex(/^\d+(\.\d+)?$/, 'Volume must be a decimal number as string')
    .refine((val) => parseFloat(val) >= 0, 'Volume must be non-negative')
    .nullable()
    .optional(),
  source: z
    .string()
    .min(1)
    .max(50)
    .regex(/^[a-z0-9_-]+$/, 'Source must be lowercase alphanumeric with hyphens/underscores'),
  timestamp: z.string().datetime({ message: 'Timestamp must be ISO 8601 format' }),
  metadata: z.record(z.unknown()).optional(),
});

/**
 * Batch ingestion request schema
 */
export const ingestRequestSchema = z.object({
  worker_id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Worker ID must be lowercase alphanumeric with hyphens/underscores'),
  timestamp: z.string().datetime({ message: 'Timestamp must be ISO 8601 format' }),
  feeds: z
    .array(priceFeedSchema)
    .min(1, 'At least one price feed required')
    .max(100, 'Maximum 100 price feeds per batch'),
});

/**
 * Ingestion response schema
 */
export const ingestResponseSchema = z.object({
  status: z.enum(['success', 'partial', 'error']),
  ingested: z.number().int().min(0),
  failed: z.number().int().min(0),
  latency_ms: z.number().min(0),
  message: z.string(),
  errors: z
    .array(
      z.object({
        index: z.number().int(),
        symbol: z.string(),
        error: z.string(),
      })
    )
    .optional(),
});

/**
 * Type exports
 */
export type PriceFeed = z.infer<typeof priceFeedSchema>;
export type IngestRequest = z.infer<typeof ingestRequestSchema>;
export type IngestResponse = z.infer<typeof ingestResponseSchema>;

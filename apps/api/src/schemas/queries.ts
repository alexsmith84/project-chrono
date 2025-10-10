/**
 * Validation schemas for query parameters
 * Used by GET endpoints
 */

import { z } from 'zod';

/**
 * Latest prices query schema
 * GET /prices/latest?symbols=BTC/USD,ETH/USD
 */
export const latestPricesQuerySchema = z.object({
  symbols: z
    .string()
    .transform((val) => val.split(','))
    .pipe(
      z
        .array(z.string().regex(/^[A-Z]+\/[A-Z]+$/))
        .min(1, 'At least one symbol required')
        .max(50, 'Maximum 50 symbols per request')
    ),
});

/**
 * Price range query schema
 * GET /prices/range?symbol=BTC/USD&from=...&to=...&interval=1h&source=binance&limit=1000
 */
export const priceRangeQuerySchema = z.object({
  symbol: z.string().regex(/^[A-Z]+\/[A-Z]+$/, 'Invalid symbol format'),
  from: z.string().datetime({ message: 'from must be ISO 8601 timestamp' }),
  to: z.string().datetime({ message: 'to must be ISO 8601 timestamp' }),
  interval: z
    .enum(['1m', '5m', '15m', '1h', '4h', '1d'], {
      errorMap: () => ({ message: 'interval must be one of: 1m, 5m, 15m, 1h, 4h, 1d' }),
    })
    .optional(),
  source: z.string().regex(/^[a-z0-9_-]+$/).optional(),
  limit: z.coerce.number().int().min(1).max(10000).default(1000),
});

/**
 * Consensus prices query schema
 * GET /aggregates/consensus?symbols=BTC/USD,ETH/USD&timestamp=...
 */
export const consensusPricesQuerySchema = z.object({
  symbols: z
    .string()
    .transform((val) => val.split(','))
    .pipe(
      z
        .array(z.string().regex(/^[A-Z]+\/[A-Z]+$/))
        .min(1, 'At least one symbol required')
        .max(50, 'Maximum 50 symbols per request')
    ),
  timestamp: z
    .string()
    .datetime({ message: 'timestamp must be ISO 8601 format' })
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
});

/**
 * Type exports
 */
export type LatestPricesQuery = z.infer<typeof latestPricesQuerySchema>;
export type PriceRangeQuery = z.infer<typeof priceRangeQuerySchema>;
export type ConsensusPricesQuery = z.infer<typeof consensusPricesQuerySchema>;

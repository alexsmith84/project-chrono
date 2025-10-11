/**
 * Database types matching the PostgreSQL schema
 * Aligned with CHRONO-004 specification
 */

/**
 * Price feed from a single exchange source
 */
export interface PriceFeed {
  id: string; // UUID
  symbol: string; // e.g., "BTC/USD"
  price: string; // NUMERIC as string for precision
  volume: string | null; // NUMERIC as string
  timestamp: Date;
  source: string; // Exchange name
  ingested_at: Date;
  worker_id: string | null;
  metadata: Record<string, unknown> | null; // JSONB
}

/**
 * Aggregated price from multiple sources (FTSO consensus)
 */
export interface AggregatedPrice {
  id: string; // UUID
  symbol: string;
  price: string; // NUMERIC - median/consensus price
  median: string; // NUMERIC
  mean: string; // NUMERIC
  std_dev: string | null; // NUMERIC
  num_sources: number;
  timestamp: Date;
  sources: string[]; // Array of exchange names
  calculated_at: Date;
}

/**
 * FTSO price submission record
 */
export interface FTSOSubmission {
  id: string; // UUID
  reveal_round: number;
  symbol: string;
  submitted_price: string; // NUMERIC
  price_hash: string;
  timestamp: Date;
  transaction_hash: string | null;
  revealed: boolean;
  reward_earned: string | null; // NUMERIC
}

/**
 * Delegator account
 */
export interface Delegator {
  id: string; // UUID
  wallet_address: string; // Ethereum address
  flare_balance: string; // NUMERIC(30,18)
  wrapped_flare_balance: string; // NUMERIC(30,18)
  first_seen: Date;
  last_updated: Date;
}

/**
 * Delegation change event
 */
export interface Delegation {
  id: string; // UUID
  delegator_id: string; // UUID foreign key
  provider_address: string; // FTSO provider address
  amount: string; // NUMERIC(30,18)
  percentage: string; // NUMERIC(5,2)
  timestamp: Date;
  block_number: number;
  transaction_hash: string;
}

/**
 * FTSO reward record
 */
export interface FTSOReward {
  id: string; // UUID
  epoch: number;
  reward_amount: string; // NUMERIC(30,18)
  timestamp: Date;
  transaction_hash: string;
  claimed: boolean;
  claimed_at: Date | null;
}

/**
 * System metadata (key-value configuration)
 */
export interface SystemMetadata {
  key: string; // Primary key
  value: unknown; // JSONB
  description: string | null;
  updated_at: Date;
}

/**
 * Insert types (omit auto-generated fields)
 */
export type PriceFeedInsert = Omit<PriceFeed, "id" | "ingested_at">;
export type AggregatedPriceInsert = Omit<
  AggregatedPrice,
  "id" | "calculated_at"
>;
export type FTSOSubmissionInsert = Omit<FTSOSubmission, "id">;
export type DelegatorInsert = Omit<
  Delegator,
  "id" | "first_seen" | "last_updated"
>;
export type DelegationInsert = Omit<Delegation, "id">;
export type FTSORewardInsert = Omit<FTSOReward, "id">;
export type SystemMetadataInsert = Omit<SystemMetadata, "updated_at">;

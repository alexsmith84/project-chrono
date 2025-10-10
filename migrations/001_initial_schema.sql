-- =====================================================
-- CHRONO-004: Core Data Models & Database Schema
-- Migration: 001 - Initial Schema
-- Created: 2025-10-09
-- Description: Create all core tables with TimescaleDB optimization
-- =====================================================

-- Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;

-- =====================================================
-- TABLE: price_feeds
-- Purpose: Store raw price data from exchanges
-- Type: Hypertable (time-series optimized)
-- =====================================================

CREATE TABLE price_feeds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,              -- e.g., "BTC/USD", "ETH/USD"
    price NUMERIC(20, 8) NOT NULL,            -- 8 decimal precision
    volume NUMERIC(20, 8),                    -- Trading volume (optional)
    timestamp TIMESTAMPTZ NOT NULL,           -- Exchange timestamp
    source VARCHAR(50) NOT NULL,              -- e.g., "coinbase", "binance"
    ingested_at TIMESTAMPTZ DEFAULT NOW(),    -- When we received it
    worker_id VARCHAR(100),                   -- Which worker collected it
    metadata JSONB,                           -- Additional exchange-specific data
    CONSTRAINT price_positive CHECK (price > 0),
    CONSTRAINT volume_non_negative CHECK (volume IS NULL OR volume >= 0)
);

-- Convert to hypertable (1-hour chunks)
SELECT create_hypertable('price_feeds', 'timestamp', chunk_time_interval => INTERVAL '1 hour');

-- Create indexes for common query patterns
CREATE INDEX idx_price_feeds_symbol_time ON price_feeds (symbol, timestamp DESC);
CREATE INDEX idx_price_feeds_source ON price_feeds (source);
CREATE INDEX idx_price_feeds_ingested ON price_feeds (ingested_at DESC);

-- Enable compression after 7 days (10-20x storage savings)
ALTER TABLE price_feeds SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol, source',
    timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('price_feeds', INTERVAL '7 days');

-- Data retention: drop chunks older than 2 years
SELECT add_retention_policy('price_feeds', INTERVAL '2 years');

-- =====================================================
-- TABLE: aggregated_prices
-- Purpose: Store consensus prices calculated by Rust engine
-- Type: Hypertable (time-series optimized)
-- =====================================================

CREATE TABLE aggregated_prices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    symbol VARCHAR(20) NOT NULL,
    consensus_price NUMERIC(20, 8) NOT NULL,
    vwap NUMERIC(20, 8),                      -- Volume-Weighted Average Price
    twap NUMERIC(20, 8),                      -- Time-Weighted Average Price
    weighted_median NUMERIC(20, 8),
    confidence NUMERIC(5, 4) CHECK (confidence BETWEEN 0 AND 1), -- 0.0 to 1.0
    sources_used INTEGER NOT NULL,            -- How many exchanges contributed
    algorithm VARCHAR(50) NOT NULL,           -- e.g., "weighted_consensus_v1"
    timestamp TIMESTAMPTZ NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB,                           -- Algorithm details, outliers removed, etc.
    CONSTRAINT consensus_price_positive CHECK (consensus_price > 0)
);

-- Convert to hypertable (1-hour chunks)
SELECT create_hypertable('aggregated_prices', 'timestamp', chunk_time_interval => INTERVAL '1 hour');

-- Create indexes
CREATE INDEX idx_aggregated_symbol_time ON aggregated_prices (symbol, timestamp DESC);
CREATE INDEX idx_aggregated_confidence ON aggregated_prices (confidence);

-- Enable compression after 7 days
ALTER TABLE aggregated_prices SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol',
    timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('aggregated_prices', INTERVAL '7 days');

-- Data retention: 2 years
SELECT add_retention_policy('aggregated_prices', INTERVAL '2 years');

-- =====================================================
-- TABLE: ftso_submissions
-- Purpose: Track all FTSO price submissions to blockchain
-- Type: Regular table (append-only audit log)
-- =====================================================

CREATE TABLE ftso_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epoch_id BIGINT NOT NULL,
    symbol VARCHAR(20) NOT NULL,
    submitted_price NUMERIC(20, 8) NOT NULL,
    aggregated_price_id UUID REFERENCES aggregated_prices(id),
    tx_hash VARCHAR(66),                      -- Ethereum tx hash (0x + 64 chars)
    status VARCHAR(20) NOT NULL,              -- pending, confirmed, failed, reverted
    gas_used INTEGER,
    gas_price NUMERIC(20, 0),                 -- in Wei
    block_number BIGINT,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    error_message TEXT,
    CONSTRAINT valid_status CHECK (status IN ('pending', 'confirmed', 'failed', 'reverted'))
);

-- Create indexes
CREATE INDEX idx_ftso_submissions_epoch ON ftso_submissions (epoch_id DESC);
CREATE INDEX idx_ftso_submissions_symbol ON ftso_submissions (symbol);
CREATE INDEX idx_ftso_submissions_status ON ftso_submissions (status);
CREATE INDEX idx_ftso_submissions_submitted_at ON ftso_submissions (submitted_at DESC);
CREATE UNIQUE INDEX idx_ftso_submissions_tx_hash ON ftso_submissions (tx_hash) WHERE tx_hash IS NOT NULL;

-- =====================================================
-- TABLE: delegators
-- Purpose: Track individual delegators
-- Type: Regular table (master data)
-- =====================================================

CREATE TABLE delegators (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address VARCHAR(42) NOT NULL UNIQUE, -- Ethereum address (0x + 40 chars)
    first_delegated_at TIMESTAMPTZ NOT NULL,
    last_updated_at TIMESTAMPTZ DEFAULT NOW(),
    current_amount NUMERIC(30, 18) NOT NULL DEFAULT 0, -- FLR with 18 decimals
    peak_amount NUMERIC(30, 18) NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, inactive, churned
    tier VARCHAR(20),                          -- whale, gold, silver, bronze, starter
    acquisition_source VARCHAR(100),          -- twitter, forum, reddit, referral, direct
    notes TEXT,
    CONSTRAINT valid_status CHECK (status IN ('active', 'inactive', 'churned')),
    CONSTRAINT valid_tier CHECK (tier IN ('whale', 'gold', 'silver', 'bronze', 'starter') OR tier IS NULL),
    CONSTRAINT amount_non_negative CHECK (current_amount >= 0)
);

-- Create indexes
CREATE INDEX idx_delegators_wallet ON delegators (wallet_address);
CREATE INDEX idx_delegators_status ON delegators (status);
CREATE INDEX idx_delegators_tier ON delegators (tier);
CREATE INDEX idx_delegators_current_amount ON delegators (current_amount DESC);

-- =====================================================
-- TABLE: delegations
-- Purpose: Historical delegation changes (time-series)
-- Type: Hypertable (time-series optimized)
-- =====================================================

CREATE TABLE delegations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    delegator_id UUID NOT NULL REFERENCES delegators(id),
    wallet_address VARCHAR(42) NOT NULL,
    amount NUMERIC(30, 18) NOT NULL,          -- FLR amount
    change_amount NUMERIC(30, 18) NOT NULL,   -- Delta from previous
    tx_hash VARCHAR(66) NOT NULL,
    block_number BIGINT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    event_type VARCHAR(20) NOT NULL,          -- delegate, undelegate, update
    CONSTRAINT valid_event_type CHECK (event_type IN ('delegate', 'undelegate', 'update'))
);

-- Convert to hypertable (1-day chunks for delegation events)
SELECT create_hypertable('delegations', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Create indexes
CREATE INDEX idx_delegations_delegator ON delegations (delegator_id, timestamp DESC);
CREATE INDEX idx_delegations_wallet ON delegations (wallet_address, timestamp DESC);
CREATE INDEX idx_delegations_tx_hash ON delegations (tx_hash);

-- Enable compression after 30 days
ALTER TABLE delegations SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'delegator_id',
    timescaledb.compress_orderby = 'timestamp DESC'
);

SELECT add_compression_policy('delegations', INTERVAL '30 days');

-- Data retention: 2 years
SELECT add_retention_policy('delegations', INTERVAL '2 years');

-- =====================================================
-- TABLE: ftso_rewards
-- Purpose: Track FTSO rewards earned
-- Type: Regular table (financial records)
-- =====================================================

CREATE TABLE ftso_rewards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    epoch_id BIGINT NOT NULL,
    amount_flr NUMERIC(30, 18) NOT NULL,      -- FLR earned
    flr_price_usd NUMERIC(20, 8),             -- FLR price at time of reward
    amount_usd NUMERIC(20, 2),                -- USD value (calculated)
    claimed_at TIMESTAMPTZ DEFAULT NOW(),
    tx_hash VARCHAR(66),
    block_number BIGINT,
    delegators_count INTEGER,                 -- How many delegators contributed
    accuracy_score NUMERIC(5, 4),             -- Our accuracy for this epoch
    CONSTRAINT amount_positive CHECK (amount_flr > 0)
);

-- Create indexes
CREATE INDEX idx_ftso_rewards_epoch ON ftso_rewards (epoch_id DESC);
CREATE INDEX idx_ftso_rewards_claimed_at ON ftso_rewards (claimed_at DESC);
CREATE INDEX idx_ftso_rewards_tx_hash ON ftso_rewards (tx_hash);

-- =====================================================
-- TABLE: system_metadata
-- Purpose: Store system configuration and state
-- Type: Key-value store
-- =====================================================

CREATE TABLE system_metadata (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- TABLE: schema_migrations
-- Purpose: Track applied migrations
-- Type: Migration tracking
-- =====================================================

CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record this migration
INSERT INTO schema_migrations (version, name) VALUES (1, '001_initial_schema');

-- =====================================================
-- INITIAL DATA: System metadata
-- =====================================================

-- Store initial configuration
INSERT INTO system_metadata (key, value) VALUES
    ('schema_version', '{"version": 1, "description": "Initial schema with core tables"}'::jsonb),
    ('ftso_config', '{"epoch_duration_seconds": 90, "reveal_duration_seconds": 30}'::jsonb),
    ('compression_config', '{"price_feeds_days": 7, "delegations_days": 30}'::jsonb),
    ('retention_config', '{"all_tables_years": 2}'::jsonb);

-- =====================================================
-- COMMENTS: Document schema for developers
-- =====================================================

COMMENT ON TABLE price_feeds IS 'Raw price data from exchange APIs, collected by Cloudflare Workers';
COMMENT ON TABLE aggregated_prices IS 'Consensus prices calculated by Rust engine using VWAP/TWAP/median';
COMMENT ON TABLE ftso_submissions IS 'Audit log of all FTSO price submissions to Flare Network';
COMMENT ON TABLE delegators IS 'Master table of all delegators with tier classification';
COMMENT ON TABLE delegations IS 'Historical record of all delegation changes';
COMMENT ON TABLE ftso_rewards IS 'Financial record of FLR rewards earned from FTSO';
COMMENT ON TABLE system_metadata IS 'Key-value store for system configuration';

COMMENT ON COLUMN price_feeds.timestamp IS 'Exchange-reported timestamp (may differ from ingested_at)';
COMMENT ON COLUMN price_feeds.metadata IS 'Exchange-specific data like bid/ask, order book depth, etc.';
COMMENT ON COLUMN aggregated_prices.confidence IS 'Algorithm confidence score 0.0-1.0, higher is better';
COMMENT ON COLUMN delegators.tier IS 'Whale: 10M+, Gold: 1M-10M, Silver: 100K-1M, Bronze: 10K-100K, Starter: <10K FLR';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Verify all tables created
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Verify hypertables
SELECT hypertable_name, num_dimensions
FROM timescaledb_information.hypertables
ORDER BY hypertable_name;

-- Verify compression policies
SELECT hypertable_name, config
FROM timescaledb_information.jobs
WHERE proc_name = 'policy_compression'
ORDER BY hypertable_name;

-- Verify retention policies
SELECT hypertable_name, config
FROM timescaledb_information.jobs
WHERE proc_name = 'policy_retention'
ORDER BY hypertable_name;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

-- Print success message
DO $$
BEGIN
    RAISE NOTICE '✅ Migration 001_initial_schema completed successfully';
    RAISE NOTICE '📊 Created 7 core tables: price_feeds, aggregated_prices, ftso_submissions, delegators, delegations, ftso_rewards, system_metadata';
    RAISE NOTICE '⚡ Configured 3 TimescaleDB hypertables with compression and retention';
    RAISE NOTICE '🔍 Created 15 indexes for optimized query performance';
    RAISE NOTICE '';
    RAISE NOTICE 'Next steps:';
    RAISE NOTICE '  1. Run verification queries above to confirm setup';
    RAISE NOTICE '  2. Test insert/query performance with sample data';
    RAISE NOTICE '  3. Create TypeScript and Rust type definitions';
    RAISE NOTICE '';
    RAISE NOTICE 'En Taro Tassadar! The data foundation is laid.';
END $$;

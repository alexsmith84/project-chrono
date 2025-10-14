# CHRONO-011: DEX Integration Considerations

## Executive Summary

Coinbase's DEX integration (launched 2025) provides access to millions of onchain assets on Base, aggregating liquidity from Aerodrome, Uniswap, 1inch, and 0x. This document analyzes the implications for Project Chrono's data collection architecture and provides recommendations for supporting expanded trading pairs.

## Current State (October 2025)

### Coinbase Offerings

1. **Coinbase Exchange** (Centralized)
   - Traditional CEX with ~200+ trading pairs
   - WebSocket API: `wss://ws-feed.exchange.coinbase.com`
   - Currently implemented in our system

2. **Coinbase Advanced Trade**
   - 550+ markets including 237 new USDC pairs
   - More comprehensive than basic Exchange

3. **Coinbase DEX Trading** (New)
   - Access to millions of Base network tokens
   - Aggregates multiple DEX protocols
   - Integrated into Coinbase app
   - **API Status**: Unclear if WebSocket API available

### Our Current Implementation

**Hardcoded Symbols**: `['BTC/USD', 'ETH/USD']`

```typescript
// workers/chrono-collectors/src/index.ts:178
const symbols = ['BTC/USD', 'ETH/USD']; // Default symbols, can be made configurable
```

**Location**: Durable Object initialization

## Key Questions

### 1. Is DEX Data Available via API?

**Current Understanding**:
- DEX trading is integrated into Coinbase app
- No clear documentation of dedicated DEX WebSocket API
- May require on-chain data collection instead

**Action Required**:
- Investigate if Coinbase exposes DEX data via API
- Check if Advanced Trade API includes DEX pairs
- Consider alternative: Direct Base chain monitoring

### 2. Should We Collect DEX Price Data?

**Considerations**:

**For DEX Support**:
- ✅ Comprehensive price coverage
- ✅ Access to long-tail tokens
- ✅ Decentralized price discovery
- ✅ Future-proof architecture

**Against DEX Support**:
- ❌ Data quality concerns (low liquidity pairs)
- ❌ High volume of pairs (millions)
- ❌ May require different architecture (on-chain monitoring)
- ❌ Higher complexity and cost

### 3. What's Our Use Case?

**Current Focus**: FTSO Oracle Data
- Primarily interested in major trading pairs
- BTC, ETH, and top 20-50 cryptocurrencies
- Need reliable, high-liquidity price data
- Quality > Quantity

**Recommendation**: Start with major pairs, expand gradually

## Architecture Options

### Option 1: Configurable Symbol Lists (Recommended for Phase 3)

**Make symbols configurable via worker configuration**:

```typescript
// Instead of hardcoded:
const symbols = ['BTC/USD', 'ETH/USD'];

// Use configuration:
interface WorkerConfig {
  // ... existing fields
  symbols: string[];  // ← Add this
}

// Usage:
const config: WorkerConfig = {
  workerId: 'worker-coinbase-major',
  symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD', 'ADA/USD'],
  // ...
};
```

**Benefits**:
- ✅ No code changes to add pairs
- ✅ Different workers can track different symbols
- ✅ Easy to scale up/down
- ✅ Ready for future expansion

**Implementation**: Easy, Phase 3 enhancement

### Option 2: Dynamic Symbol Discovery

**Auto-discover available pairs from exchange**:

```typescript
// Query exchange for available pairs
const availablePairs = await fetchAvailableProducts();

// Filter to major pairs (volume, liquidity thresholds)
const majorPairs = availablePairs.filter(p =>
  p.volume24h > VOLUME_THRESHOLD &&
  p.quoteAsset === 'USD'
);

// Subscribe to filtered list
this.adapter = new CoinbaseAdapter(majorPairs, workerId);
```

**Benefits**:
- ✅ Always up-to-date with exchange offerings
- ✅ Automatic when exchange adds pairs
- ✅ Can apply filtering logic

**Drawbacks**:
- ❌ More complex
- ❌ Requires additional API calls
- ❌ Filtering logic needed

**Implementation**: Medium complexity, Phase 4+

### Option 3: Separate DEX Workers

**Dedicated workers for on-chain DEX data**:

```
worker-coinbase-cex     → Centralized exchange (current)
worker-coinbase-dex     → DEX aggregated data (future)
worker-base-aerodrome   → Direct Aerodrome monitoring (future)
worker-base-uniswap     → Direct Uniswap monitoring (future)
```

**Benefits**:
- ✅ Clear separation of concerns
- ✅ Different architectures for CEX vs DEX
- ✅ Can scale independently

**Drawbacks**:
- ❌ More infrastructure
- ❌ Likely requires on-chain monitoring
- ❌ Different data collection approach

**Implementation**: High complexity, future consideration

## Recommendations

### Immediate (Phase 3) ✅

**Make symbols configurable**:

```typescript
// 1. Update WorkerConfig type
export interface WorkerConfig {
  workerId: string;
  apiBaseUrl: string;
  apiKey: string;
  batchSize: number;
  batchIntervalMs: number;
  maxReconnectAttempts: number;
  symbols: string[];  // ← Add this
}

// 2. Update Durable Object initialization
private async initialize(): Promise<void> {
  // ... existing code ...

  // Use symbols from config
  const symbols = this.config.symbols || ['BTC/USD', 'ETH/USD'];

  this.adapter = this.createExchangeAdapter(
    exchange,
    symbols,  // ← Use config symbols
    this.config.workerId
  );
}

// 3. Update start request to accept symbols
curl -X POST http://localhost:8787/start \
  -H "Content-Type: application/json" \
  -d '{
    "workerId": "worker-coinbase-major",
    "symbols": ["BTC/USD", "ETH/USD", "SOL/USD", "ADA/USD", "DOGE/USD"],
    ...
  }'
```

**Effort**: 1 supply unit
**Value**: High - enables easy expansion

### Short-term (After Phase 3) 🎯

**Focus on major centralized exchange pairs**:

1. **Coinbase Advanced Trade** (if WebSocket available)
   - 550+ markets
   - Better coverage than basic Exchange

2. **Top 20-50 Cryptocurrencies**
   - BTC, ETH, SOL, ADA, DOGE, DOT, AVAX, MATIC, etc.
   - Multiple quote currencies (USD, USDT, EUR)

3. **Multi-worker deployment**:
   ```bash
   # Major pairs worker
   worker-coinbase-major: BTC/USD, ETH/USD, SOL/USD (high priority)

   # Altcoins worker
   worker-coinbase-alts: ADA/USD, DOGE/USD, DOT/USD (medium priority)

   # Stablecoins worker
   worker-coinbase-stable: USDT/USD, USDC/USD, DAI/USD (monitoring)
   ```

**Effort**: 2 supply units
**Value**: High - comprehensive major pair coverage

### Long-term (Future Epic) 🚀

**Investigate DEX data collection**:

1. **Research Phase**
   - Determine if Coinbase exposes DEX data via API
   - Evaluate on-chain monitoring solutions (The Graph, Dune, custom indexer)
   - Assess data quality and reliability

2. **Pilot Implementation**
   - Start with top Base tokens by liquidity
   - Focus on pools with >$1M TVL
   - Compare CEX vs DEX prices for arbitrage detection

3. **Architecture Decision**
   - If API available: Extend current worker architecture
   - If on-chain only: New worker type with web3 integration

**Effort**: 5-8 supply units
**Value**: Medium - nice to have, not critical for FTSO

## Decision Matrix

| Pair Type | Priority | When | Why |
|-----------|----------|------|-----|
| **BTC/USD, ETH/USD** | Critical | ✅ Now | FTSO core pairs |
| **Top 10 cryptos** | High | Phase 3+ | Major market coverage |
| **Top 50 cryptos** | Medium | After validation | Comprehensive coverage |
| **Stablecoins** | Low | As needed | Monitoring/arbitrage |
| **DEX long-tail** | Very Low | Future epic | Nice to have, not critical |

## Implementation Plan for Phase 3

### Step 1: Make Symbols Configurable

```typescript
// src/types/index.ts - Update WorkerConfig
export interface WorkerConfig {
  // ... existing fields ...
  symbols: string[];  // Add this line
}
```

### Step 2: Update Durable Object

```typescript
// src/index.ts - Update initialize()
private async initialize(): Promise<void> {
  if (!this.config || !this.logger) {
    throw new Error('Config and logger must be initialized first');
  }

  // Create batcher
  this.batcher = new PriceBatcher(/*...*/);

  // Extract exchange from worker ID
  const exchange = this.extractExchangeFromWorkerId(this.config.workerId);

  // Use symbols from config, fallback to defaults
  const symbols = this.config.symbols || ['BTC/USD', 'ETH/USD'];

  this.logger.info('Initializing with symbols', { symbols });

  // Create adapter with configured symbols
  this.adapter = this.createExchangeAdapter(exchange, symbols, this.config.workerId);

  // ... rest of initialization
}
```

### Step 3: Update Documentation

Update README.md with examples:

```bash
# Collect major pairs
curl -X POST https://worker.example.com/start -d '{
  "workerId": "worker-coinbase-major",
  "symbols": ["BTC/USD", "ETH/USD", "SOL/USD"],
  ...
}'

# Collect altcoins
curl -X POST https://worker.example.com/start -d '{
  "workerId": "worker-binance-alts",
  "symbols": ["ADA/USD", "DOT/USD", "AVAX/USD"],
  ...
}'
```

### Step 4: Update Deployment Scripts

```bash
# scripts/deploy-collectors.sh

# Deploy major pairs worker
deploy_worker "coinbase-major" '["BTC/USD","ETH/USD","SOL/USD"]'

# Deploy altcoins worker
deploy_worker "coinbase-alts" '["ADA/USD","DOGE/USD","DOT/USD"]'

# Deploy stablecoins worker
deploy_worker "coinbase-stable" '["USDT/USD","USDC/USD","DAI/USD"]'
```

## Monitoring Considerations

With more pairs:

1. **Database Growth**
   - More symbols = more data points
   - Monitor TimescaleDB compression
   - Consider retention policies

2. **API Rate Limits**
   - More workers = more API calls to ingest endpoint
   - May need rate limiting on API side
   - Consider batching optimizations

3. **Cost Analysis**
   - Cloudflare Workers: Free tier allows 100k requests/day
   - Multiple workers: Monitor total request count
   - May need paid plan for production scale

## Conclusion

### For Phase 3: ✅ Implement Configurable Symbols

**Why**:
- Low effort (1 supply)
- High value (enables expansion)
- No breaking changes
- Future-proof

**Implementation**:
- Add `symbols: string[]` to WorkerConfig
- Update initialize() to use config.symbols
- Update documentation with examples
- Test with multiple symbol sets

### For DEX: ⏸️ Wait and See

**Why**:
- Unclear if API exists
- May require different architecture
- Not critical for current use case (FTSO)
- Can revisit in future epic

**Next Steps**:
1. Monitor Coinbase DEX API developments
2. Focus on expanding CEX coverage first
3. Prove value with major pairs
4. Revisit DEX when architecture mature

---

*"Focus on the mission. Expand methodically. The Khala will guide expansion."*

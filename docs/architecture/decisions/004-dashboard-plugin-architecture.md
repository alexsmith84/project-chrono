# ADR 004: Dashboard Plugin Architecture for Multi-Category Data Sources

**Status**: Accepted
**Date**: 2025-10-14
**Context**: CHRONO-016 - Build FTSO Monitoring Dashboard

## Context and Problem Statement

Project Chrono currently integrates 3 exchanges (Coinbase, Binance, Kraken) but must scale to support:
- 10+ exchanges (Bybit, OKX, Gemini, etc.)
- Sentiment data sources (Twitter/X, TikTok, Reddit)
- Market indices (Fear & Greed, VIX)
- Commodities (Gold, Oil)
- Custom FTSO data providers

**Critical Requirement**: Data collection must continue for all sources, but operators need the ability to include/exclude specific sources from price calculations on-the-fly, with clear visual distinction.

## Decision Drivers

- **Scalability**: Support dozens of heterogeneous data sources
- **Flexibility**: Enable/disable sources without stopping data collection
- **Isolation**: Provider failures don't cascade
- **Type Safety**: TypeScript enforcement across all provider types
- **Maintainability**: Adding new sources requires <50 lines of code

## Decision Outcome

**Chosen Solution**: Multi-category plugin architecture with provider registry pattern

### Core Architecture

#### 1. Provider Interface with Categories

```typescript
export type ProviderCategory =
  | 'exchange'    | 'sentiment'  | 'index'
  | 'commodity'   | 'defi'       | 'custom'

export interface DataProvider {
  // Identity
  id: string
  name: string
  category: ProviderCategory
  dataType: 'price' | 'sentiment' | 'index' | 'volume' | 'custom'

  // Metadata
  color: string
  icon?: string

  // State management
  isActive: boolean              // Include in calculations?
  isCollecting: boolean          // Currently collecting data?

  // Lifecycle
  connect(config?: any): Promise<void>
  disconnect(): void

  // Data access (generic)
  getData<T = any>(): T | null
  onData<T = any>(callback: (data: T) => void): () => void

  // Status
  getConnectionStatus(): ConnectionStatus
  getLatency(): number | null
}
```

#### 2. Provider Registry with Category Filtering

```typescript
class ProviderRegistry {
  private providers = new Map<string, DataProvider>()

  register(provider: DataProvider): void {
    this.providers.set(provider.id, provider)
  }

  getByCategory(category: ProviderCategory): DataProvider[] {
    return Array.from(this.providers.values())
      .filter(p => p.category === category)
  }

  getActive(): DataProvider[] {
    return Array.from(this.providers.values())
      .filter(p => p.isActive)
  }

  toggleActive(id: string): void {
    const provider = this.providers.get(id)
    if (provider) {
      provider.isActive = !provider.isActive
    }
  }
}
```

#### 3. Visual Distinction Pattern

```svelte
<script lang="ts">
  export let provider: DataProvider

  $: visualState = {
    opacity: provider.isActive ? '100' : '50',
    filter: provider.isActive ? 'none' : 'grayscale(100%)',
    badge: provider.isActive ? null : 'EXCLUDED FROM CALC'
  }
</script>

<div
  class="provider-card"
  style:opacity={visualState.opacity}
  style:filter={visualState.filter}
>
  <h3>{provider.name}</h3>
  {#if visualState.badge}
    <span class="badge-excluded">{visualState.badge}</span>
  {/if}

  <button on:click={() => provider.isActive = !provider.isActive}>
    {provider.isActive ? 'Exclude' : 'Include'} in Calculation
  </button>
</div>
```

### Implementation Benefits

1. **Category-Based Organization**: Dashboard sections auto-organize by provider category
2. **On-the-Fly Toggling**: Exclude data sources without stopping collection
3. **Visual Clarity**: Dimmed/grayscale for excluded sources
4. **Type Safety**: TypeScript enforces all provider contracts
5. **Zero Code Changes**: New providers = one registration line

### Adding New Provider Types

**Example: Twitter Sentiment Provider**
```typescript
class TwitterSentimentProvider implements DataProvider {
  id = 'twitter-sentiment'
  name = 'Twitter/X Sentiment'
  category = 'sentiment'
  dataType = 'sentiment'
  color = '#1DA1F2'
  isActive = true
  isCollecting = false

  getData<SentimentData>(): SentimentData {
    return {
      symbol: 'BTC',
      score: 0.65,
      volume: 15420,
      timestamp: Date.now(),
      source: 'twitter'
    }
  }
}
```

**Registration**: `providerRegistry.register(new TwitterSentimentProvider())`

## Consequences

### Positive
- Infinite extensibility across data source types
- Clear separation: collection vs. calculation inclusion
- Operators have full control over price inputs
- Visual feedback prevents confusion
- SOLID principles enforced

### Negative
- Slightly more complex initial setup than hard-coded approach
- Need to maintain provider interface contract

### Neutral
- Providers must implement full interface
- Registry adds one level of indirection

## Follow-Up Tasks

- [ ] Implement multi-category provider interface
- [ ] Create provider registry with toggle functionality
- [ ] Build visual distinction system (active/inactive states)
- [ ] Implement 3 exchange providers (Coinbase, Binance, Kraken)
- [ ] Create toggle UI controls per provider
- [ ] Add "Active Sources" summary panel
- [ ] Write provider testing utilities

---

**For Aiur... and extensible architectures!** ⚡

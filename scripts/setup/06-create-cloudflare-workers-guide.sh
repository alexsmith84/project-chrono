#!/bin/bash

# Project Chrono - Cloudflare Workers Setup Guide Creation
# Script 6 of 7: Create Cloudflare Workers deployment guide
# Phase 2d (Part 2)
# 
# "Deploy the Probes. Gather resources from across the network."

set -e  # Exit on any error

echo "☁️  PROJECT CHRONO - CLOUDFLARE WORKERS GUIDE"
echo "==========================================="
echo ""

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Create Cloudflare Workers Setup Guide
echo -e "${BLUE}Creating Cloudflare Workers setup guide...${NC}"

cat > docs/setup/cloudflare-workers.md << 'EOF'
# Cloudflare Workers Setup Guide - Project Chrono

*"Deploy the Probes. Gather resources from across the network."*

---

## Overview

Cloudflare Workers provide edge-distributed price collection for Project Chrono. This guide covers setup, deployment, and management of data collection workers.

**Architecture**:
- Workers deployed globally across Cloudflare's network
- Each worker collects from specific exchanges
- Data forwarded to Mac Mini core processing
- Rate limiting and error handling built-in

---

## Prerequisites

- Cloudflare account (free tier sufficient for MVP)
- Domain configured on Cloudflare (`hayven.xyz`)
- Node.js and npm installed (for Wrangler CLI)
- API keys for exchanges (Coinbase, Binance, Kraken, etc.)

---

## Phase 1: Cloudflare Account Setup

### Step 1: Create Cloudflare Account

1. Go to https://dash.cloudflare.com/sign-up
2. Create account with email
3. Verify email address

### Step 2: Add Domain

1. Click "Add a site"
2. Enter: `hayven.xyz`
3. Select Free plan
4. Update nameservers at your domain registrar:
   - `ari.ns.cloudflare.com`
   - `sam.ns.cloudflare.com`
5. Wait for DNS propagation (5-30 minutes)

### Step 3: Configure DNS Records

Add A records for all subdomains (pointing to Mac Mini IP):

```
Type: A, Name: nexus, Content: [Your Public IP], Proxy: OFF
Type: A, Name: probe, Content: [Your Public IP], Proxy: OFF
Type: A, Name: forge, Content: [Your Public IP], Proxy: OFF
Type: A, Name: gateway, Content: [Your Public IP], Proxy: OFF
Type: A, Name: templar, Content: [Your Public IP], Proxy: OFF
```

**Note**: Proxy OFF initially for Let's Encrypt. Enable later for DDoS protection.

---

## Phase 2: Wrangler CLI Setup

### Install Wrangler

```bash
# Install globally
npm install -g wrangler

# Verify installation
wrangler --version

# Login to Cloudflare
wrangler login
# Opens browser for authentication
```

### Initialize Workers Project

```bash
# Navigate to workers directory
cd ~/projects/project-chrono/src/workers/typescript

# Initialize each worker
wrangler init coinbase-worker
wrangler init binance-worker
wrangler init kraken-worker
wrangler init bybit-worker
wrangler init okx-worker
```

---

## Phase 3: Worker Implementation

### Exchange Worker Template

**File**: `src/workers/typescript/coinbase-worker/src/index.ts`

```typescript
/**
 * Coinbase Price Collection Worker
 * Collects BTC, ETH, FLR prices from Coinbase API
 */

interface Env {
  COINBASE_API_KEY: string;
  COINBASE_API_SECRET: string;
  CORE_API_URL: string;
  CORE_API_KEY: string;
  WORKER_KV: KVNamespace;
}

interface PriceData {
  symbol: string;
  price: number;
  volume: number;
  timestamp: string;
  source: string;
}

export default {
  async scheduled(
    event: ScheduledEvent,
    env: Env,
    ctx: ExecutionContext
  ): Promise<void> {
    try {
      const symbols = ['BTC-USD', 'ETH-USD', 'FLR-USD'];
      
      const prices = await Promise.all(
        symbols.map(symbol => collectPrice(symbol, env))
      );
      
      const validPrices = prices.filter(p => p !== null) as PriceData[];
      
      if (validPrices.length > 0) {
        await sendToCore(validPrices, env);
      }
      
      await env.WORKER_KV.put('last_run', new Date().toISOString());
      await env.WORKER_KV.put('last_success', JSON.stringify({
        timestamp: new Date().toISOString(),
        prices_collected: validPrices.length
      }));
      
    } catch (error) {
      console.error('Worker execution failed:', error);
      await env.WORKER_KV.put('last_error', JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message
      }));
    }
  },
  
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    if (url.pathname === '/status') {
      const lastRun = await env.WORKER_KV.get('last_run');
      const lastSuccess = await env.WORKER_KV.get('last_success');
      const lastError = await env.WORKER_KV.get('last_error');
      
      return new Response(JSON.stringify({
        worker: 'coinbase-worker',
        status: 'operational',
        last_run: lastRun,
        last_success: JSON.parse(lastSuccess || '{}'),
        last_error: JSON.parse(lastError || '{}')
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
};

async function collectPrice(
  symbol: string, 
  env: Env
): Promise<PriceData | null> {
  try {
    const response = await fetch(
      `https://api.coinbase.com/v2/prices/${symbol}/spot`,
      {
        headers: {
          'CB-ACCESS-KEY': env.COINBASE_API_KEY,
        }
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      symbol: symbol.replace('-', '/'),
      price: parseFloat(data.data.amount),
      volume: 0,
      timestamp: new Date().toISOString(),
      source: 'coinbase'
    };
    
  } catch (error) {
    console.error(`Failed to collect ${symbol}:`, error);
    return null;
  }
}

async function sendToCore(
  prices: PriceData[], 
  env: Env
): Promise<void> {
  const response = await fetch(
    `${env.CORE_API_URL}/internal/ingest`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': env.CORE_API_KEY,
        'X-Worker-ID': 'coinbase-worker'
      },
      body: JSON.stringify({ prices })
    }
  );
  
  if (!response.ok) {
    throw new Error(`Core API error: ${response.status}`);
  }
}
```

### Worker Configuration

**File**: `wrangler.toml`

```toml
name = "coinbase-worker"
main = "src/index.ts"
compatibility_date = "2024-01-01"

[triggers]
crons = ["*/30 * * * *"]  # Every 30 seconds

[vars]
CORE_API_URL = "https://nexus.hayven.xyz"

kv_namespaces = [
  { binding = "WORKER_KV", id = "your-kv-namespace-id" }
]
```

---

## Phase 4: Environment Secrets

### Set Secrets

```bash
# Navigate to worker directory
cd src/workers/typescript/coinbase-worker

# Set secrets (prompted for values)
wrangler secret put COINBASE_API_KEY
wrangler secret put COINBASE_API_SECRET
wrangler secret put CORE_API_KEY

# Verify secrets
wrangler secret list
```

### Create KV Namespace

```bash
# Create KV namespace for worker state
wrangler kv:namespace create "WORKER_KV"

# Note the ID and add to wrangler.toml
# kv_namespaces = [{ binding = "WORKER_KV", id = "abc123..." }]
```

---

## Phase 5: Deployment

### Deploy Workers

```bash
# Deploy Coinbase worker
cd src/workers/typescript/coinbase-worker
wrangler deploy

# Deploy other workers
cd ../binance-worker && wrangler deploy
cd ../kraken-worker && wrangler deploy
cd ../bybit-worker && wrangler deploy
cd ../okx-worker && wrangler deploy
```

### Verify Deployment

```bash
# Check worker status
wrangler deployments list

# Tail logs (real-time)
wrangler tail coinbase-worker

# Check KV storage
wrangler kv:key get --binding=WORKER_KV "last_run"

# Test status endpoint
curl https://coinbase-worker.your-subdomain.workers.dev/status
```

---

## Phase 6: Exchange Rate Limits

### Rate Limit Reference

| Exchange | Free Tier Limit | Worker Schedule | Safety |
|----------|-----------------|-----------------|--------|
| Coinbase | 10 req/sec | 30s intervals, 3 symbols | ✓ Safe |
| Binance | 1200 req/min | 30s intervals, 10 symbols | ✓ Safe |
| Kraken | 15-20 req/min | 30s intervals, 5 symbols | ✓ Safe |
| Bybit | 120 req/min | 30s intervals | ✓ Safe |
| OKX | 20 req/sec | 30s intervals | ✓ Safe |

### Retry Logic Implementation

```typescript
async function fetchWithRetry(
  url: string, 
  options: RequestInit,
  maxRetries = 3
): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      
      if (response.ok) {
        return response;
      }
      
      if (response.status >= 500 && i < maxRetries - 1) {
        await sleep(Math.pow(2, i) * 100);
        continue;
      }
      
      return response;
      
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await sleep(Math.pow(2, i) * 100);
    }
  }
  
  throw new Error('Max retries exceeded');
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
```

---

## Phase 7: Monitoring & Management

### Worker Metrics Dashboard

Access via Cloudflare Dashboard:
1. Dashboard → Workers & Pages
2. Select worker
3. View metrics:
   - Requests per second
   - CPU time
   - Errors
   - Success rate

### Log Monitoring

```bash
# Real-time logs
wrangler tail coinbase-worker --format=pretty

# Filter by status
wrangler tail coinbase-worker --status=error

# Filter by method
wrangler tail coinbase-worker --method=POST
```

### Status Check Script

```bash
# Create monitoring script
cat > scripts/check-workers.sh << 'SCRIPT'
#!/bin/bash

WORKERS=("coinbase" "binance" "kraken" "bybit" "okx")

for worker in "${WORKERS[@]}"; do
  echo "Checking ${worker}-worker..."
  STATUS=$(curl -s https://${worker}-worker.your-subdomain.workers.dev/status)
  LAST_RUN=$(echo $STATUS | jq -r '.last_run')
  echo "  Last run: $LAST_RUN"
  echo ""
done
SCRIPT

chmod +x scripts/check-workers.sh
```

---

## Phase 8: Cost Optimization

### Cloudflare Workers Pricing

**Free Tier**:
- 100,000 requests/day
- 10ms CPU time per request
- Sufficient for MVP

**Cost Calculation**:
```
Workers: 5 (one per exchange)
Schedule: Every 30 seconds = 2,880 runs/day per worker
Total: 5 × 2,880 = 14,400 requests/day
Monthly: 14,400 × 30 = 432,000 requests

Free tier: 100,000 requests/day = 3,000,000/month
Status: Well within free tier ✓
```

**Paid Tier** ($5/month if needed):
- 10 million requests/month
- First 50ms CPU time free per request

### Optimization Tips

```typescript
// 1. Batch API calls when exchange supports it
const symbols = ['BTC-USD', 'ETH-USD', 'FLR-USD'];
const batch = await fetch(`https://api.exchange.com/batch?symbols=${symbols.join(',')}`);

// 2. Cache non-critical data in KV
const config = await env.WORKER_KV.get('config', 'json');

// 3. Minimize CPU time
const { data: { amount } } = await response.json();
```

---

## Phase 9: Testing & Validation

### Local Testing

```bash
# Start local dev server
cd src/workers/typescript/coinbase-worker
wrangler dev

# Test scheduled trigger
curl http://localhost:8787/__scheduled

# Test status endpoint
curl http://localhost:8787/status
```

### Integration Testing

```bash
# Test worker → core API flow
# 1. Deploy worker to staging
wrangler deploy --env staging

# 2. Trigger manually
curl -X POST https://coinbase-worker.staging.workers.dev/__scheduled

# 3. Check core API logs
tail -f ~/projects/project-chrono/logs/api.log | grep ingest

# 4. Verify data in database
psql -d project_chrono -c "SELECT * FROM price_feeds ORDER BY timestamp DESC LIMIT 10;"
```

### Automated Testing

```bash
# Create test script
cat > test-worker-integration.sh << 'TEST'
#!/bin/bash

echo "Testing worker integration..."

# Trigger worker
curl -X POST https://coinbase-worker.your-subdomain.workers.dev/__scheduled

# Wait for processing
sleep 5

# Check database for new entries
COUNT=$(psql -d project_chrono -tAc "SELECT COUNT(*) FROM price_feeds WHERE timestamp > NOW() - INTERVAL '1 minute'")

if [ "$COUNT" -gt 0 ]; then
  echo "✓ Integration test passed ($COUNT prices ingested)"
  exit 0
else
  echo "✗ Integration test failed (no prices ingested)"
  exit 1
fi
TEST

chmod +x test-worker-integration.sh
```

---

## Phase 10: Production Deployment

### Pre-Deployment Checklist

- [ ] All secrets configured
- [ ] KV namespaces created
- [ ] wrangler.toml reviewed
- [ ] Local testing passed
- [ ] Integration testing passed
- [ ] Core API ready to receive data
- [ ] Monitoring configured

### Deployment Steps

```bash
# 1. Deploy all workers
for worker in coinbase binance kraken bybit okx; do
  cd src/workers/typescript/${worker}-worker
  wrangler deploy
  echo "Deployed ${worker}-worker ✓"
done

# 2. Verify all workers
for worker in coinbase binance kraken bybit okx; do
  STATUS=$(curl -s https://${worker}-worker.your-subdomain.workers.dev/status)
  echo "${worker}: $(echo $STATUS | jq -r '.status')"
done

# 3. Monitor logs for first hour
wrangler tail coinbase-worker &
wrangler tail binance-worker &
wrangler tail kraken-worker &

# Wait and observe
sleep 3600

# 4. Check database ingestion
psql -d project_chrono -c "
  SELECT source, COUNT(*), MAX(timestamp) 
  FROM price_feeds 
  WHERE timestamp > NOW() - INTERVAL '1 hour'
  GROUP BY source;
"
```

### Post-Deployment Validation

```bash
# Verify worker health
./scripts/check-workers.sh

# Check price ingestion rate
psql -d project_chrono -c "
  SELECT 
    DATE_TRUNC('minute', timestamp) AS minute,
    COUNT(*) as prices_count
  FROM price_feeds
  WHERE timestamp > NOW() - INTERVAL '10 minutes'
  GROUP BY minute
  ORDER BY minute DESC;
"

# Monitor for errors
wrangler tail coinbase-worker --status=error
```

---

## Troubleshooting

### Issue: Worker not triggering

```bash
# Check cron trigger
wrangler deployments list

# Verify schedule in wrangler.toml
cat wrangler.toml | grep crons

# Manually trigger
wrangler tail coinbase-worker
# Then visit: https://coinbase-worker.your-subdomain.workers.dev/__scheduled
```

### Issue: API key errors

```bash
# List secrets
wrangler secret list

# Re-set secret
wrangler secret put COINBASE_API_KEY

# Test with logs
wrangler tail coinbase-worker --format=pretty
```

### Issue: Core API not receiving data

```bash
# Check worker logs
wrangler tail coinbase-worker | grep "Core API"

# Test core API endpoint directly
curl -X POST https://nexus.hayven.xyz/internal/ingest \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-key" \
  -d '{"prices":[{"symbol":"BTC/USD","price":45000,"volume":0,"timestamp":"2025-10-04T12:00:00Z","source":"test"}]}'

# Check core API logs
tail -f ~/projects/project-chrono/logs/api.log
```

### Issue: Rate limiting

```bash
# Check exchange API status
curl -I https://api.coinbase.com/v2/prices/BTC-USD/spot

# Adjust worker schedule (increase interval)
# Edit wrangler.toml: crons = ["0 */1 * * *"]  # Every hour instead of 30s

# Redeploy
wrangler deploy
```

---

## Maintenance

### Regular Tasks

**Daily**:
- Check worker status: `./scripts/check-workers.sh`
- Review error logs: `wrangler tail [worker] --status=error`

**Weekly**:
- Verify ingestion rates
- Check KV storage usage
- Review API quota usage

**Monthly**:
- Update dependencies: `npm update -g wrangler`
- Review and optimize worker code
- Check Cloudflare billing (if on paid tier)

### Updating Workers

```bash
# 1. Make code changes
cd src/workers/typescript/coinbase-worker
nano src/index.ts

# 2. Test locally
wrangler dev

# 3. Deploy update
wrangler deploy

# 4. Monitor deployment
wrangler tail coinbase-worker --format=pretty
```

---

## Advanced Configuration

### Custom Routes (Optional)

Map workers to custom routes:

```toml
# In wrangler.toml
routes = [
  { pattern = "probe.hayven.xyz/coinbase", zone_name = "hayven.xyz" }
]
```

### Environment Variables

```toml
# Different configs per environment
[env.staging]
vars = { CORE_API_URL = "https://staging-nexus.hayven.xyz" }

[env.production]
vars = { CORE_API_URL = "https://nexus.hayven.xyz" }
```

Deploy to specific environment:
```bash
wrangler deploy --env staging
wrangler deploy --env production
```

---

*"The Probes are deployed. Resource gathering operational. En Taro Tassadar!"*
EOF

echo -e "${GREEN}✓ Cloudflare Workers setup guide created${NC}"
echo ""

# Summary
echo ""
echo "================================================"
echo -e "${GREEN}✨ SCRIPT 6 COMPLETE - WORKERS GUIDE ✨${NC}"
echo "================================================"
echo ""
echo "Created:"
echo "  ✓ Complete Cloudflare Workers setup guide (docs/setup/cloudflare-workers.md)"
echo ""
echo "Covers:"
echo "  - Cloudflare account and DNS setup"
echo "  - Wrangler CLI installation"
echo "  - Worker implementation (with full code example)"
echo "  - Environment secrets and KV storage"
echo "  - Deployment and verification"
echo "  - Exchange rate limits and retry logic"
echo "  - Monitoring and management"
echo "  - Cost optimization (free tier analysis)"
echo "  - Testing and validation"
echo "  - Production deployment checklist"
echo "  - Troubleshooting guide"
echo ""
echo "Next steps:"
echo "  1. Run: ./scripts/setup/07-create-business-templates.sh (Final script!)"
echo ""
echo -e "${BLUE}Edge deployment complete. Probes gathering data across the network!${NC}"
echo ""
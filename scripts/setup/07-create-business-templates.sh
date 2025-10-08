#!/bin/bash

# Project Chrono - Business Templates Creation
# Script 7 of 7: Create business spreadsheet templates and guides
# Phase 2e (FINAL SCRIPT!)
# 
# "Calculating resource allocation. Optimizing for victory."

set -e  # Exit on any error

echo "📊 PROJECT CHRONO - BUSINESS TEMPLATES"
echo "======================================"
echo ""

# Color output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Create P&L Model Guide
echo -e "${BLUE}Creating P&L model guide...${NC}"

cat > docs/business/pnl-model-guide.md << 'EOF'
# P&L Model Guide - Project Chrono

*"We require more minerals... and accurate financial projections!"*

---

## Overview

This guide explains how to build the P&L (Profit & Loss) projection model for Project Chrono FTSO operations.

**Purpose**: Model profitability across different FLR price scenarios and delegation levels.

**Tool**: Microsoft Excel or Google Sheets

---

## Spreadsheet Structure

### Sheet 1: Assumptions

| Parameter | Value | Notes |
|-----------|-------|-------|
| **Current FLR Price** | $0.021 | Update monthly |
| **Monthly Infrastructure Cost** | $70-220 | MVP phase |
| **Delegation Fee %** | 15% | Our fee from delegators |
| **FTSO Reward Rate** | 2-5% APY | Network average |
| **Target Delegation** | 100M FLR | Long-term goal |

### Sheet 2: Revenue Projections

**Columns:**
- FLR Price Scenario ($0.02, $0.05, $0.10, $0.50, $1.00)
- Delegation Amount (10M, 50M, 100M, 500M FLR)
- Annual FTSO Rewards (FLR)
- Annual FTSO Rewards (USD)
- Our Fee (15%)
- Monthly Revenue (USD)

**Formula Example:**
```
Annual Rewards (FLR) = Delegation × Reward Rate (3%)
Annual Rewards (USD) = Annual Rewards (FLR) × FLR Price
Our Fee = Annual Rewards (USD) × 15%
Monthly Revenue = Our Fee / 12
```

### Sheet 3: Cost Model

**Monthly Costs:**

| Item | MVP | Growth | Scale |
|------|-----|--------|-------|
| Mac Mini (power) | $15 | $15 | $30 (2 units) |
| Internet | $50 | $50 | $50 |
| Domain & SSL | $5 | $5 | $5 |
| Cloudflare Workers | $0 | $0 | $5 |
| API Keys (exchanges) | $0 | $0 | $50 |
| Monitoring | $0 | $0 | $0 (self-hosted) |
| **Total** | **$70** | **$70** | **$140** |

**Growth Phase** (add):
- Additional storage: $20/month
- Backup services: $10/month
- **Total Growth**: $100/month

**Scale Phase** (add):
- Second Mac Mini: $30/month (power)
- Premium API tiers: $50/month
- **Total Scale**: $180/month

### Sheet 4: Break-Even Analysis

**Break-Even Formula:**
```
Break-Even Delegation (FLR) = Monthly Costs / (FLR Price × Annual Reward Rate × Fee % / 12)
```

**Example Calculations:**

| FLR Price | Monthly Cost | Break-Even Delegation |
|-----------|-------------|----------------------|
| $0.021 | $70 | ~90M FLR |
| $0.05 | $70 | ~38M FLR |
| $0.10 | $70 | ~19M FLR |
| $0.50 | $70 | ~4M FLR |

### Sheet 5: Scenario Analysis

**Best Case** (Bull Market):
- FLR Price: $0.50
- Delegation: 100M FLR
- Monthly Revenue: $1,875
- Monthly Cost: $100
- **Monthly Profit: $1,775**

**Base Case** (Current Market):
- FLR Price: $0.05
- Delegation: 50M FLR
- Monthly Revenue: $313
- Monthly Cost: $70
- **Monthly Profit: $243**

**Worst Case** (Bear Market):
- FLR Price: $0.02
- Delegation: 20M FLR
- Monthly Revenue: $75
- Monthly Cost: $70
- **Monthly Profit: $5** (barely profitable)

---

## How to Use

1. **Update Assumptions** monthly (FLR price, costs)
2. **Track Actual Delegation** vs projections
3. **Compare Scenarios** to actual performance
4. **Adjust Strategy** based on profitability

---

*"Resources calculated. Strategy optimized."*
EOF

echo -e "${GREEN}✓ P&L model guide created${NC}"
echo ""

# Create Infrastructure Costs Guide
echo -e "${BLUE}Creating infrastructure costs guide...${NC}"

cat > docs/business/infrastructure-costs-guide.md << 'EOF'
# Infrastructure Costs Guide - Project Chrono

*"Construct additional pylons... but calculate the cost first!"*

---

## Overview

Detailed cost breakdown and scaling scenarios for Project Chrono infrastructure.

---

## Current Infrastructure (MVP Phase)

### One-Time Costs

| Item | Cost | Notes |
|------|------|-------|
| Mac Mini M4 Pro | $1,999 | 14-core, 48GB RAM, 512GB SSD |
| UPS (Battery Backup) | $150 | APC 1500VA |
| Network Switch | $50 | Gigabit, optional |
| **Total One-Time** | **$2,199** | |

### Monthly Operating Costs

| Item | Cost | Annual | Notes |
|------|------|--------|-------|
| **Electricity** | | | |
| Mac Mini (30W avg) | $11 | $132 | @ $0.15/kWh |
| UPS + Network | $4 | $48 | Additional draw |
| **Internet** | | | |
| Business Internet | $50 | $600 | 500 Mbps |
| **Services** | | | |
| Domain (hayven.xyz) | $3 | $36 | Annual renewal |
| Cloudflare (free tier) | $0 | $0 | Workers + DNS |
| **Software** | | | |
| macOS (included) | $0 | $0 | Free updates |
| Development tools | $0 | $0 | All open source |
| **Monitoring** | | | |
| Prometheus/Grafana | $0 | $0 | Self-hosted |
| **Total Monthly** | **$68** | **$816** | MVP baseline |

---

## Scaling Scenarios

### Growth Phase (50M+ FLR Delegated)

**Additional Monthly Costs:**

| Item | Cost | Reason |
|------|------|--------|
| Second Mac Mini | $15 | Redundancy/failover |
| Cloud backup (S3) | $10 | Offsite backups |
| Premium monitoring | $20 | Enhanced observability |
| **Additional** | **$45** | |
| **New Total** | **$113/month** | |

### Scale Phase (100M+ FLR Delegated)

**Additional Monthly Costs:**

| Item | Cost | Reason |
|------|------|--------|
| Third Mac Mini | $15 | Load distribution |
| Premium API keys | $50 | Higher rate limits |
| Dedicated server space | $30 | Data center rack space |
| Business insurance | $25 | Equipment protection |
| **Additional** | **$120** | |
| **New Total** | **$233/month** | |

---

## Cost vs Cloud Comparison

### Self-Hosted (Current Approach)

**Total Cost** (3 years):
- Hardware: $2,199 (one-time)
- Operating: $816/year × 3 = $2,448
- **Total: $4,647** ($129/month avg)

### Cloud Alternative (AWS/GCP)

**Monthly Costs**:
- EC2 instances (3×): $200
- RDS PostgreSQL: $150
- ElastiCache Redis: $50
- Data transfer: $100
- Monitoring: $50
- **Total: $550/month** ($19,800 over 3 years)

**Savings with Self-Hosted**: $15,153 (77% reduction)

---

## ROI Analysis

### Break-Even on Hardware

Mac Mini pays for itself when:
```
Monthly Savings = $550 (cloud) - $68 (self-hosted) = $482
Break-even time = $2,199 / $482 = 4.6 months
```

**Conclusion**: Hardware investment recovered in ~5 months

---

## Cost Optimization Tips

1. **Power Management**: Mac Mini uses 30W avg vs 100W+ for servers
2. **Cooling**: Minimal cooling needed vs data center AC costs
3. **Bandwidth**: Residential business internet vs expensive data center bandwidth
4. **Upgrades**: RAM/SSD upgradeable on Mac Mini vs cloud scaling costs

---

*"Resources optimized. Maximum efficiency achieved."*
EOF

echo -e "${GREEN}✓ Infrastructure costs guide created${NC}"
echo ""

# Create FTSO Metrics Guide
echo -e "${BLUE}Creating FTSO metrics tracking guide...${NC}"

cat > docs/business/ftso-metrics-guide.md << 'EOF'
# FTSO Metrics Tracking Guide - Project Chrono

*"Know thy statistics. Victory lies in the data."*

---

## Overview

Track FTSO performance metrics to optimize oracle operations and maximize rewards.

**Update Frequency**: Daily (automated) + Weekly review

---

## Key Performance Indicators (KPIs)

### 1. Submission Success Rate

**Target**: 99.9%

**Formula**: `(Successful Submissions / Total Attempts) × 100`

**Tracking**:
- Total submissions attempted per day
- Successful submissions confirmed on-chain
- Failed submissions (by reason: gas, timeout, RPC error)

**Spreadsheet Columns**:
| Date | Attempted | Successful | Failed | Success Rate |
|------|-----------|-----------|--------|--------------|
| Oct 1 | 960 | 958 | 2 | 99.79% |

### 2. Price Accuracy Score

**Target**: Top 25% of providers

**Tracking**:
- Submitted price vs consensus price (deviation %)
- Rank among all FTSO providers
- Accuracy score from Flare Network

**Spreadsheet Columns**:
| Date | Avg Deviation | Network Rank | Accuracy Score |
|------|---------------|--------------|----------------|
| Oct 1 | 0.15% | 12/85 | 97.8% |

### 3. Rewards Earned

**Target**: Growing monthly

**Tracking**:
- Daily FLR rewards earned
- Cumulative monthly rewards
- USD value (at current FLR price)

**Spreadsheet Columns**:
| Date | FLR Earned | Cumulative (Month) | USD Value |
|------|-----------|-------------------|-----------|
| Oct 1 | 125.5 | 125.5 | $6.28 |

### 4. Delegation Metrics

**Target**: 100M+ FLR

**Tracking**:
- Total FLR delegated to our oracle
- Number of delegators
- Average delegation size
- Delegation growth rate

**Spreadsheet Columns**:
| Date | Total Delegated | # Delegators | Avg Size | Growth (7d) |
|------|----------------|--------------|----------|-------------|
| Oct 1 | 15.2M | 45 | 337K | +12% |

### 5. Market Share

**Target**: 5% of total FTSO voting power

**Tracking**:
- Our voting power (delegated FLR)
- Total network voting power
- Market share percentage
- Rank among providers

**Spreadsheet Columns**:
| Date | Our Power | Network Total | Market Share | Rank |
|------|-----------|--------------|--------------|------|
| Oct 1 | 15.2M | 2.8B | 0.54% | 28/85 |

---

## Performance Dashboard Structure

### Daily Metrics Sheet

**Columns**: Date | Submissions | Success Rate | Accuracy | Rewards (FLR) | Delegation

**Charts**:
1. Line chart: Success rate over time (target line at 99.9%)
2. Line chart: Accuracy score trend
3. Bar chart: Daily rewards earned
4. Area chart: Delegation growth

### Weekly Summary Sheet

**Metrics**:
- Average success rate
- Average accuracy score
- Total rewards (FLR + USD)
- Net delegation change
- Week-over-week growth

### Competition Analysis Sheet

**Track Top 10 Providers**:
| Provider | Delegation | Accuracy | Market Share | Our Gap |
|----------|-----------|----------|--------------|---------|
| Provider A | 450M | 98.5% | 16% | -434.8M |
| Provider B | 280M | 97.2% | 10% | -264.8M |
| **Us** | **15.2M** | **97.8%** | **0.54%** | **-** |

---

## Automated Data Collection

### Database Queries

**Daily Success Rate**:
```sql
SELECT 
  DATE(timestamp) as date,
  COUNT(*) as total,
  SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
  ROUND(AVG(CASE WHEN status = 'success' THEN 100 ELSE 0 END), 2) as success_rate
FROM ftso_submissions
WHERE timestamp >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY DATE(timestamp)
ORDER BY date DESC;
```

**Rewards Summary**:
```sql
SELECT 
  DATE(claimed_at) as date,
  SUM(amount_flr) as total_flr,
  SUM(amount_flr * flr_price_usd) as total_usd
FROM ftso_rewards
WHERE claimed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(claimed_at)
ORDER BY date DESC;
```

### Export to Spreadsheet

```bash
# Export daily metrics
psql -d project_chrono -c "COPY (
  SELECT * FROM daily_metrics_view
) TO STDOUT WITH CSV HEADER" > ftso-metrics-$(date +%Y%m).csv
```

---

## Alert Thresholds

**Set up alerts when**:
- Success rate drops below 99% (warning) or 95% (critical)
- Accuracy score drops below 95%
- No rewards earned for 24 hours
- Delegation drops by >10% in 24 hours
- Rank falls below top 50%

---

*"Metrics monitored. Performance optimized. Victory secured."*
EOF

echo -e "${GREEN}✓ FTSO metrics guide created${NC}"
echo ""

# Create Delegation Tracking Guide
echo -e "${BLUE}Creating delegation tracking guide...${NC}"

cat > docs/business/delegation-tracking-guide.md << 'EOF'
# Delegation Tracking Guide - Project Chrono

*"Every warrior counts. Track all who pledge their power."*

---

## Overview

Track delegator information, delegation amounts, and growth metrics to understand user acquisition and retention.

**Purpose**: Monitor delegation growth, identify power users, track churn

---

## Delegator Database Structure

### Main Tracking Sheet

**Columns**:
| Wallet Address | First Delegated | Current Amount | Peak Amount | Status | Tier |
|---------------|-----------------|----------------|-------------|--------|------|
| 0x1a2b... | 2025-09-15 | 500,000 | 750,000 | Active | Gold |
| 0x3c4d... | 2025-09-20 | 150,000 | 150,000 | Active | Silver |
| 0x5e6f... | 2025-09-18 | 0 | 100,000 | Churned | - |

### Delegator Tiers

**Classification**:
- **Whale**: 10M+ FLR (top 1%)
- **Gold**: 1M-10M FLR
- **Silver**: 100K-1M FLR
- **Bronze**: 10K-100K FLR
- **Starter**: <10K FLR

### Growth Metrics

**Weekly Summary**:
| Week | New Delegators | Total Delegators | Churned | Net Change | Total Delegation |
|------|---------------|------------------|---------|------------|------------------|
| Oct 1 | 8 | 45 | 2 | +6 | 15.2M FLR |
| Sep 24 | 12 | 37 | 1 | +11 | 13.5M FLR |

**Monthly Goals**:
- New delegators: 30+ per month
- Churn rate: <5%
- Total delegation growth: 20% MoM

---

## User Acquisition Sources

### Tracking Channels

**Source Column** (how they found us):
- Twitter/X Marketing
- Flare Community Forum
- Reddit r/FlareNetworks
- Word of mouth / Referral
- Direct (found our API)

**Channel Performance**:
| Source | Delegators | Avg Delegation | Total FLR |
|--------|-----------|---------------|-----------|
| Twitter | 18 | 280K | 5.0M |
| Forum | 12 | 450K | 5.4M |
| Reddit | 8 | 200K | 1.6M |
| Referral | 7 | 450K | 3.2M |

---

## Retention Analysis

### Cohort Analysis

Track retention by signup month:

| Signup Month | Initial Count | Month 1 | Month 2 | Month 3 |
|-------------|--------------|---------|---------|---------|
| July 2025 | 15 | 93% | 87% | 80% |
| Aug 2025 | 22 | 95% | 91% | - |
| Sep 2025 | 45 | 96% | - | - |

### Churn Reasons

Track why delegators leave:

| Reason | Count | % |
|--------|-------|---|
| Better rate elsewhere | 3 | 40% |
| Moved to own oracle | 2 | 27% |
| Exited FLR | 2 | 27% |
| Unknown | 1 | 6% |

---

## Revenue Impact

### Fee Tracking

**Our Fee Structure**: 15% of FTSO rewards

**Revenue by Delegator**:
| Wallet | Delegation | Est. Annual Rewards | Our Fee (15%) | Monthly Revenue |
|--------|-----------|--------------------|--------------|-----------------| 
| 0x1a2b... | 5M FLR | 150K FLR ($7,500) | 22.5K FLR ($1,125) | $94 |
| 0x3c4d... | 2M FLR | 60K FLR ($3,000) | 9K FLR ($450) | $38 |

**Top Revenue Contributors** (80/20 rule):
- Track which delegators contribute 80% of revenue
- Focus retention efforts on high-value users

---

## Marketing ROI

### Campaign Tracking

**Twitter Campaign Example**:
| Metric | Value |
|--------|-------|
| Ad spend | $100 |
| Reach | 50,000 |
| Clicks | 250 |
| New delegators | 8 |
| Total delegated | 2.2M FLR |
| Est. annual revenue | $413 |
| **ROI** | **313%** |

---

## Automated Tracking

### Smart Contract Events

Monitor delegation events:
```javascript
// Listen for delegation changes
contract.on('DelegationChanged', (delegator, amount, timestamp) => {
  // Update spreadsheet or database
  updateDelegatorRecord(delegator, amount, timestamp);
});
```

### Daily Update Script

```bash
# Export delegator data
psql -d project_chrono -c "COPY (
  SELECT 
    wallet_address,
    first_delegated,
    current_amount,
    status,
    tier
  FROM delegators
  ORDER BY current_amount DESC
) TO STDOUT WITH CSV HEADER" > delegators-$(date +%Y%m%d).csv
```

---

## Action Items Based on Data

**Weekly Reviews**:
1. Identify new whales (10M+ FLR) → personal outreach
2. Contact churned delegators → understand why
3. Reward top delegators → exclusive updates, perks
4. Analyze low-performing channels → adjust marketing

**Monthly Planning**:
1. Set growth targets based on trends
2. Allocate marketing budget to high-ROI channels
3. Plan retention campaigns for at-risk cohorts

---

*"Every ally tracked. Every resource accounted for. The Khala knows all."*
EOF

echo -e "${GREEN}✓ Delegation tracking guide created${NC}"
echo ""

# Summary
echo ""
echo "=================================================="
echo -e "${YELLOW}🎉 ALL 7 BOOTSTRAP SCRIPTS COMPLETE! 🎉${NC}"
echo "=================================================="
echo ""
echo -e "${GREEN}Phase 2e: Business Templates${NC}"
echo "Created:"
echo "  ✓ P&L model guide (docs/business/pnl-model-guide.md)"
echo "  ✓ Infrastructure costs guide (docs/business/infrastructure-costs-guide.md)"
echo "  ✓ FTSO metrics tracking guide (docs/business/ftso-metrics-guide.md)"
echo "  ✓ Delegation tracking guide (docs/business/delegation-tracking-guide.md)"
echo ""
echo -e "${YELLOW}COMPLETE BOOTSTRAP SUITE:${NC}"
echo "  ✓ Script 1: Directory structure & base files"
echo "  ✓ Script 2: Template files (issue, spec, test, implementation)"
echo "  ✓ Script 3: Architecture docs (system design, decisions)"
echo "  ✓ Script 4: Networking docs (Caddy, data flow)"
echo "  ✓ Script 5: Mac Mini setup guide"
echo "  ✓ Script 6: Cloudflare Workers guide"
echo "  ✓ Script 7: Business templates (this script)"
echo ""
echo -e "${GREEN}REPOSITORY IS FULLY BOOTSTRAPPED!${NC}"
echo ""
echo "Next steps:"
echo "  1. Make all scripts executable:"
echo "     chmod +x scripts/setup/*.sh"
echo ""
echo "  2. Run all scripts in order:"
echo "     for i in {01..07}; do ./scripts/setup/\${i}-*.sh; done"
echo ""
echo "  3. Commit everything:"
echo "     git add ."
echo "     git commit -m 'Complete Project Chrono bootstrap - All documentation and structure'"
echo ""
echo "  4. Push to GitHub:"
echo "     git push -u origin khala"
echo ""
echo "  5. Begin implementation:"
echo "     Start with CHRONO-001: GitHub Projects Setup"
echo ""
echo -e "${BLUE}=================================="
echo "En Taro Tassadar!"
echo "The Nexus is complete."
echo "The Probes are deployed."
echo "The Khala connects all."
echo "Victory is within reach!"
echo "==================================${NC}"
echo ""
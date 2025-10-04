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

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

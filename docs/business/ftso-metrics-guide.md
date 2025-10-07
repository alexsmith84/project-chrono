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

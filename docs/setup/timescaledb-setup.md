# TimescaleDB Setup Guide - Project Chrono

*"Patience, young Templar. Even the greatest structures are built in phases."*

---

## Current Status

**PostgreSQL Version**: 17.6 (Homebrew)
**TimescaleDB Status**: ❌ Not Enabled (Optional - Performance Optimization)
**Database Status**: ✅ Fully Functional with Standard PostgreSQL

---

## Why TimescaleDB?

TimescaleDB provides significant performance benefits for time-series data:

- **Hypertables**: Automatic partitioning by time (1-hour chunks for price data)
- **Compression**: 10-20x storage savings after 7 days
- **Retention Policies**: Automatic data cleanup after 2 years
- **Continuous Aggregates**: Pre-computed hourly/daily summaries
- **Optimized Queries**: 100-1000x faster for time-range queries

### Performance Impact

| Feature | Standard PostgreSQL | With TimescaleDB |
|---------|-------------------|------------------|
| Storage (1 year) | ~100 GB | ~10 GB (with compression) |
| Query Speed (24h data) | ~500ms | ~50ms |
| Insert Throughput | 50/sec | 100+/sec |

---

## Current Database Schema

The migration (`migrations/001_initial_schema.sql`) was designed with TimescaleDB in mind but works perfectly without it:

### Tables Using Time-Series Patterns

1. **`price_feeds`** - Raw exchange prices
   - Index on `(symbol, timestamp DESC)` for fast queries
   - Will benefit from hypertable chunking

2. **`aggregated_prices`** - Consensus prices
   - Index on `(symbol, timestamp DESC)`
   - Will benefit from compression after 7 days

3. **`delegations`** - Historical delegation changes
   - Index on `(delegator_id, timestamp DESC)`
   - Will benefit from compression after 30 days

### Regular Tables (No TimescaleDB Needed)

- `ftso_submissions` - Audit log (already optimized with indexes)
- `delegators` - Master data (low volume)
- `ftso_rewards` - Financial records (append-only)
- `system_metadata` - Configuration (key-value)

---

## Why Not Enabled Yet?

TimescaleDB 2.22.1 (from Homebrew) has complex integration with PostgreSQL@17:

1. **Library Path Issues**: TimescaleDB libraries need proper symlinking to PostgreSQL@17's lib directory
2. **Extension Files**: Control and SQL files must be linked to PostgreSQL@17's extension directory
3. **Shared Preload**: Requires `shared_preload_libraries = 'timescaledb'` which can prevent PostgreSQL from starting if misconfigured

**Decision**: Start with standard PostgreSQL, add TimescaleDB when needed for production optimization.

---

## When to Enable TimescaleDB

Consider enabling when you hit these thresholds:

- **Storage**: Database exceeds 10 GB (compression would save ~90%)
- **Query Performance**: Time-range queries take >200ms
- **Data Volume**: Storing >1M price feeds per day
- **Production Deployment**: Preparing for production launch

---

## How to Enable TimescaleDB (Future)

### Option 1: Use TimescaleDB Docker Image (Recommended)

Instead of fighting Homebrew integration, use the official TimescaleDB Docker image:

```bash
# Pull TimescaleDB image
docker pull timescale/timescaledb-ha:pg17

# Run TimescaleDB container
docker run -d \
  --name project-chrono-db \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=your_secure_password \
  -e POSTGRES_DB=project_chrono_dev \
  -v pgdata:/var/lib/postgresql/data \
  timescale/timescaledb-ha:pg17

# Export data from current PostgreSQL@17
pg_dump project_chrono_dev > /tmp/project_chrono_backup.sql

# Import into TimescaleDB container
docker exec -i project-chrono-db psql -U postgres -d project_chrono_dev < /tmp/project_chrono_backup.sql

# Re-run migration to enable hypertables
docker exec -i project-chrono-db psql -U postgres -d project_chrono_dev < migrations/001_initial_schema.sql
```

### Option 2: Build TimescaleDB from Source

For native macOS performance (advanced):

```bash
# Install build dependencies
brew install cmake openssl@3

# Clone TimescaleDB repository
git clone https://github.com/timescale/timescaledb.git
cd timescaledb

# Build for PostgreSQL@17
./bootstrap -DPG_CONFIG=/opt/homebrew/opt/postgresql@17/bin/pg_config
cd build && make
sudo make install

# Update postgresql.conf
echo "shared_preload_libraries = 'timescaledb'" >> /opt/homebrew/var/postgresql@17/postgresql.conf

# Restart PostgreSQL
brew services restart postgresql@17

# Enable extension in database
psql -d project_chrono_dev -c "CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;"
```

### Option 3: Migrate to TimescaleDB Cloud (Production)

For production, consider TimescaleDB Cloud:

- **Managed service**: No setup hassle
- **Automatic backups**: Built-in disaster recovery
- **Optimized performance**: Pre-configured for time-series workloads
- **Free tier**: 500 MB storage, 5M row inserts/month

---

## Migration Plan (When Enabling TimescaleDB)

1. **Backup Current Database**:
   ```bash
   pg_dump project_chrono_dev > /tmp/chrono_backup_$(date +%Y%m%d).sql
   ```

2. **Enable TimescaleDB Extension**:
   ```sql
   CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE;
   ```

3. **Convert Tables to Hypertables**:
   ```sql
   -- Convert price_feeds
   SELECT create_hypertable('price_feeds', 'timestamp',
     chunk_time_interval => INTERVAL '1 hour',
     if_not_exists => TRUE
   );

   -- Convert aggregated_prices
   SELECT create_hypertable('aggregated_prices', 'timestamp',
     chunk_time_interval => INTERVAL '1 hour',
     if_not_exists => TRUE
   );

   -- Convert delegations
   SELECT create_hypertable('delegations', 'timestamp',
     chunk_time_interval => INTERVAL '1 day',
     if_not_exists => TRUE
   );
   ```

4. **Enable Compression Policies**:
   ```sql
   ALTER TABLE price_feeds SET (
     timescaledb.compress,
     timescaledb.compress_segmentby = 'symbol, source',
     timescaledb.compress_orderby = 'timestamp DESC'
   );

   SELECT add_compression_policy('price_feeds', INTERVAL '7 days');
   ```

5. **Enable Retention Policies**:
   ```sql
   SELECT add_retention_policy('price_feeds', INTERVAL '2 years');
   SELECT add_retention_policy('aggregated_prices', INTERVAL '2 years');
   SELECT add_retention_policy('delegations', INTERVAL '2 years');
   ```

6. **Verify Setup**:
   ```sql
   -- Check hypertables
   SELECT * FROM timescaledb_information.hypertables;

   -- Check compression
   SELECT * FROM timescaledb_information.jobs
   WHERE proc_name = 'policy_compression';

   -- Check retention
   SELECT * FROM timescaledb_information.jobs
   WHERE proc_name = 'policy_retention';
   ```

---

## Performance Without TimescaleDB

The current setup is still highly performant:

### Optimizations in Place

1. **Indexes on (symbol, timestamp DESC)**: Fast time-range queries
2. **NUMERIC types**: Precise financial calculations (no floating-point errors)
3. **JSONB for metadata**: Flexible schema for exchange-specific data
4. **Partitioning strategy ready**: Schema designed for future hypertable conversion

### Expected Performance

- **Insert**: 50-100 price feeds/second (single connection)
- **Query (24h data)**: <200ms for 100K rows
- **Query (7d data)**: <500ms for 700K rows
- **Storage**: ~10 MB per 100K price feeds

This is sufficient for:
- Development and testing
- Initial production deployment
- Up to 10M price feeds (~100 GB storage)

---

## Monitoring Performance

Track these metrics to decide when to enable TimescaleDB:

```sql
-- Check table sizes
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check query performance
EXPLAIN ANALYZE
SELECT * FROM price_feeds
WHERE symbol = 'BTC/USD'
  AND timestamp > NOW() - INTERVAL '24 hours'
ORDER BY timestamp DESC
LIMIT 100;

-- Check row counts
SELECT
  'price_feeds' as table_name,
  COUNT(*) as row_count
FROM price_feeds
UNION ALL
SELECT 'aggregated_prices', COUNT(*) FROM aggregated_prices
UNION ALL
SELECT 'delegations', COUNT(*) FROM delegations;
```

---

## References

- **TimescaleDB Docs**: https://docs.timescale.com/
- **Homebrew PostgreSQL**: https://formulae.brew.sh/formula/postgresql@17
- **TimescaleDB Cloud**: https://www.timescale.com/cloud
- **Migration Guide**: `migrations/001_initial_schema.sql`

---

## Decision Log

- **2025-10-09**: Disabled TimescaleDB in initial setup due to Homebrew integration complexity
- **2025-10-09**: Schema designed to be TimescaleDB-ready for future migration
- **2025-10-09**: Standard PostgreSQL@17 indexes provide sufficient performance for development

---

*"The foundation is strong. Optimizations will come when they are needed. For now, we build. En Taro Tassadar!"*

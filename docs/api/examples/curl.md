# curl Examples

Quick reference for testing the API with curl.

---

## Health Check (No Auth)

```bash
curl http://localhost:3000/health
```

---

## Latest Prices

### Single Symbol

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/latest?symbols=BTC/USD"
```

### Multiple Symbols

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/latest?symbols=BTC/USD,ETH/USD,XRP/USD"
```

---

## Price Range (Historical Data)

### Raw Data (No Aggregation)

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/range?symbol=BTC/USD&start=2025-10-10T00:00:00Z&end=2025-10-10T23:59:59Z&limit=100"
```

### OHLCV Aggregation (5-minute candles)

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/range?symbol=BTC/USD&start=2025-10-10T00:00:00Z&end=2025-10-10T23:59:59Z&interval=5m&limit=100"
```

### Filter by Source

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/range?symbol=BTC/USD&start=2025-10-10T00:00:00Z&end=2025-10-10T23:59:59Z&source=coinbase&limit=50"
```

---

## Consensus Prices

### Current Consensus

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/aggregates/consensus?symbols=BTC/USD,ETH/USD"
```

### Historical Consensus (Specific Timestamp)

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/aggregates/consensus?symbols=BTC/USD&timestamp=2025-10-10T14:30:00Z"
```

---

## Ingest Price Feeds (Internal API)

### Single Feed

```bash
curl -X POST http://localhost:3000/internal/ingest \
  -H "Authorization: Bearer chrono_internal_dev_key_001" \
  -H "Content-Type: application/json" \
  -d '{
    "feeds": [{
      "symbol": "BTC/USD",
      "price": 45123.50,
      "volume": 1234567.89,
      "timestamp": "2025-10-10T14:30:00Z",
      "source": "coinbase",
      "worker_id": "worker-us-east-1"
    }]
  }'
```

### Batch Ingestion

```bash
curl -X POST http://localhost:3000/internal/ingest \
  -H "Authorization: Bearer chrono_internal_dev_key_001" \
  -H "Content-Type: application/json" \
  -d '{
    "feeds": [
      {
        "symbol": "BTC/USD",
        "price": 45123.50,
        "timestamp": "2025-10-10T14:30:00Z",
        "source": "coinbase"
      },
      {
        "symbol": "ETH/USD",
        "price": 2456.78,
        "timestamp": "2025-10-10T14:30:00Z",
        "source": "binance"
      },
      {
        "symbol": "XRP/USD",
        "price": 0.5234,
        "timestamp": "2025-10-10T14:30:00Z",
        "source": "kraken"
      }
    ]
  }'
```

---

## Prometheus Metrics (No Auth)

```bash
curl http://localhost:3000/metrics
```

---

## Pretty-Print JSON Responses

Use `jq` for formatted output:

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/latest?symbols=BTC/USD" | jq
```

---

## Save Response to File

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/latest?symbols=BTC/USD" \
  -o response.json
```

---

## Verbose Mode (See Headers)

```bash
curl -v -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/latest?symbols=BTC/USD"
```

---

## Time Request Duration

```bash
time curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/latest?symbols=BTC/USD"
```

---

_"The command line is your ally. Use it wisely."_

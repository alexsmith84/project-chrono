# Project Chrono API Documentation

Welcome to the Project Chrono API! This is a high-performance cryptocurrency price feed aggregation and consensus API.

---

## Quick Start

### 1. Check API Health

```bash
curl http://localhost:3000/health
```

### 2. Get Latest Prices

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/latest?symbols=BTC/USD,ETH/USD"
```

### 3. Explore Interactive Docs

Open [http://localhost:3000/docs](http://localhost:3000/docs) in your browser to explore the full API with an interactive interface.

---

## Features

✅ **Price Ingestion** - High-throughput batch ingestion from multiple exchanges
✅ **Latest Prices** - Cached real-time price queries (2-second cache)
✅ **Historical Data** - Time-range queries with optional OHLCV aggregation
✅ **Consensus Pricing** - Multi-algorithm consensus (VWAP, TWAP, weighted median)
✅ **WebSocket Streaming** - Real-time price updates via WebSocket
✅ **Rate Limiting** - Per-key rate limits with sliding windows
✅ **Prometheus Metrics** - Built-in observability

---

## API Endpoints

### REST Endpoints

| Endpoint                | Method | Auth     | Description                          |
| ----------------------- | ------ | -------- | ------------------------------------ |
| `/health`               | GET    | None     | Health check                         |
| `/metrics`              | GET    | None     | Prometheus metrics                   |
| `/prices/latest`        | GET    | Public   | Latest prices for symbols            |
| `/prices/range`         | GET    | Public   | Historical price data (raw or OHLCV) |
| `/aggregates/consensus` | GET    | Public   | Consensus prices across exchanges    |
| `/internal/ingest`      | POST   | Internal | Batch ingestion endpoint             |

### WebSocket

| Endpoint  | Protocol  | Auth   | Description             |
| --------- | --------- | ------ | ----------------------- |
| `/stream` | WebSocket | Public | Real-time price updates |

### Documentation

| Endpoint        | Description                               |
| --------------- | ----------------------------------------- |
| `/docs`         | Interactive API documentation (Scalar UI) |
| `/openapi.json` | OpenAPI 3.1 specification                 |

---

## Authentication

All endpoints (except `/health`, `/metrics`, and `/docs`) require API key authentication.

**Header Format**:

```
Authorization: Bearer {your_api_key}
```

**API Key Types**:

- **Internal** (`chrono_internal_*`) - Ingestion endpoints (Cloudflare Workers)
- **Public** (`chrono_public_*`) - Query endpoints (external developers)
- **Admin** (`chrono_admin_*`) - All endpoints (administrative)

**Development Keys**:

- Internal: `chrono_internal_dev_key_001`
- Public: `chrono_public_dev_key_001`
- Admin: `chrono_admin_dev_key_001`

📚 **See**: [Authentication Guide](./authentication.md)

---

## Rate Limits

Rate limits are enforced per API key over a 1-minute sliding window:

| Key Type | Free Tier | Paid Tier |
| -------- | --------- | --------- |
| Internal | 5000/min  | 5000/min  |
| Public   | 1000/min  | 10000/min |
| Admin    | Unlimited | Unlimited |

Response headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1633024800
```

---

## Examples

### curl

```bash
# Latest prices
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/latest?symbols=BTC/USD,ETH/USD"

# Historical data with OHLCV aggregation
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/range?symbol=BTC/USD&start=2025-10-10T00:00:00Z&end=2025-10-10T23:59:59Z&interval=5m"

# Consensus prices
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/aggregates/consensus?symbols=BTC/USD,ETH/USD"
```

📚 **See**: [curl Examples](./examples/curl.md)

### JavaScript/TypeScript

```javascript
const API_KEY = "chrono_public_dev_key_001";
const BASE_URL = "http://localhost:3000";

async function getLatestPrices(symbols) {
  const url = `${BASE_URL}/prices/latest?symbols=${symbols.join(",")}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  const data = await response.json();
  return data.prices;
}

const prices = await getLatestPrices(["BTC/USD", "ETH/USD"]);
console.log(prices);
```

📚 **See**: [JavaScript Examples](./examples/javascript.md)

### Python

```python
import requests

API_KEY = 'chrono_public_dev_key_001'
BASE_URL = 'http://localhost:3000'

def get_latest_prices(symbols):
    url = f'{BASE_URL}/prices/latest'
    params = {'symbols': ','.join(symbols)}
    headers = {'Authorization': f'Bearer {API_KEY}'}

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()

    return response.json()['prices']

prices = get_latest_prices(['BTC/USD', 'ETH/USD'])
for price in prices:
    print(f"{price['symbol']}: ${price['price']:.2f}")
```

📚 **See**: [Python Examples](./examples/python.md)

---

## WebSocket Streaming

Connect to `/stream` for real-time price updates:

```javascript
import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3000/stream", {
  headers: {
    Authorization: "Bearer chrono_public_dev_key_001",
  },
});

ws.on("open", () => {
  // Subscribe to symbols
  ws.send(
    JSON.stringify({
      type: "subscribe",
      symbols: ["BTC/USD", "ETH/USD"],
    }),
  );
});

ws.on("message", (data) => {
  const message = JSON.parse(data.toString());

  if (message.type === "price_update") {
    console.log(`${message.symbol}: $${message.price}`);
  }
});
```

📚 **See**: [WebSocket Protocol Documentation](./websocket.md)

---

## Documentation

### Interactive API Reference

Visit [http://localhost:3000/docs](http://localhost:3000/docs) for:

- Complete endpoint documentation
- Interactive "Try It Out" feature
- Automatic code generation (curl, JavaScript, Python, etc.)
- Request/response schemas
- Authentication testing

### Guides

- **[Authentication Guide](./authentication.md)** - API key types, usage, security best practices
- **[WebSocket Protocol](./websocket.md)** - Real-time streaming, message types, connection lifecycle
- **[curl Examples](./examples/curl.md)** - Quick reference for testing with curl
- **[JavaScript Examples](./examples/javascript.md)** - fetch API and WebSocket examples
- **[Python Examples](./examples/python.md)** - requests and websockets examples

### OpenAPI Specification

Download the machine-readable API spec: [http://localhost:3000/openapi.json](http://localhost:3000/openapi.json)

---

## Base URLs

| Environment     | URL                                    |
| --------------- | -------------------------------------- |
| **Development** | `http://localhost:3000`                |
| **Staging**     | `https://api-staging.chrono.dev` (TBD) |
| **Production**  | `https://api.chrono.dev` (TBD)         |

---

## Supported Trading Pairs

Currently supported symbols:

- `BTC/USD` - Bitcoin
- `ETH/USD` - Ethereum
- `XRP/USD` - Ripple
- `ADA/USD` - Cardano
- `SOL/USD` - Solana
- `DOGE/USD` - Dogecoin
- `MATIC/USD` - Polygon
- `DOT/USD` - Polkadot

More pairs coming soon!

---

## Exchange Sources

Price data is aggregated from:

- **Coinbase** - `coinbase`
- **Binance** - `binance`
- **Kraken** - `kraken`
- **Bitstamp** - `bitstamp`
- **Gemini** - `gemini`

---

## Performance

| Metric                   | Target  | Typical  |
| ------------------------ | ------- | -------- |
| Latest Prices (cached)   | < 50ms  | ~2-5ms   |
| Latest Prices (uncached) | < 50ms  | ~10-20ms |
| Historical Queries       | < 100ms | ~20-50ms |
| Consensus Calculation    | < 100ms | ~10-30ms |
| WebSocket Latency        | < 100ms | ~10-50ms |

📚 **See**: [Load Testing Documentation](../performance/LOAD-TESTING.md)

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "request_id": "req_abc123"
  },
  "status": 400
}
```

**Common Error Codes**:

| Code                  | Status | Description                |
| --------------------- | ------ | -------------------------- |
| `VALIDATION_ERROR`    | 400    | Invalid request parameters |
| `UNAUTHORIZED`        | 401    | Missing or invalid API key |
| `FORBIDDEN`           | 403    | Insufficient permissions   |
| `NOT_FOUND`           | 404    | Resource not found         |
| `RATE_LIMIT_EXCEEDED` | 429    | Too many requests          |
| `INTERNAL_ERROR`      | 500    | Server error               |

---

## Getting Help

- **Issues**: [GitHub Issues](https://github.com/alexsmith84/project-chrono/issues)
- **Discussions**: [GitHub Discussions](https://github.com/alexsmith84/project-chrono/discussions)
- **Email**: support@chrono.dev (production keys)

---

## SDKs and Tools

### Coming Soon

- **JavaScript/TypeScript SDK** - NPM package with typed client
- **Python SDK** - PyPI package with async support
- **Postman Collection** - Generated from OpenAPI spec
- **CLI Tool** - Command-line price tracker

---

## Version

**Current Version**: `1.0.0`

**API Stability**: Beta (breaking changes possible until v1.0 stable)

---

## License

MIT License - See [LICENSE](../../LICENSE) file

---

_"The data flows through the Khala. May your queries be swift and your caches warm. En Taro Tassadar!"_

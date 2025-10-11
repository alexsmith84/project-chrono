# Authentication Guide

Project Chrono API uses API key authentication via Bearer tokens.

---

## API Key Format

All API keys follow this format:

```
chrono_{type}_{env}_key_{id}
```

**Components**:

- `type`: API key type (`internal`, `public`, or `admin`)
- `env`: Environment (`dev`, `staging`, `prod`)
- `id`: Unique key identifier (3 digits)

**Examples**:

- `chrono_internal_dev_key_001`
- `chrono_public_prod_key_042`
- `chrono_admin_dev_key_999`

---

## API Key Types

### Internal API Keys

**Purpose**: Ingestion endpoints for Cloudflare Workers

**Permissions**:

- ✅ `POST /internal/ingest` - Ingest price feeds

**Rate Limits**:

- 5000 requests/minute

**Use Case**: Cloudflare Workers collecting price data from exchanges

**Example**:

```bash
curl -X POST "http://localhost:3000/internal/ingest" \
  -H "Authorization: Bearer chrono_internal_dev_key_001" \
  -H "Content-Type: application/json" \
  -d '{
    "feeds": [{
      "symbol": "BTC/USD",
      "price": 45123.50,
      "timestamp": "2025-10-10T14:30:00Z",
      "source": "coinbase"
    }]
  }'
```

---

### Public API Keys

**Purpose**: Query endpoints for external developers

**Permissions**:

- ✅ `GET /prices/latest` - Latest prices
- ✅ `GET /prices/range` - Historical prices
- ✅ `GET /aggregates/consensus` - Consensus prices
- ✅ `WS /stream` - Real-time price streaming

**Rate Limits**:

- Free tier: 1000 requests/minute
- Paid tier: 10000 requests/minute

**Use Case**: External applications querying price data

**Example**:

```bash
curl -X GET "http://localhost:3000/prices/latest?symbols=BTC/USD,ETH/USD" \
  -H "Authorization: Bearer chrono_public_dev_key_001"
```

---

### Admin API Keys

**Purpose**: Administrative access to all endpoints

**Permissions**:

- ✅ All internal endpoints
- ✅ All public endpoints
- ✅ Future administrative endpoints

**Rate Limits**:

- Unlimited

**Use Case**: Internal tooling, monitoring, debugging

**Example**:

```bash
curl -X GET "http://localhost:3000/aggregates/consensus?symbols=BTC/USD" \
  -H "Authorization: Bearer chrono_admin_dev_key_001"
```

---

## How to Authenticate

### HTTP Header

Include the API key in the `Authorization` header using Bearer authentication:

```
Authorization: Bearer {your_api_key}
```

**Example**:

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  http://localhost:3000/prices/latest?symbols=BTC/USD
```

### JavaScript/TypeScript

```javascript
const apiKey = "chrono_public_dev_key_001";

const response = await fetch(
  "http://localhost:3000/prices/latest?symbols=BTC/USD",
  {
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  },
);

const data = await response.json();
console.log(data);
```

### Python

```python
import requests

api_key = 'chrono_public_dev_key_001'

headers = {
    'Authorization': f'Bearer {api_key}'
}

response = requests.get(
    'http://localhost:3000/prices/latest',
    params={'symbols': 'BTC/USD'},
    headers=headers
)

data = response.json()
print(data)
```

### WebSocket

```javascript
const ws = new WebSocket("ws://localhost:3000/stream", {
  headers: {
    Authorization: "Bearer chrono_public_dev_key_001",
  },
});
```

---

## Error Responses

### 401 Unauthorized

**Cause**: Missing or invalid API key

**Response**:

```json
{
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token",
    "request_id": "req_abc123"
  },
  "status": 401
}
```

**Solution**: Ensure you include the `Authorization` header with a valid API key.

---

### 403 Forbidden

**Cause**: API key type doesn't have permission for this endpoint

**Response**:

```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Insufficient permissions. Required: internal, admin",
    "request_id": "req_abc123"
  },
  "status": 403
}
```

**Solution**: Use the correct API key type for the endpoint (e.g., internal key for ingestion).

---

### 429 Too Many Requests

**Cause**: Rate limit exceeded

**Response**:

```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "request_id": "req_abc123"
  },
  "status": 429
}
```

**Solution**: Wait for the rate limit window to reset (1 minute) or upgrade to a higher tier.

---

## Security Best Practices

### ✅ DO

- **Store API keys securely** in environment variables, not in code
- **Use HTTPS** in production (not HTTP)
- **Rotate keys regularly** (every 90 days recommended)
- **Use different keys** for development, staging, and production
- **Monitor key usage** for suspicious activity
- **Revoke compromised keys** immediately

**Example (good)**:

```javascript
// .env file
API_KEY = chrono_public_prod_key_042;

// In code
const apiKey = process.env.API_KEY;
```

### ❌ DON'T

- **Don't commit keys** to version control (use `.gitignore`)
- **Don't share keys** publicly (GitHub, Slack, forums)
- **Don't hardcode keys** in client-side JavaScript
- **Don't use production keys** in development
- **Don't log API keys** in application logs

**Example (bad)**:

```javascript
// ❌ NEVER DO THIS
const apiKey = "chrono_public_prod_key_042"; // Hardcoded!
```

---

## Obtaining API Keys

### Development

**Default development keys** are available in the repository:

- Internal: `chrono_internal_dev_key_001`
- Public: `chrono_public_dev_key_001`
- Admin: `chrono_admin_dev_key_001`

⚠️ **These keys are for local development only. Do not use in production.**

### Production

Contact the Project Chrono team to request production API keys:

1. Email: api-keys@chrono.dev
2. Include: Organization name, use case, estimated traffic
3. Receive: API key and rate limit tier

---

## Testing Authentication

Use the `/health` endpoint to test your setup (no authentication required):

```bash
curl http://localhost:3000/health
```

Then test with an authenticated endpoint:

```bash
curl -H "Authorization: Bearer chrono_public_dev_key_001" \
  "http://localhost:3000/prices/latest?symbols=BTC/USD"
```

If you see price data, authentication is working! 🎉

---

## Rate Limiting

Rate limits are enforced per API key over a **1-minute sliding window**.

| Key Type | Free Tier | Paid Tier |
| -------- | --------- | --------- |
| Internal | 5000/min  | 5000/min  |
| Public   | 1000/min  | 10000/min |
| Admin    | Unlimited | Unlimited |

**Headers returned**:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1633024800
```

See [Rate Limiting Guide](./rate-limiting.md) for details.

---

## Troubleshooting

### "Invalid API key format"

**Cause**: API key doesn't match the expected format

**Solution**: Ensure your key follows the format: `chrono_{type}_{env}_key_{id}`

### "API key not found"

**Cause**: API key doesn't exist in the database

**Solution**: Use a valid development key or request a production key

### "Wrong key type"

**Cause**: Using a public key on an internal endpoint (or vice versa)

**Solution**: Check the endpoint documentation for required key type

---

## Next Steps

- **WebSocket**: See [WebSocket Guide](./websocket.md)
- **Examples**: Browse [integration examples](./examples/)
- **API Reference**: Visit [/docs](http://localhost:3000/docs)

---

_"Authentication successful. Welcome to the Khala network."_

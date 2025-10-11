# WebSocket Protocol Documentation

Real-time price feed streaming via WebSocket.

---

## Overview

The WebSocket endpoint (`/stream`) provides real-time price updates as they are ingested from exchanges.

**Endpoint**: `ws://localhost:3000/stream` (development)

**Authentication**: Required (Bearer token)

**Protocol**: JSON messages over WebSocket

---

## Connection Lifecycle

```
Client                          Server
  |                               |
  |--- WebSocket Upgrade -------->|
  |<-- 101 Switching Protocols ---|
  |                               |
  |--- subscribe message -------->|
  |<-- subscribed confirmation ---|
  |                               |
  |<-- price_update ------------- | (as prices arrive)
  |<-- price_update ------------- |
  |<-- price_update ------------- |
  |                               |
  |<-- pong --------------------- | (every 30s heartbeat)
  |                               |
  |--- unsubscribe message ------>|
  |<-- unsubscribed confirmation--|
  |                               |
  |--- Close Connection --------->|
  |<-- Close Ack -----------------|
```

---

## Authentication

Include API key in the upgrade request headers:

### JavaScript (Browser)

```javascript
const ws = new WebSocket("ws://localhost:3000/stream");

// Note: Browser WebSocket API doesn't support custom headers directly
// Use query parameter for browser authentication:
const apiKey = "chrono_public_dev_key_001";
const ws = new WebSocket(`ws://localhost:3000/stream?api_key=${apiKey}`);
```

### Node.js (ws library)

```javascript
import WebSocket from "ws";

const ws = new WebSocket("ws://localhost:3000/stream", {
  headers: {
    Authorization: "Bearer chrono_public_dev_key_001",
  },
});
```

### Bun (native WebSocket)

```typescript
const ws = new WebSocket("ws://localhost:3000/stream", {
  headers: {
    Authorization: "Bearer chrono_public_dev_key_001",
  },
});
```

---

## Message Types

All messages are JSON objects with a `type` field.

### 1. Subscribe (Client → Server)

Subscribe to price updates for specific trading pairs.

**Format**:

```json
{
  "type": "subscribe",
  "symbols": ["BTC/USD", "ETH/USD"]
}
```

**Fields**:

- `type`: Must be `"subscribe"`
- `symbols`: Array of symbol strings (1-10 symbols)

**Response** (Server → Client):

```json
{
  "type": "subscribed",
  "symbols": ["BTC/USD", "ETH/USD"],
  "timestamp": "2025-10-10T14:30:00.000Z"
}
```

**Example**:

```javascript
ws.send(
  JSON.stringify({
    type: "subscribe",
    symbols: ["BTC/USD", "ETH/USD"],
  }),
);
```

---

### 2. Unsubscribe (Client → Server)

Unsubscribe from specific symbols or all symbols.

**Format**:

```json
{
  "type": "unsubscribe",
  "symbols": ["BTC/USD"]
}
```

**Fields**:

- `type`: Must be `"unsubscribe"`
- `symbols`: Array of symbol strings (optional - omit to unsubscribe from all)

**Response** (Server → Client):

```json
{
  "type": "unsubscribed",
  "symbols": ["BTC/USD"],
  "timestamp": "2025-10-10T14:30:05.000Z"
}
```

**Example**:

```javascript
// Unsubscribe from specific symbols
ws.send(
  JSON.stringify({
    type: "unsubscribe",
    symbols: ["BTC/USD"],
  }),
);

// Unsubscribe from all symbols
ws.send(
  JSON.stringify({
    type: "unsubscribe",
  }),
);
```

---

### 3. Price Update (Server → Client)

Real-time price update pushed when new data is ingested.

**Format**:

```json
{
  "type": "price_update",
  "symbol": "BTC/USD",
  "price": 45123.5,
  "volume": 1234567.89,
  "timestamp": "2025-10-10T14:30:00.000Z",
  "source": "coinbase"
}
```

**Fields**:

- `type`: Always `"price_update"`
- `symbol`: Trading pair symbol
- `price`: Current price
- `volume`: Trading volume (may be null)
- `timestamp`: Price timestamp (ISO 8601)
- `source`: Exchange source

**Frequency**: As data arrives (typically every 1-10 seconds per symbol)

**Example Handler**:

```javascript
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "price_update") {
    console.log(`${message.symbol}: $${message.price} from ${message.source}`);
  }
});
```

---

### 4. Ping/Pong (Heartbeat)

Keep-alive messages to detect disconnections.

**Ping** (Client → Server):

```json
{
  "type": "ping"
}
```

**Pong** (Server → Client):

```json
{
  "type": "pong",
  "timestamp": "2025-10-10T14:30:00.000Z"
}
```

**Automatic Heartbeat**: Server sends `pong` every 30 seconds automatically (no ping required).

**Manual Ping** (optional):

```javascript
// Send manual ping
ws.send(JSON.stringify({ type: "ping" }));
```

---

### 5. Error (Server → Client)

Error messages for invalid requests.

**Format**:

```json
{
  "type": "error",
  "message": "Invalid message format",
  "code": "VALIDATION_ERROR",
  "timestamp": "2025-10-10T14:30:00.000Z"
}
```

**Common Errors**:

| Code                 | Message                | Cause                            |
| -------------------- | ---------------------- | -------------------------------- |
| `VALIDATION_ERROR`   | Invalid message format | Malformed JSON or missing fields |
| `UNAUTHORIZED`       | Authentication failed  | Missing or invalid API key       |
| `SUBSCRIPTION_LIMIT` | Too many symbols       | Exceeded max symbols (10)        |
| `UNKNOWN_SYMBOL`     | Symbol not found       | Symbol doesn't exist in system   |

**Example**:

```javascript
ws.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);

  if (message.type === "error") {
    console.error(`Error: ${message.message}`);
  }
});
```

---

## Complete Example

### JavaScript Client

```javascript
const WebSocket = require("ws");

const apiKey = "chrono_public_dev_key_001";
const ws = new WebSocket("ws://localhost:3000/stream", {
  headers: {
    Authorization: `Bearer ${apiKey}`,
  },
});

ws.on("open", () => {
  console.log("✅ Connected to Project Chrono WebSocket");

  // Subscribe to Bitcoin and Ethereum
  ws.send(
    JSON.stringify({
      type: "subscribe",
      symbols: ["BTC/USD", "ETH/USD"],
    }),
  );
});

ws.on("message", (data) => {
  const message = JSON.parse(data.toString());

  switch (message.type) {
    case "subscribed":
      console.log(`📡 Subscribed to: ${message.symbols.join(", ")}`);
      break;

    case "price_update":
      console.log(
        `💰 ${message.symbol}: $${message.price.toFixed(2)} ` +
          `(${message.source}) at ${message.timestamp}`,
      );
      break;

    case "pong":
      console.log("💓 Heartbeat received");
      break;

    case "error":
      console.error(`❌ Error: ${message.message}`);
      break;

    default:
      console.log("📨 Message:", message);
  }
});

ws.on("error", (error) => {
  console.error("❌ WebSocket error:", error.message);
});

ws.on("close", () => {
  console.log("🔌 Disconnected from WebSocket");
});

// Graceful shutdown
process.on("SIGINT", () => {
  console.log("\n🛑 Closing connection...");
  ws.send(JSON.stringify({ type: "unsubscribe" }));
  setTimeout(() => ws.close(), 100);
});
```

---

### TypeScript Client

```typescript
import WebSocket from "ws";

type MessageType =
  | { type: "subscribe"; symbols: string[] }
  | { type: "unsubscribe"; symbols?: string[] }
  | { type: "ping" }
  | { type: "subscribed"; symbols: string[]; timestamp: string }
  | { type: "unsubscribed"; symbols: string[]; timestamp: string }
  | {
      type: "price_update";
      symbol: string;
      price: number;
      volume: number | null;
      timestamp: string;
      source: string;
    }
  | { type: "pong"; timestamp: string }
  | { type: "error"; message: string; code: string; timestamp: string };

class ChronoWebSocketClient {
  private ws: WebSocket;
  private apiKey: string;

  constructor(apiKey: string, url: string = "ws://localhost:3000/stream") {
    this.apiKey = apiKey;
    this.ws = new WebSocket(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.ws.on("open", () => this.onOpen());
    this.ws.on("message", (data) => this.onMessage(data));
    this.ws.on("error", (error) => this.onError(error));
    this.ws.on("close", () => this.onClose());
  }

  private onOpen() {
    console.log("✅ Connected to Project Chrono");
  }

  private onMessage(data: WebSocket.Data) {
    const message: MessageType = JSON.parse(data.toString());

    switch (message.type) {
      case "subscribed":
        console.log(`📡 Subscribed to: ${message.symbols.join(", ")}`);
        break;

      case "price_update":
        this.handlePriceUpdate(message);
        break;

      case "pong":
        console.log("💓 Heartbeat");
        break;

      case "error":
        console.error(`❌ Error: ${message.message}`);
        break;
    }
  }

  private handlePriceUpdate(
    update: Extract<MessageType, { type: "price_update" }>,
  ) {
    console.log(
      `💰 ${update.symbol}: $${update.price.toFixed(2)} from ${update.source}`,
    );
  }

  private onError(error: Error) {
    console.error("❌ WebSocket error:", error.message);
  }

  private onClose() {
    console.log("🔌 Disconnected");
  }

  subscribe(symbols: string[]) {
    this.ws.send(
      JSON.stringify({
        type: "subscribe",
        symbols,
      }),
    );
  }

  unsubscribe(symbols?: string[]) {
    this.ws.send(
      JSON.stringify({
        type: "unsubscribe",
        symbols,
      }),
    );
  }

  close() {
    this.unsubscribe();
    setTimeout(() => this.ws.close(), 100);
  }
}

// Usage
const client = new ChronoWebSocketClient("chrono_public_dev_key_001");
client.subscribe(["BTC/USD", "ETH/USD"]);

process.on("SIGINT", () => {
  client.close();
  process.exit(0);
});
```

---

### Python Client

```python
import asyncio
import websockets
import json

async def stream_prices():
    api_key = 'chrono_public_dev_key_001'
    uri = 'ws://localhost:3000/stream'

    async with websockets.connect(
        uri,
        extra_headers={'Authorization': f'Bearer {api_key}'}
    ) as websocket:
        print('✅ Connected to Project Chrono')

        # Subscribe to symbols
        await websocket.send(json.dumps({
            'type': 'subscribe',
            'symbols': ['BTC/USD', 'ETH/USD']
        }))

        # Listen for messages
        async for message in websocket:
            data = json.loads(message)

            if data['type'] == 'subscribed':
                print(f"📡 Subscribed to: {', '.join(data['symbols'])}")

            elif data['type'] == 'price_update':
                print(f"💰 {data['symbol']}: ${data['price']:.2f} from {data['source']}")

            elif data['type'] == 'pong':
                print('💓 Heartbeat')

            elif data['type'] == 'error':
                print(f"❌ Error: {data['message']}")

# Run client
asyncio.run(stream_prices())
```

---

## Connection Limits

- **Max concurrent connections per API key**: 10
- **Max subscribed symbols per connection**: 10
- **Idle timeout**: 5 minutes (no messages sent or received)
- **Max message size**: 1 MB

---

## Best Practices

### ✅ DO

- **Reconnect on disconnection** with exponential backoff
- **Handle all message types** (don't assume only price_update)
- **Validate JSON** before parsing
- **Unsubscribe gracefully** before closing
- **Monitor heartbeats** to detect connection issues

### ❌ DON'T

- **Don't subscribe to symbols you don't need**
- **Don't open multiple connections** with the same API key unnecessarily
- **Don't ignore error messages**
- **Don't send excessive pings** (server sends automatic heartbeats)

---

## Troubleshooting

### Connection upgrade fails (400 Bad Request)

**Cause**: Invalid WebSocket upgrade request

**Solution**: Ensure you're connecting to `/stream` endpoint with proper WebSocket headers

### Authentication error

**Cause**: Missing or invalid API key

**Solution**: Include `Authorization: Bearer {key}` header in upgrade request

### No price updates received

**Possible causes**:

1. Not subscribed to any symbols → Send subscribe message
2. No recent data for symbols → Check if exchanges are publishing data
3. Connection dropped → Check heartbeat messages

### Connection closes unexpectedly

**Possible causes**:

1. Idle timeout (5 minutes) → Send pings or subscribe to active symbols
2. Server restart → Implement reconnection logic
3. Rate limit exceeded → Reduce connection count

---

## Rate Limiting

WebSocket connections count towards your API key rate limit:

- **Connection establishment**: 1 request
- **Subscribe/unsubscribe messages**: 1 request each
- **Price updates received**: Do not count towards limit

---

## Next Steps

- **Authentication**: See [Authentication Guide](./authentication.md)
- **Examples**: Browse [integration examples](./examples/)
- **API Reference**: Visit [/docs](http://localhost:3000/docs)

---

_"Real-time data flows through the Khala. En Taro Tassadar!"_

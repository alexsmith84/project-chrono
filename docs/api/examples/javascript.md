# JavaScript/TypeScript Examples

Integration examples using fetch API and WebSocket.

---

## Setup

No additional dependencies required for basic usage (uses native fetch).

For WebSocket in Node.js, install `ws`:

```bash
npm install ws
# or
bun add ws
```

---

## REST API Examples

### Fetch Latest Prices

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

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.prices;
}

// Usage
const prices = await getLatestPrices(["BTC/USD", "ETH/USD"]);
console.log(prices);
```

---

### Fetch Historical Prices (OHLCV)

```javascript
async function getPriceRange(symbol, start, end, interval = "5m") {
  const params = new URLSearchParams({
    symbol,
    start: start.toISOString(),
    end: end.toISOString(),
    interval,
    limit: "100",
  });

  const url = `${BASE_URL}/prices/range?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.prices;
}

// Usage
const now = new Date();
const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

const ohlcv = await getPriceRange("BTC/USD", oneHourAgo, now, "5m");
console.log(ohlcv);
```

---

### Get Consensus Prices

```javascript
async function getConsensusPrices(symbols, timestamp = null) {
  const params = new URLSearchParams({
    symbols: symbols.join(","),
  });

  if (timestamp) {
    params.set("timestamp", timestamp.toISOString());
  }

  const url = `${BASE_URL}/aggregates/consensus?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${API_KEY}`,
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data.prices;
}

// Usage
const consensus = await getConsensusPrices(["BTC/USD", "ETH/USD"]);
console.log(consensus);
```

---

### Ingest Price Feeds (Internal API)

```javascript
const INTERNAL_API_KEY = "chrono_internal_dev_key_001";

async function ingestPriceFeeds(feeds) {
  const url = `${BASE_URL}/internal/ingest`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${INTERNAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ feeds }),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  const data = await response.json();
  return data;
}

// Usage
const result = await ingestPriceFeeds([
  {
    symbol: "BTC/USD",
    price: 45123.5,
    volume: 1234567.89,
    timestamp: new Date().toISOString(),
    source: "coinbase",
    worker_id: "worker-1",
  },
]);

console.log(`Ingested ${result.ingested} feeds`);
```

---

## WebSocket Examples

### Basic WebSocket Client

```javascript
import WebSocket from "ws"; // Node.js only

const WS_URL = "ws://localhost:3000/stream";
const API_KEY = "chrono_public_dev_key_001";

const ws = new WebSocket(WS_URL, {
  headers: {
    Authorization: `Bearer ${API_KEY}`,
  },
});

ws.on("open", () => {
  console.log("✅ Connected");

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

ws.on("error", (error) => {
  console.error("❌ WebSocket error:", error.message);
});

ws.on("close", () => {
  console.log("🔌 Disconnected");
});
```

---

### TypeScript WebSocket Client with Reconnection

```typescript
import WebSocket from "ws";

interface PriceUpdate {
  type: "price_update";
  symbol: string;
  price: number;
  volume: number | null;
  timestamp: string;
  source: string;
}

class ChronoClient {
  private ws: WebSocket | null = null;
  private apiKey: string;
  private url: string;
  private subscribedSymbols: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;

  constructor(apiKey: string, url: string = "ws://localhost:3000/stream") {
    this.apiKey = apiKey;
    this.url = url;
  }

  connect() {
    this.ws = new WebSocket(this.url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    this.ws.on("open", () => {
      console.log("✅ Connected");
      this.reconnectAttempts = 0;

      // Re-subscribe to symbols after reconnection
      if (this.subscribedSymbols.size > 0) {
        this.subscribe(Array.from(this.subscribedSymbols));
      }
    });

    this.ws.on("message", (data) => {
      this.handleMessage(JSON.parse(data.toString()));
    });

    this.ws.on("error", (error) => {
      console.error("❌ WebSocket error:", error.message);
    });

    this.ws.on("close", () => {
      console.log("🔌 Disconnected");
      this.reconnect();
    });
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case "subscribed":
        console.log(`📡 Subscribed to: ${message.symbols.join(", ")}`);
        break;

      case "price_update":
        this.onPriceUpdate(message as PriceUpdate);
        break;

      case "pong":
        console.log("💓 Heartbeat");
        break;

      case "error":
        console.error(`❌ Error: ${message.message}`);
        break;
    }
  }

  private onPriceUpdate(update: PriceUpdate) {
    console.log(
      `💰 ${update.symbol}: $${update.price.toFixed(2)} from ${update.source}`,
    );
  }

  subscribe(symbols: string[]) {
    symbols.forEach((s) => this.subscribedSymbols.add(s));

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "subscribe",
          symbols,
        }),
      );
    }
  }

  unsubscribe(symbols: string[]) {
    symbols.forEach((s) => this.subscribedSymbols.delete(s));

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(
        JSON.stringify({
          type: "unsubscribe",
          symbols,
        }),
      );
    }
  }

  private reconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("❌ Max reconnection attempts reached");
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

    console.log(
      `🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`,
    );

    setTimeout(() => this.connect(), delay);
  }

  close() {
    this.maxReconnectAttempts = 0; // Prevent reconnection
    this.ws?.close();
  }
}

// Usage
const client = new ChronoClient("chrono_public_dev_key_001");
client.connect();
client.subscribe(["BTC/USD", "ETH/USD"]);

process.on("SIGINT", () => {
  client.close();
  process.exit(0);
});
```

---

### React Hook for Real-Time Prices

```typescript
import { useState, useEffect, useRef } from 'react';

interface PriceData {
  symbol: string;
  price: number;
  timestamp: string;
  source: string;
}

export function useRealtimePrices(symbols: string[]) {
  const [prices, setPrices] = useState<Map<string, PriceData>>(new Map());
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000/stream', {
      headers: {
        'Authorization': 'Bearer chrono_public_dev_key_001'
      }
    });

    ws.onopen = () => {
      setConnected(true);
      ws.send(JSON.stringify({
        type: 'subscribe',
        symbols
      }));
    };

    ws.onmessage = (event) => {
      const message = JSON.parse(event.data);

      if (message.type === 'price_update') {
        setPrices(prev => new Map(prev).set(message.symbol, {
          symbol: message.symbol,
          price: message.price,
          timestamp: message.timestamp,
          source: message.source
        }));
      }
    };

    ws.onclose = () => {
      setConnected(false);
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [symbols.join(',')]);

  return { prices, connected };
}

// Usage in component
function PriceDisplay() {
  const { prices, connected } = useRealtimePrices(['BTC/USD', 'ETH/USD']);

  return (
    <div>
      <p>Status: {connected ? '✅ Connected' : '🔌 Disconnected'}</p>
      {Array.from(prices.values()).map(price => (
        <div key={price.symbol}>
          {price.symbol}: ${price.price.toFixed(2)}
          <small> ({price.source})</small>
        </div>
      ))}
    </div>
  );
}
```

---

## Error Handling

```javascript
async function safelyFetchPrices(symbols) {
  try {
    const url = `${BASE_URL}/prices/latest?symbols=${symbols.join(",")}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    if (!response.ok) {
      const error = await response.json();
      console.error(`API Error: ${error.error?.message}`);
      return null;
    }

    const data = await response.json();
    return data.prices;
  } catch (error) {
    console.error("Network error:", error.message);
    return null;
  }
}
```

---

_"The code is clean. The data flows. En Taro Tassadar!"_

# Python Examples

Integration examples using requests and websockets libraries.

---

## Setup

Install required packages:

```bash
pip install requests websockets
```

---

## REST API Examples

### Fetch Latest Prices

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

# Usage
prices = get_latest_prices(['BTC/USD', 'ETH/USD'])
for price in prices:
    print(f"{price['symbol']}: ${price['price']:.2f}")
```

---

### Fetch Historical Prices (OHLCV)

```python
from datetime import datetime, timedelta

def get_price_range(symbol, start, end, interval='5m', limit=100):
    url = f'{BASE_URL}/prices/range'
    params = {
        'symbol': symbol,
        'start': start.isoformat() + 'Z',
        'end': end.isoformat() + 'Z',
        'interval': interval,
        'limit': limit
    }
    headers = {'Authorization': f'Bearer {API_KEY}'}

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()

    return response.json()['prices']

# Usage
now = datetime.utcnow()
one_hour_ago = now - timedelta(hours=1)

candles = get_price_range('BTC/USD', one_hour_ago, now, interval='5m')
for candle in candles:
    print(f"Open: ${candle['open']:.2f}, Close: ${candle['close']:.2f}")
```

---

### Get Consensus Prices

```python
def get_consensus_prices(symbols, timestamp=None):
    url = f'{BASE_URL}/aggregates/consensus'
    params = {'symbols': ','.join(symbols)}

    if timestamp:
        params['timestamp'] = timestamp.isoformat() + 'Z'

    headers = {'Authorization': f'Bearer {API_KEY}'}

    response = requests.get(url, params=params, headers=headers)
    response.raise_for_status()

    return response.json()['prices']

# Usage
consensus = get_consensus_prices(['BTC/USD', 'ETH/USD'])
for price in consensus:
    print(f"{price['symbol']}: ${price['consensus_price']:.2f} "
          f"(confidence: {price['confidence']:.2%})")
```

---

### Ingest Price Feeds (Internal API)

```python
INTERNAL_API_KEY = 'chrono_internal_dev_key_001'

def ingest_price_feeds(feeds):
    url = f'{BASE_URL}/internal/ingest'
    headers = {
        'Authorization': f'Bearer {INTERNAL_API_KEY}',
        'Content-Type': 'application/json'
    }
    data = {'feeds': feeds}

    response = requests.post(url, json=data, headers=headers)
    response.raise_for_status()

    return response.json()

# Usage
result = ingest_price_feeds([
    {
        'symbol': 'BTC/USD',
        'price': 45123.50,
        'volume': 1234567.89,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'source': 'coinbase',
        'worker_id': 'worker-1'
    }
])

print(f"Ingested {result['ingested']} feeds")
```

---

## WebSocket Examples

### Basic WebSocket Client

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

            elif data['type'] == 'error':
                print(f"❌ Error: {data['message']}")

# Run client
asyncio.run(stream_prices())
```

---

### WebSocket Client with Reconnection

```python
import asyncio
import websockets
import json
from typing import Set, Callable

class ChronoClient:
    def __init__(self, api_key: str, url: str = 'ws://localhost:3000/stream'):
        self.api_key = api_key
        self.url = url
        self.subscribed_symbols: Set[str] = set()
        self.reconnect_attempts = 0
        self.max_reconnect_attempts = 5
        self.on_price_update: Callable = None

    async def connect(self):
        while self.reconnect_attempts < self.max_reconnect_attempts:
            try:
                async with websockets.connect(
                    self.url,
                    extra_headers={'Authorization': f'Bearer {self.api_key}'}
                ) as websocket:
                    print('✅ Connected')
                    self.reconnect_attempts = 0

                    # Re-subscribe to symbols
                    if self.subscribed_symbols:
                        await self.subscribe(websocket, list(self.subscribed_symbols))

                    # Listen for messages
                    async for message in websocket:
                        await self.handle_message(json.loads(message))

            except websockets.exceptions.ConnectionClosed:
                print('🔌 Disconnected')
                await self.reconnect()

            except Exception as e:
                print(f'❌ Error: {e}')
                await self.reconnect()

    async def handle_message(self, message: dict):
        if message['type'] == 'subscribed':
            print(f"📡 Subscribed to: {', '.join(message['symbols'])}")

        elif message['type'] == 'price_update':
            if self.on_price_update:
                self.on_price_update(message)
            else:
                print(f"💰 {message['symbol']}: ${message['price']:.2f}")

        elif message['type'] == 'pong':
            print('💓 Heartbeat')

        elif message['type'] == 'error':
            print(f"❌ Error: {message['message']}")

    async def subscribe(self, websocket, symbols: list):
        self.subscribed_symbols.update(symbols)
        await websocket.send(json.dumps({
            'type': 'subscribe',
            'symbols': symbols
        }))

    async def reconnect(self):
        self.reconnect_attempts += 1
        delay = min(2 ** self.reconnect_attempts, 30)
        print(f'🔄 Reconnecting in {delay}s (attempt {self.reconnect_attempts}/{self.max_reconnect_attempts})')
        await asyncio.sleep(delay)

# Usage
async def main():
    client = ChronoClient('chrono_public_dev_key_001')

    # Custom price update handler
    def handle_price(update):
        print(f"📊 {update['symbol']}: ${update['price']:.2f} from {update['source']}")

    client.on_price_update = handle_price

    # Connect and subscribe
    await client.connect()

asyncio.run(main())
```

---

### Price Monitor with Database Storage

```python
import asyncio
import websockets
import json
from datetime import datetime
import sqlite3

class PriceMonitor:
    def __init__(self, api_key: str, db_path: str = 'prices.db'):
        self.api_key = api_key
        self.db_path = db_path
        self.setup_database()

    def setup_database(self):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS prices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                price REAL NOT NULL,
                source TEXT NOT NULL,
                timestamp TEXT NOT NULL,
                received_at TEXT NOT NULL
            )
        ''')
        conn.commit()
        conn.close()

    def store_price(self, update: dict):
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO prices (symbol, price, source, timestamp, received_at) VALUES (?, ?, ?, ?, ?)',
            (
                update['symbol'],
                update['price'],
                update['source'],
                update['timestamp'],
                datetime.utcnow().isoformat()
            )
        )
        conn.commit()
        conn.close()

    async def monitor(self, symbols: list):
        uri = 'ws://localhost:3000/stream'

        async with websockets.connect(
            uri,
            extra_headers={'Authorization': f'Bearer {self.api_key}'}
        ) as websocket:
            print(f'✅ Monitoring {len(symbols)} symbols')

            await websocket.send(json.dumps({
                'type': 'subscribe',
                'symbols': symbols
            }))

            async for message in websocket:
                data = json.loads(message)

                if data['type'] == 'price_update':
                    self.store_price(data)
                    print(f"💾 Stored: {data['symbol']} = ${data['price']:.2f}")

# Usage
async def main():
    monitor = PriceMonitor('chrono_public_dev_key_001')
    await monitor.monitor(['BTC/USD', 'ETH/USD', 'XRP/USD'])

asyncio.run(main())
```

---

## Error Handling

```python
import requests
from requests.exceptions import RequestException

def safely_fetch_prices(symbols):
    try:
        url = f'{BASE_URL}/prices/latest'
        params = {'symbols': ','.join(symbols)}
        headers = {'Authorization': f'Bearer {API_KEY}'}

        response = requests.get(url, params=params, headers=headers, timeout=5)
        response.raise_for_status()

        return response.json()['prices']

    except requests.exceptions.HTTPError as e:
        if e.response.status_code == 401:
            print('❌ Authentication failed')
        elif e.response.status_code == 403:
            print('❌ Insufficient permissions')
        elif e.response.status_code == 429:
            print('❌ Rate limit exceeded')
        else:
            print(f'❌ HTTP error: {e.response.status_code}')
        return None

    except requests.exceptions.Timeout:
        print('❌ Request timed out')
        return None

    except requests.exceptions.ConnectionError:
        print('❌ Connection error')
        return None

    except Exception as e:
        print(f'❌ Unexpected error: {e}')
        return None
```

---

## Complete Example: Price Tracker CLI

```python
#!/usr/bin/env python3
import asyncio
import websockets
import json
import argparse
from datetime import datetime

class PriceTracker:
    def __init__(self, api_key: str, symbols: list):
        self.api_key = api_key
        self.symbols = symbols
        self.prices = {}

    async def track(self):
        uri = 'ws://localhost:3000/stream'

        try:
            async with websockets.connect(
                uri,
                extra_headers={'Authorization': f'Bearer {self.api_key}'}
            ) as websocket:
                print(f'📡 Tracking: {", ".join(self.symbols)}')
                print('Press Ctrl+C to exit\n')

                await websocket.send(json.dumps({
                    'type': 'subscribe',
                    'symbols': self.symbols
                }))

                async for message in websocket:
                    data = json.loads(message)

                    if data['type'] == 'price_update':
                        self.prices[data['symbol']] = data['price']
                        self.display_prices()

        except KeyboardInterrupt:
            print('\n👋 Goodbye!')

    def display_prices(self):
        print('\033[2J\033[H')  # Clear screen
        print(f'📊 Project Chrono Price Tracker - {datetime.now().strftime("%H:%M:%S")}\n')
        for symbol in self.symbols:
            price = self.prices.get(symbol, 'Waiting...')
            if isinstance(price, float):
                print(f'{symbol:12} ${price:>12,.2f}')
            else:
                print(f'{symbol:12} {price:>12}')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Track cryptocurrency prices in real-time')
    parser.add_argument('symbols', nargs='+', help='Trading pair symbols (e.g., BTC/USD ETH/USD)')
    parser.add_argument('--api-key', default='chrono_public_dev_key_001', help='API key')

    args = parser.parse_args()

    tracker = PriceTracker(args.api_key, args.symbols)
    asyncio.run(tracker.track())
```

Save as `price_tracker.py` and run:

```bash
python price_tracker.py BTC/USD ETH/USD XRP/USD
```

---

_"Python provides. The data flows. En Taro Tassadar!"_

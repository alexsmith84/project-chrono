/**
 * Kraken Exchange Adapter
 * WebSocket API: wss://ws.kraken.com
 * Documentation: https://docs.kraken.com/websockets/
 */

import type { ExchangeAdapter, ExchangeMessage, PriceFeed } from '../types/index';

/**
 * Kraken WebSocket message format (array-based)
 * Ticker messages: [channelID, tickerData, "ticker", "XBT/USD"]
 */
type KrakenTickerMessage = [
  number | string,  // Channel ID
  KrakenTickerData, // Ticker data
  string,           // Channel name ("ticker")
  string            // Pair ("XBT/USD")
];

/**
 * Kraken ticker data structure
 */
interface KrakenTickerData {
  a: [string, number, string];  // Ask [price, whole lot volume, lot volume]
  b: [string, number, string];  // Bid [price, whole lot volume, lot volume]
  c: [string, string];          // Last trade closed [price, lot volume]
  v: [string, string];          // Volume [today, last 24 hours]
  p: [string, string];          // Volume weighted average price [today, last 24 hours]
  t: [number, number];          // Number of trades [today, last 24 hours]
  l: [string, string];          // Low [today, last 24 hours]
  h: [string, string];          // High [today, last 24 hours]
  o: [string, string];          // Open [today, last 24 hours]
}

/**
 * Kraken subscription confirmation
 */
interface KrakenSubscription {
  event?: string;
  status?: string;
  channelID?: number;
  channelName?: string;
  pair?: string;
  subscription?: {
    name: string;
  };
}

/**
 * Adapter for Kraken exchange
 *
 * Features:
 * - Array-based message format
 * - Symbol format: XBT/USD (uses XBT instead of BTC)
 * - Ticker channel subscription
 * - Comprehensive 24h statistics
 */
export class KrakenAdapter implements ExchangeAdapter {
  name = 'kraken';
  wsUrl = 'wss://ws.kraken.com';

  constructor(
    public symbols: string[],
    public workerId: string
  ) {}

  /**
   * Generate subscription message for Kraken ticker channel
   *
   * Format:
   * {
   *   "event": "subscribe",
   *   "pair": ["XBT/USD", "ETH/USD"],
   *   "subscription": { "name": "ticker" }
   * }
   *
   * Note: Kraken uses "XBT" for Bitcoin, not "BTC"
   */
  getSubscribeMessage(): string {
    // Convert symbols to Kraken format (BTC/USD → XBT/USD)
    const pairs = this.symbols.map(symbol => {
      // Kraken uses XBT instead of BTC
      return symbol === 'BTC/USD' ? 'XBT/USD' : symbol;
    });

    return JSON.stringify({
      event: 'subscribe',
      pair: pairs,
      subscription: {
        name: 'ticker'
      }
    });
  }

  /**
   * Parse Kraken ticker message to normalized PriceFeed
   *
   * Kraken sends messages in multiple formats:
   * 1. Object format for events (subscription, heartbeat, etc.)
   * 2. Array format for ticker data: [channelID, data, "ticker", "XBT/USD"]
   *
   * We only process the array format ticker messages
   */
  parseMessage(msg: ExchangeMessage): PriceFeed | null {
    // Check if it's an array (ticker data)
    if (!Array.isArray(msg)) {
      // It might be a subscription confirmation or other event
      const event = msg as KrakenSubscription;
      if (event.event === 'subscriptionStatus') {
        // Log subscription status but return null (not a price feed)
        return null;
      }
      return null;
    }

    // Ensure it's a ticker message with correct structure
    if (msg.length !== 4 || msg[2] !== 'ticker') {
      return null;
    }

    const [channelId, data, channelName, pair] = msg as KrakenTickerMessage;

    // Ensure required fields are present
    if (!data || !pair) {
      return null;
    }

    // Normalize symbol (XBT/USD → BTC/USD)
    const symbol = this.normalizeSymbol(pair);

    // Parse price (last trade closed price)
    const price = parseFloat(data.c[0]);
    if (isNaN(price)) {
      return null;
    }

    // Parse volume (last 24 hours)
    const volume = data.v[1] ? parseFloat(data.v[1]) : undefined;

    // Create normalized price feed
    return {
      symbol,
      price,
      volume,
      timestamp: new Date().toISOString(), // Kraken doesn't provide timestamp in ticker
      source: this.name,
      worker_id: this.workerId,
      metadata: {
        channel_id: channelId,
        ask: data.a[0],
        bid: data.b[0],
        high_24h: data.h[1],
        low_24h: data.l[1],
        vwap_24h: data.p[1],
        trades_24h: data.t[1],
        open_today: data.o[0]
      }
    };
  }

  /**
   * Normalize Kraken symbol to standard format
   * XBT/USD → BTC/USD
   *
   * Kraken uses "XBT" as the ticker for Bitcoin
   * We normalize it to "BTC" for consistency
   */
  normalizeSymbol(symbol: string): string {
    return symbol.replace('XBT/', 'BTC/');
  }
}

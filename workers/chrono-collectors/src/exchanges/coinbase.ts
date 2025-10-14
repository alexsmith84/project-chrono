/**
 * Coinbase Exchange Adapter
 * WebSocket API: wss://ws-feed.exchange.coinbase.com
 * Documentation: https://docs.cloud.coinbase.com/exchange/docs/websocket-overview
 */

import type { ExchangeAdapter, ExchangeMessage, PriceFeed } from '../types/index';

/**
 * Coinbase WebSocket message format
 */
interface CoinbaseTickerMessage {
  type: string;
  sequence?: number;
  product_id?: string;
  price?: string;
  open_24h?: string;
  volume_24h?: string;
  low_24h?: string;
  high_24h?: string;
  volume_30d?: string;
  best_bid?: string;
  best_ask?: string;
  side?: string;
  time?: string;
  trade_id?: number;
  last_size?: string;
}

/**
 * Adapter for Coinbase exchange
 *
 * Features:
 * - Ticker channel subscription
 * - Symbol format: BTC-USD (with hyphen)
 * - Real-time price updates
 * - 24h volume data
 */
export class CoinbaseAdapter implements ExchangeAdapter {
  name = 'coinbase';
  wsUrl = 'wss://ws-feed.exchange.coinbase.com';

  constructor(
    public symbols: string[],
    public workerId: string
  ) {}

  /**
   * Generate subscription message for Coinbase ticker channel
   *
   * Format:
   * {
   *   "type": "subscribe",
   *   "product_ids": ["BTC-USD", "ETH-USD"],
   *   "channels": ["ticker"]
   * }
   */
  getSubscribeMessage(): string {
    // Convert symbols from standard format (BTC/USD) to Coinbase format (BTC-USD)
    const productIds = this.symbols.map(symbol => symbol.replace('/', '-'));

    return JSON.stringify({
      type: 'subscribe',
      product_ids: productIds,
      channels: ['ticker']
    });
  }

  /**
   * Parse Coinbase ticker message to normalized PriceFeed
   *
   * Coinbase sends various message types:
   * - "subscriptions": Subscription confirmation (ignore)
   * - "ticker": Price update (parse)
   * - "error": Error message (ignore, will be logged by WebSocketManager)
   *
   * Returns null for non-ticker messages
   */
  parseMessage(msg: ExchangeMessage): PriceFeed | null {
    // Ignore array messages (not from Coinbase)
    if (Array.isArray(msg)) {
      return null;
    }

    const data = msg as unknown as CoinbaseTickerMessage;

    // Only process ticker messages
    if (data.type !== 'ticker') {
      return null;
    }

    // Ensure required fields are present
    if (!data.product_id || !data.price || !data.time) {
      return null;
    }

    // Normalize symbol (BTC-USD → BTC/USD)
    const symbol = this.normalizeSymbol(data.product_id);

    // Parse price
    const price = parseFloat(data.price);
    if (isNaN(price)) {
      return null;
    }

    // Parse volume (optional)
    const volume = data.volume_24h ? parseFloat(data.volume_24h) : undefined;

    // Create normalized price feed
    return {
      symbol,
      price,
      volume,
      timestamp: new Date(data.time).toISOString(),
      source: this.name,
      worker_id: this.workerId,
      metadata: {
        sequence: data.sequence,
        trade_id: data.trade_id,
        best_bid: data.best_bid,
        best_ask: data.best_ask
      }
    };
  }

  /**
   * Normalize Coinbase symbol to standard format
   * BTC-USD → BTC/USD
   */
  normalizeSymbol(symbol: string): string {
    return symbol.replace('-', '/');
  }
}

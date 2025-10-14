/**
 * Binance Exchange Adapter
 * WebSocket API: wss://stream.binance.com:9443/stream
 * Documentation: https://binance-docs.github.io/apidocs/spot/en/#websocket-market-streams
 */

import type { ExchangeAdapter, ExchangeMessage, PriceFeed } from '../types/index';

/**
 * Binance WebSocket stream format
 * Messages are wrapped in a data object
 */
interface BinanceStreamMessage {
  stream?: string;
  data?: BinanceTickerData;
}

/**
 * Binance 24hr ticker data
 */
interface BinanceTickerData {
  e: string;        // Event type (24hrTicker)
  E: number;        // Event time
  s: string;        // Symbol (BTCUSDT)
  p: string;        // Price change
  P: string;        // Price change percent
  w: string;        // Weighted average price
  x: string;        // First trade(F)-1 price (first trade before the 24hr rolling window)
  c: string;        // Last price
  Q: string;        // Last quantity
  b: string;        // Best bid price
  B: string;        // Best bid quantity
  a: string;        // Best ask price
  A: string;        // Best ask quantity
  o: string;        // Open price
  h: string;        // High price
  l: string;        // Low price
  v: string;        // Total traded base asset volume
  q: string;        // Total traded quote asset volume
  O: number;        // Statistics open time
  C: number;        // Statistics close time
  F: number;        // First trade ID
  L: number;        // Last trade Id
  n: number;        // Total number of trades
}

/**
 * Adapter for Binance exchange
 *
 * Features:
 * - Stream-based WebSocket API (streams in URL)
 * - Symbol format: BTCUSDT (no separator)
 * - 24hr ticker statistics
 * - High-frequency updates
 */
export class BinanceAdapter implements ExchangeAdapter {
  name = 'binance';
  wsUrl: string;

  /**
   * Binance uses streams in the URL path
   * Example: wss://stream.binance.com:9443/ws/btcusdt@ticker
   * For multiple streams: use individual WebSocket connections or combined stream endpoint
   */
  constructor(
    public symbols: string[],
    public workerId: string
  ) {
    // For simplicity, use the first symbol only in PoC
    // In production, you'd want to handle multiple streams properly
    const firstSymbol = this.toStreamName(symbols[0]);
    this.wsUrl = `wss://stream.binance.com:9443/ws/${firstSymbol}`;
  }

  /**
   * Convert normalized symbol to Binance stream name
   * BTC/USD → btcusdt@miniTicker (updates every second, faster than @ticker)
   */
  private toStreamName(symbol: string): string {
    // Convert USD to USDT (Binance uses Tether, not USD)
    const binanceSymbol = symbol.replace('/USD', 'USDT').replace('/', '').toLowerCase();
    // Use miniTicker for real-time updates (1 second vs 24hr ticker which updates less frequently)
    return `${binanceSymbol}@miniTicker`;
  }

  /**
   * Get subscription message for Binance
   *
   * Note: Binance stream API doesn't require a subscription message
   * Streams are specified in the URL, so this returns an empty message
   * The WebSocketManager will still call this, but we don't need to send anything
   */
  getSubscribeMessage(): string {
    // Binance streams are URL-based, no subscription message needed
    return '';
  }

  /**
   * Parse Binance ticker message to normalized PriceFeed
   *
   * Single stream format (/ws/): ticker data sent directly
   * Combined stream format (/stream?streams=): wrapped in {stream, data}
   *
   * This adapter uses single stream, so data is direct
   */
  parseMessage(msg: ExchangeMessage): PriceFeed | null {
    // Ignore array messages (not from Binance)
    if (Array.isArray(msg)) {
      return null;
    }

    // Try to parse as direct ticker data first (single stream format)
    let data: BinanceTickerData;

    const rawMsg = msg as any;

    // Check if this is a wrapped message (combined streams) or direct (single stream)
    if (rawMsg.data && typeof rawMsg.data === 'object') {
      // Combined stream format: {stream: "...", data: {...}}
      data = rawMsg.data as BinanceTickerData;
    } else if (rawMsg.e) {
      // Single stream format: ticker data directly
      data = rawMsg as BinanceTickerData;
    } else {
      // Unknown format
      return null;
    }

    // Process both 24hrTicker and miniTicker events
    if (data.e !== '24hrTicker' && data.e !== '24hrMiniTicker') {
      return null;
    }

    // Ensure required fields are present
    if (!data.s || !data.c || !data.E) {
      return null;
    }

    // Normalize symbol (BTCUSDT → BTC/USD)
    const symbol = this.normalizeSymbol(data.s);

    // Parse price (last price)
    const price = parseFloat(data.c);
    if (isNaN(price)) {
      return null;
    }

    // Parse volume (total traded base asset volume)
    const volume = data.v ? parseFloat(data.v) : undefined;

    // Create normalized price feed
    return {
      symbol,
      price,
      volume,
      timestamp: new Date(data.E).toISOString(),
      source: this.name,
      worker_id: this.workerId,
      metadata: {
        price_change: data.p,
        price_change_percent: data.P,
        weighted_avg_price: data.w,
        high_price: data.h,
        low_price: data.l,
        best_bid: data.b,
        best_ask: data.a,
        trades_count: data.n
      }
    };
  }

  /**
   * Normalize Binance symbol to standard format
   * BTCUSDT → BTC/USD
   * ETHUSDT → ETH/USD
   *
   * Note: This assumes all symbols are paired with USDT
   * For other quote assets, additional logic would be needed
   */
  normalizeSymbol(symbol: string): string {
    // Remove USDT suffix and add slash
    return symbol.replace(/USDT$/, '/USD');
  }
}

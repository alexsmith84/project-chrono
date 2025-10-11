/**
 * WebSocket connection manager with auto-reconnection
 * Handles connection lifecycle, message parsing, and exponential backoff
 */

import type { ExchangeAdapter, ConnectionState, ExchangeMessage } from '../types/index';
import { Logger } from './logger';

/**
 * Manages WebSocket connection to an exchange
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Message parsing via exchange adapter
 * - Connection state tracking
 * - Error handling and logging
 */
export class WebSocketManager {
  private ws: WebSocket | null = null;
  private state: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number;
  private startTime: number = Date.now();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private adapter: ExchangeAdapter,
    private logger: Logger,
    private onPriceFeed: (feed: any) => void,
    maxReconnectAttempts: number = 10
  ) {
    this.maxReconnectAttempts = maxReconnectAttempts;
  }

  /**
   * Connect to the exchange WebSocket
   * Automatically subscribes to configured symbols
   */
  async connect(): Promise<void> {
    if (this.state === 'connected' || this.state === 'connecting') {
      this.logger.warn('Already connected or connecting');
      return;
    }

    this.setState('connecting');
    this.logger.info('Connecting to exchange', {
      exchange: this.adapter.name,
      url: this.adapter.wsUrl,
      symbols: this.adapter.symbols
    });

    try {
      this.ws = new WebSocket(this.adapter.wsUrl);

      this.ws.addEventListener('open', () => this.handleOpen());
      this.ws.addEventListener('message', (event) => this.handleMessage(event));
      this.ws.addEventListener('close', (event) => this.handleClose(event));
      this.ws.addEventListener('error', (event) => this.handleError(event));
    } catch (error) {
      this.logger.error('Failed to create WebSocket', { error: String(error) });
      this.setState('failed');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from the exchange WebSocket
   */
  disconnect(): void {
    this.logger.info('Disconnecting from exchange', { exchange: this.adapter.name });

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState('disconnected');
  }

  /**
   * Handle WebSocket open event
   * Sends subscription message to exchange
   */
  private handleOpen(): void {
    this.setState('connected');
    this.reconnectAttempts = 0; // Reset on successful connection

    this.logger.info('WebSocket connected', { exchange: this.adapter.name });

    // Send subscription message
    try {
      const subscribeMsg = this.adapter.getSubscribeMessage();
      this.ws?.send(subscribeMsg);

      this.logger.debug('Sent subscription message', {
        exchange: this.adapter.name,
        message: subscribeMsg
      });
    } catch (error) {
      this.logger.error('Failed to send subscription message', {
        error: String(error)
      });
    }
  }

  /**
   * Handle incoming WebSocket message
   * Parses message using exchange adapter and calls onPriceFeed callback
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message: ExchangeMessage = JSON.parse(event.data);

      // Try to parse as a price feed
      const feed = this.adapter.parseMessage(message);

      if (feed) {
        this.logger.debug('Parsed price feed', {
          symbol: feed.symbol,
          price: feed.price,
          source: feed.source
        });

        this.onPriceFeed(feed);
      } else {
        // Not all messages are price feeds (e.g., subscription confirmations)
        this.logger.debug('Received non-feed message', { message });
      }
    } catch (error) {
      this.logger.error('Failed to parse message', {
        error: String(error),
        data: event.data
      });
    }
  }

  /**
   * Handle WebSocket close event
   * Schedules reconnection if not explicitly disconnected
   */
  private handleClose(event: CloseEvent): void {
    this.logger.warn('WebSocket closed', {
      exchange: this.adapter.name,
      code: event.code,
      reason: event.reason,
      was_clean: event.wasClean
    });

    this.ws = null;

    // Only reconnect if we didn't explicitly disconnect
    if (this.state !== 'disconnected') {
      this.setState('reconnecting');
      this.scheduleReconnect();
    }
  }

  /**
   * Handle WebSocket error event
   */
  private handleError(event: Event): void {
    this.logger.error('WebSocket error', {
      exchange: this.adapter.name,
      event: String(event)
    });

    this.setState('failed');
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   * Backoff formula: min(1000 * 2^(attempts-1), 60000)
   * Results in: 1s, 2s, 4s, 8s, 16s, 32s, 60s, 60s, ...
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.logger.error('Max reconnection attempts reached, giving up', {
        attempts: this.reconnectAttempts,
        max_attempts: this.maxReconnectAttempts
      });
      this.setState('failed');
      return;
    }

    this.reconnectAttempts++;

    // Exponential backoff with max delay of 60 seconds
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts - 1), 60000);

    this.logger.info('Scheduling reconnection', {
      attempt: this.reconnectAttempts,
      max_attempts: this.maxReconnectAttempts,
      delay_ms: delay
    });

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Update connection state and log
   */
  private setState(state: ConnectionState): void {
    const oldState = this.state;
    this.state = state;

    if (oldState !== state) {
      this.logger.info('Connection state changed', {
        from: oldState,
        to: state,
        exchange: this.adapter.name
      });
    }
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Get statistics about the connection
   */
  getStats() {
    return {
      state: this.state,
      reconnect_attempts: this.reconnectAttempts,
      uptime_seconds: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }
}

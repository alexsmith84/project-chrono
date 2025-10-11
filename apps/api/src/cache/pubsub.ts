/**
 * Redis pub/sub for WebSocket broadcasting
 * Enables horizontal scaling of WebSocket servers
 */

import { redisPubSub, redisPublisher } from './redis';
import { logger } from '../utils/logger';
import type { PriceFeed } from '../db/types';

/**
 * Pub/sub channel patterns
 */
export const PubSubChannels = {
  priceUpdate: (symbol: string) => `price_updates:${symbol}`,
  priceUpdateAll: () => `price_updates:all`,
} as const;

/**
 * Price update message format
 */
export interface PriceUpdateMessage {
  type: 'price_update';
  data: {
    symbol: string;
    price: string;
    volume: string | null;
    source: string;
    timestamp: string; // ISO 8601 string
    metadata?: Record<string, unknown>;
  };
}

/**
 * Publish price update to all subscribers
 * Broadcasts to both symbol-specific and global channels
 */
export async function publishPriceUpdate(price: PriceFeed): Promise<void> {
  try {
    const message: PriceUpdateMessage = {
      type: 'price_update',
      data: {
        symbol: price.symbol,
        price: price.price,
        volume: price.volume,
        source: price.source,
        timestamp: price.timestamp.toISOString(),
        metadata: price.metadata || undefined,
      },
    };

    const messageStr = JSON.stringify(message);

    // Publish to symbol-specific channel
    const symbolChannel = PubSubChannels.priceUpdate(price.symbol);
    await redisPublisher.publish(symbolChannel, messageStr);

    // Publish to global channel
    const globalChannel = PubSubChannels.priceUpdateAll();
    await redisPublisher.publish(globalChannel, messageStr);

    logger.debug(
      { symbol: price.symbol, channel: symbolChannel },
      'Published price update'
    );
  } catch (error) {
    logger.error(
      { err: error, symbol: price.symbol },
      'Failed to publish price update'
    );
  }
}

/**
 * Publish multiple price updates in batch
 */
export async function publishPriceUpdates(prices: PriceFeed[]): Promise<void> {
  try {
    const promises = prices.map((price) => publishPriceUpdate(price));
    await Promise.all(promises);

    logger.debug({ count: prices.length }, 'Published batch price updates');
  } catch (error) {
    logger.error({ err: error, count: prices.length }, 'Failed to publish batch price updates');
  }
}

/**
 * Subscribe to price updates for specific symbols
 * Returns unsubscribe function
 */
export async function subscribeToPriceUpdates(
  symbols: string[],
  callback: (message: PriceUpdateMessage) => void
): Promise<() => void> {
  const channels = symbols.map((symbol) => PubSubChannels.priceUpdate(symbol));

  // Subscribe to all channels
  await redisPubSub.subscribe(...channels);

  // Set up message handler
  const messageHandler = (channel: string, message: string) => {
    try {
      const parsed = JSON.parse(message) as PriceUpdateMessage;
      callback(parsed);
    } catch (error) {
      logger.error({ err: error, channel, message }, 'Failed to parse pub/sub message');
    }
  };

  redisPubSub.on('message', messageHandler);

  logger.info({ symbols, channels }, 'Subscribed to price updates');

  // Return unsubscribe function
  return async () => {
    redisPubSub.off('message', messageHandler);
    await redisPubSub.unsubscribe(...channels);
    logger.info({ symbols, channels }, 'Unsubscribed from price updates');
  };
}

/**
 * Subscribe to all price updates
 * Returns unsubscribe function
 */
export async function subscribeToAllPriceUpdates(
  callback: (message: PriceUpdateMessage) => void
): Promise<() => void> {
  const channel = PubSubChannels.priceUpdateAll();

  await redisPubSub.subscribe(channel);

  const messageHandler = (ch: string, message: string) => {
    if (ch !== channel) return;

    try {
      const parsed = JSON.parse(message) as PriceUpdateMessage;
      callback(parsed);
    } catch (error) {
      logger.error({ err: error, channel, message }, 'Failed to parse pub/sub message');
    }
  };

  redisPubSub.on('message', messageHandler);

  logger.info({ channel }, 'Subscribed to all price updates');

  return async () => {
    redisPubSub.off('message', messageHandler);
    await redisPubSub.unsubscribe(channel);
    logger.info({ channel }, 'Unsubscribed from all price updates');
  };
}

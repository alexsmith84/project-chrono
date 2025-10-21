/**
 * Redis pub/sub for WebSocket broadcasting
 * Enables horizontal scaling of WebSocket servers
 */

import { redisPubSub, redisPublisher } from "./redis";
import { logger } from "../utils/logger";
import type { PriceFeed } from "../db/types";

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
  type: "price_update";
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
      type: "price_update",
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

    logger.info(
      { symbol: price.symbol, channel: symbolChannel, source: price.source },
      "Published price update to Redis",
    );
  } catch (error) {
    logger.error(
      { err: error, symbol: price.symbol },
      "Failed to publish price update",
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

    logger.info(
      { count: prices.length },
      "Published batch price updates to Redis",
    );
  } catch (error) {
    logger.error(
      { err: error, count: prices.length },
      "Failed to publish batch price updates",
    );
  }
}

/**
 * Subscribe to price updates for specific symbols
 * Returns unsubscribe function
 */
export async function subscribeToPriceUpdates(
  symbols: string[],
  callback: (message: PriceUpdateMessage) => void,
): Promise<() => void> {
  const channels = symbols.map((symbol) => PubSubChannels.priceUpdate(symbol));

  // Bun's RedisClient subscribe pattern: callback is passed directly to subscribe
  // We need to subscribe to each channel individually
  const messageHandler = (message: string, channel: string) => {
    logger.debug(
      { channel, message_preview: message.substring(0, 100) },
      "🔔 Received message from Redis pub/sub"
    );
    try {
      const parsed = JSON.parse(message) as PriceUpdateMessage;
      logger.debug(
        { channel, symbol: parsed.data.symbol },
        "✅ Parsed message, calling callback"
      );
      callback(parsed);
      logger.debug(
        { channel, symbol: parsed.data.symbol },
        "✅ Callback completed"
      );
    } catch (error) {
      logger.error(
        { err: error, channel, message },
        "Failed to parse pub/sub message",
      );
    }
  };

  // Subscribe to all channels (Bun's subscribe accepts callback directly)
  for (const channel of channels) {
    await redisPubSub.subscribe(channel, messageHandler);
  }

  logger.info({ symbols, channels }, "Subscribed to price updates");

  // Return unsubscribe function
  return async () => {
    for (const channel of channels) {
      await redisPubSub.unsubscribe(channel);
    }
    logger.info({ symbols, channels }, "Unsubscribed from price updates");
  };
}

/**
 * Subscribe to all price updates
 * Returns unsubscribe function
 */
export async function subscribeToAllPriceUpdates(
  callback: (message: PriceUpdateMessage) => void,
): Promise<() => void> {
  const channel = PubSubChannels.priceUpdateAll();

  // Bun's RedisClient subscribe pattern: callback is passed directly to subscribe
  const messageHandler = (message: string, ch: string) => {
    try {
      const parsed = JSON.parse(message) as PriceUpdateMessage;
      callback(parsed);
    } catch (error) {
      logger.error(
        { err: error, channel, message },
        "Failed to parse pub/sub message",
      );
    }
  };

  await redisPubSub.subscribe(channel, messageHandler);

  logger.info({ channel }, "Subscribed to all price updates");

  return async () => {
    await redisPubSub.unsubscribe(channel);
    logger.info({ channel }, "Unsubscribed from all price updates");
  };
}

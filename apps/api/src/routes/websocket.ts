/**
 * WebSocket route for real-time price streaming
 * WS /stream
 *
 * Message format:
 * Client -> Server:
 *   { "type": "subscribe", "symbols": ["BTC/USD", "ETH/USD"] }
 *   { "type": "unsubscribe", "symbols": ["BTC/USD"] }
 *   { "type": "ping" }
 *
 * Server -> Client:
 *   { "type": "price_update", "data": {...} }
 *   { "type": "subscribed", "symbols": [...] }
 *   { "type": "unsubscribed", "symbols": [...] }
 *   { "type": "pong" }
 *   { "type": "error", "message": "..." }
 */

import { ServerWebSocket } from 'bun';
import { subscribeToPriceUpdates, type PriceUpdateMessage } from '../cache/pubsub';
import { logger } from '../utils/logger';
import { config } from '../utils/config';

/**
 * Client message types
 */
interface SubscribeMessage {
  type: 'subscribe';
  symbols: string[];
}

interface UnsubscribeMessage {
  type: 'unsubscribe';
  symbols: string[];
}

interface PingMessage {
  type: 'ping';
}

type ClientMessage = SubscribeMessage | UnsubscribeMessage | PingMessage;

/**
 * Server message types
 */
interface SubscribedMessage {
  type: 'subscribed';
  symbols: string[];
}

interface UnsubscribedMessage {
  type: 'unsubscribed';
  symbols: string[];
}

interface PongMessage {
  type: 'pong';
  timestamp: string;
}

interface ErrorMessage {
  type: 'error';
  message: string;
}

type ServerMessage =
  | PriceUpdateMessage
  | SubscribedMessage
  | UnsubscribedMessage
  | PongMessage
  | ErrorMessage;

/**
 * Connection data stored in WebSocket
 */
export interface ConnectionData {
  id: string;
  subscribedSymbols: Set<string>;
  unsubscribe?: () => Promise<void>;
  heartbeatInterval?: Timer;
  createdAt: Date;
}

/**
 * Global connection tracking
 */
class ConnectionManager {
  private connections = new Map<string, ServerWebSocket<ConnectionData>>();

  add(ws: ServerWebSocket<ConnectionData>): boolean {
    if (this.connections.size >= config.WS_MAX_CONNECTIONS) {
      return false;
    }
    this.connections.set(ws.data.id, ws);
    return true;
  }

  remove(id: string): void {
    this.connections.delete(id);
  }

  count(): number {
    return this.connections.size;
  }

  getConnection(id: string): ServerWebSocket<ConnectionData> | undefined {
    return this.connections.get(id);
  }
}

const connectionManager = new ConnectionManager();

/**
 * WebSocket handlers for Bun server
 */
export const websocketHandlers = {
  open(ws: ServerWebSocket<ConnectionData>) {
    handleOpen(ws);
  },
  message(ws: ServerWebSocket<ConnectionData>, message: string | Buffer) {
    handleMessage(ws, message);
  },
  close(ws: ServerWebSocket<ConnectionData>, code: number, reason: string) {
    handleClose(ws, code, reason);
  },
  error(ws: ServerWebSocket<ConnectionData>, error: Error) {
    handleError(ws, error);
  },
};

/**
 * WebSocket event handlers
 */
async function handleOpen(ws: ServerWebSocket<ConnectionData>): Promise<void> {
  const { id } = ws.data;

  // Add to connection manager
  if (!connectionManager.add(ws)) {
    ws.close(1008, 'Connection limit reached');
    return;
  }

  logger.info(
    {
      connection_id: id,
      total_connections: connectionManager.count(),
    },
    'WebSocket connection opened'
  );

  // Start heartbeat
  ws.data.heartbeatInterval = setInterval(() => {
    try {
      const message: PongMessage = {
        type: 'pong',
        timestamp: new Date().toISOString(),
      };
      ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error({ connection_id: id, err: error }, 'Failed to send heartbeat');
    }
  }, config.WS_HEARTBEAT_INTERVAL);
}

async function handleMessage(
  ws: ServerWebSocket<ConnectionData>,
  message: string | Buffer
): Promise<void> {
  const { id } = ws.data;

  try {
    const messageStr = typeof message === 'string' ? message : message.toString('utf-8');
    const parsed = JSON.parse(messageStr) as ClientMessage;

    logger.debug({ connection_id: id, message: parsed }, 'Received WebSocket message');

    switch (parsed.type) {
      case 'subscribe':
        await handleSubscribe(ws, parsed.symbols);
        break;

      case 'unsubscribe':
        await handleUnsubscribe(ws, parsed.symbols);
        break;

      case 'ping':
        await handlePing(ws);
        break;

      default:
        sendError(ws, `Unknown message type: ${(parsed as any).type}`);
    }
  } catch (error) {
    logger.error({ connection_id: id, err: error }, 'Failed to handle WebSocket message');
    sendError(ws, 'Invalid message format');
  }
}

async function handleClose(
  ws: ServerWebSocket<ConnectionData>,
  code: number,
  reason: string
): Promise<void> {
  const { id, unsubscribe, heartbeatInterval } = ws.data;

  // Clean up heartbeat
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
  }

  // Unsubscribe from Redis
  if (unsubscribe) {
    await unsubscribe();
  }

  // Remove from connection manager
  connectionManager.remove(id);

  logger.info(
    {
      connection_id: id,
      code,
      reason,
      total_connections: connectionManager.count(),
    },
    'WebSocket connection closed'
  );
}

async function handleError(
  ws: ServerWebSocket<ConnectionData>,
  error: Error
): Promise<void> {
  const { id } = ws.data;

  logger.error(
    {
      connection_id: id,
      err: error,
    },
    'WebSocket error'
  );
}

/**
 * Message handlers
 */
async function handleSubscribe(
  ws: ServerWebSocket<ConnectionData>,
  symbols: string[]
): Promise<void> {
  const { id, subscribedSymbols } = ws.data;

  // Validate symbols format (BASE/QUOTE)
  const symbolRegex = /^[A-Z]+\/[A-Z]+$/;
  const validSymbols = symbols.filter((s) => symbolRegex.test(s));

  if (validSymbols.length === 0) {
    sendError(ws, 'No valid symbols provided. Format: BTC/USD, ETH/USD, etc.');
    return;
  }

  // Add to subscribed symbols
  validSymbols.forEach((symbol) => subscribedSymbols.add(symbol));

  // Unsubscribe from old Redis subscription if exists
  if (ws.data.unsubscribe) {
    await ws.data.unsubscribe();
  }

  // Subscribe to Redis pub/sub
  const allSubscribedSymbols = Array.from(subscribedSymbols);
  ws.data.unsubscribe = await subscribeToPriceUpdates(
    allSubscribedSymbols,
    (message: PriceUpdateMessage) => {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error(
          { connection_id: id, err: error },
          'Failed to send price update to client'
        );
      }
    }
  );

  logger.info(
    {
      connection_id: id,
      symbols: validSymbols,
      total_subscribed: subscribedSymbols.size,
    },
    'Client subscribed to symbols'
  );

  // Send confirmation
  const response: SubscribedMessage = {
    type: 'subscribed',
    symbols: validSymbols,
  };
  ws.send(JSON.stringify(response));
}

async function handleUnsubscribe(
  ws: ServerWebSocket<ConnectionData>,
  symbols: string[]
): Promise<void> {
  const { id, subscribedSymbols } = ws.data;

  // Remove from subscribed symbols
  symbols.forEach((symbol) => subscribedSymbols.delete(symbol));

  // If no symbols left, unsubscribe from Redis
  if (subscribedSymbols.size === 0) {
    if (ws.data.unsubscribe) {
      await ws.data.unsubscribe();
      ws.data.unsubscribe = undefined;
    }
  } else {
    // Re-subscribe with remaining symbols
    if (ws.data.unsubscribe) {
      await ws.data.unsubscribe();
    }

    const allSubscribedSymbols = Array.from(subscribedSymbols);
    ws.data.unsubscribe = await subscribeToPriceUpdates(
      allSubscribedSymbols,
      (message: PriceUpdateMessage) => {
        try {
          ws.send(JSON.stringify(message));
        } catch (error) {
          logger.error(
            { connection_id: id, err: error },
            'Failed to send price update to client'
          );
        }
      }
    );
  }

  logger.info(
    {
      connection_id: id,
      symbols,
      remaining_subscribed: subscribedSymbols.size,
    },
    'Client unsubscribed from symbols'
  );

  // Send confirmation
  const response: UnsubscribedMessage = {
    type: 'unsubscribed',
    symbols,
  };
  ws.send(JSON.stringify(response));
}

async function handlePing(ws: ServerWebSocket<ConnectionData>): Promise<void> {
  const response: PongMessage = {
    type: 'pong',
    timestamp: new Date().toISOString(),
  };
  ws.send(JSON.stringify(response));
}

function sendError(ws: ServerWebSocket<ConnectionData>, message: string): void {
  const response: ErrorMessage = {
    type: 'error',
    message,
  };
  ws.send(JSON.stringify(response));
}

/**
 * Get connection stats (for monitoring)
 */
export function getConnectionStats() {
  return {
    total_connections: connectionManager.count(),
    max_connections: config.WS_MAX_CONNECTIONS,
    utilization: (connectionManager.count() / config.WS_MAX_CONNECTIONS) * 100,
  };
}

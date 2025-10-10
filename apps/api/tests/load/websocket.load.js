/**
 * k6 Load Test: WebSocket /stream
 * Tests WebSocket connection scalability and message throughput
 *
 * Usage:
 *   k6 run apps/api/tests/load/websocket.load.js
 *   k6 run --vus 50 --duration 2m apps/api/tests/load/websocket.load.js
 *   k6 run --vus 500 --duration 5m apps/api/tests/load/websocket.load.js
 */

import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Custom metrics
const wsConnectionErrors = new Rate('ws_connection_errors');
const wsMessageErrors = new Rate('ws_message_errors');
const wsConnectionDuration = new Trend('ws_connection_duration');
const wsMessageLatency = new Trend('ws_message_latency');
const messagesReceived = new Counter('messages_received');
const connectionsEstablished = new Counter('connections_established');

// Test configuration
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp up to 50 concurrent connections
    { duration: '2m', target: 50 },   // Stay at 50
    { duration: '1m', target: 200 },  // Ramp up to 200
    { duration: '2m', target: 200 },  // Stay at 200
    { duration: '1m', target: 500 },  // Spike to 500
    { duration: '2m', target: 500 },  // Stay at 500
    { duration: '1m', target: 0 },    // Ramp down
  ],
  thresholds: {
    ws_connection_errors: ['rate<0.05'], // Connection error rate < 5%
    ws_message_errors: ['rate<0.01'], // Message error rate < 1%
    ws_connection_duration: ['p(95)<500'], // 95% of connections under 500ms
    ws_message_latency: ['p(95)<100'], // 95% of messages under 100ms
  },
};

// Configuration
const BASE_URL = __ENV.WS_URL || 'ws://localhost:3000';
const API_KEY = __ENV.API_KEY || 'chrono_public_dev_key_001';

// Test symbols
const SYMBOLS = [
  'BTC/USD',
  'ETH/USD',
  'XRP/USD',
  'ADA/USD',
  'SOL/USD',
];

/**
 * Generate random subset of symbols to subscribe to
 */
function getRandomSymbols() {
  const count = Math.floor(Math.random() * 3) + 1; // 1-3 symbols
  const shuffled = [...SYMBOLS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

/**
 * Main WebSocket test scenario
 */
export default function () {
  const symbols = getRandomSymbols();
  const url = `${BASE_URL}/stream`;
  const params = {
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
    },
  };

  let messageCount = 0;
  let subscribeAcknowledged = false;
  let connectionStart = Date.now();

  const response = ws.connect(url, params, function (socket) {
    // Connection established
    const connectionTime = Date.now() - connectionStart;
    wsConnectionDuration.add(connectionTime);
    connectionsEstablished.add(1);

    socket.on('open', () => {
      console.log(`[VU ${__VU}] WebSocket connected, subscribing to: ${symbols.join(', ')}`);

      // Subscribe to symbols
      socket.send(
        JSON.stringify({
          type: 'subscribe',
          symbols: symbols,
        })
      );
    });

    socket.on('message', (data) => {
      try {
        const message = JSON.parse(data);
        const messageReceiveTime = Date.now();

        // Check message type
        const validMessage = check(message, {
          'has type field': (m) => m.type !== undefined,
          'valid message type': (m) =>
            ['subscribed', 'price_update', 'pong', 'error'].includes(m.type),
        });

        if (!validMessage) {
          wsMessageErrors.add(1);
          return;
        }

        messagesReceived.add(1);

        // Handle different message types
        switch (message.type) {
          case 'subscribed':
            console.log(`[VU ${__VU}] Subscribed to: ${message.symbols.join(', ')}`);
            subscribeAcknowledged = true;
            break;

          case 'price_update':
            // Calculate message latency (timestamp in message vs receive time)
            if (message.timestamp) {
              const messageTimestamp = new Date(message.timestamp).getTime();
              const latency = messageReceiveTime - messageTimestamp;
              wsMessageLatency.add(latency);
            }

            messageCount++;
            break;

          case 'pong':
            // Heartbeat received
            break;

          case 'error':
            console.log(`[VU ${__VU}] Error: ${message.message}`);
            wsMessageErrors.add(1);
            break;
        }
      } catch (e) {
        console.error(`[VU ${__VU}] Failed to parse message:`, e);
        wsMessageErrors.add(1);
      }
    });

    socket.on('error', (e) => {
      if (e.error() !== 'websocket: close sent') {
        console.error(`[VU ${__VU}] WebSocket error:`, e.error());
        wsConnectionErrors.add(1);
      }
    });

    socket.on('close', () => {
      console.log(`[VU ${__VU}] Connection closed. Received ${messageCount} messages.`);
    });

    // Keep connection open for varying durations
    const connectionDuration = Math.floor(Math.random() * 30) + 30; // 30-60 seconds
    socket.setTimeout(() => {
      console.log(`[VU ${__VU}] Closing connection after ${connectionDuration}s`);

      // Unsubscribe before closing (test graceful disconnect)
      if (subscribeAcknowledged && Math.random() > 0.5) {
        socket.send(
          JSON.stringify({
            type: 'unsubscribe',
            symbols: symbols,
          })
        );
        socket.setTimeout(() => {
          socket.close();
        }, 100); // Wait 100ms for unsubscribe to process
      } else {
        socket.close();
      }
    }, connectionDuration * 1000);

    // Send periodic pings to test bidirectional communication
    const pingInterval = socket.setInterval(() => {
      socket.send(JSON.stringify({ type: 'ping' }));
    }, 10000); // Ping every 10 seconds

    socket.on('close', () => {
      socket.clearInterval(pingInterval);
    });
  });

  // Check if connection was successful
  check(response, {
    'WebSocket connection successful': (r) => r && r.status === 101,
  });

  if (!response || response.status !== 101) {
    wsConnectionErrors.add(1);
  }

  // Small delay before next VU iteration
  sleep(1);
}

/**
 * Setup function
 */
export function setup() {
  console.log('🚀 Starting WebSocket load test');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   API Key: ${API_KEY.substring(0, 20)}...`);

  // Note: We can't easily check HTTP health from WebSocket test,
  // but we'll attempt connection and let it fail if API is down
  console.log('✅ Starting WebSocket connection tests');
}

/**
 * Teardown function
 */
export function teardown(data) {
  console.log('🏁 WebSocket load test complete');
}

/**
 * Handle summary for custom reporting
 */
export function handleSummary(data) {
  return {
    stdout: generateSummary(data),
  };
}

function generateSummary(data) {
  const { metrics } = data;

  let summary = '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';
  summary += '  WebSocket Load Test Results\n';
  summary += '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n';

  if (metrics.connections_established) {
    summary += `📡 Connections Established: ${metrics.connections_established.values.count}\n`;
  }

  if (metrics.messages_received) {
    summary += `📨 Messages Received: ${metrics.messages_received.values.count}\n`;
  }

  if (metrics.ws_connection_duration) {
    summary += `\n⏱️  Connection Duration:\n`;
    summary += `   Avg: ${metrics.ws_connection_duration.values.avg.toFixed(2)}ms\n`;
    summary += `   P95: ${metrics.ws_connection_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `   P99: ${metrics.ws_connection_duration.values['p(99)'].toFixed(2)}ms\n`;
  }

  if (metrics.ws_message_latency) {
    summary += `\n📬 Message Latency:\n`;
    summary += `   Avg: ${metrics.ws_message_latency.values.avg.toFixed(2)}ms\n`;
    summary += `   P95: ${metrics.ws_message_latency.values['p(95)'].toFixed(2)}ms\n`;
    summary += `   P99: ${metrics.ws_message_latency.values['p(99)'].toFixed(2)}ms\n`;
  }

  if (metrics.ws_connection_errors) {
    const errorRate = (metrics.ws_connection_errors.values.rate * 100).toFixed(2);
    summary += `\n❌ Connection Error Rate: ${errorRate}%\n`;
  }

  if (metrics.ws_message_errors) {
    const errorRate = (metrics.ws_message_errors.values.rate * 100).toFixed(2);
    summary += `❌ Message Error Rate: ${errorRate}%\n`;
  }

  summary += '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  return summary;
}

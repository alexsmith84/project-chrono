/**
 * Simple WebSocket client for manual testing
 * Usage: bun run tests/websocket-client.ts
 */

const ws = new WebSocket('ws://localhost:3000/stream');

ws.onopen = () => {
  console.log('✅ Connected to WebSocket server');

  // Subscribe to symbols
  ws.send(
    JSON.stringify({
      type: 'subscribe',
      symbols: ['BTC/USD', 'ETH/USD'],
    })
  );
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('📨 Received:', JSON.stringify(message, null, 2));
};

ws.onerror = (error) => {
  console.error('❌ WebSocket error:', error);
};

ws.onclose = (event) => {
  console.log(`🔌 Connection closed (code: ${event.code}, reason: ${event.reason})`);
  process.exit(0);
};

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n👋 Closing connection...');
  ws.close();
});

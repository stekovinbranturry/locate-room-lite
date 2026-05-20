const roomId = crypto.randomUUID();
const peerId = crypto.randomUUID();
const url = `ws://localhost:3002/signal?roomId=${roomId}&peerId=${peerId}&displayName=test`;
const ws = new WebSocket(url);
ws.onopen = () => {
  console.log('[ws-proxy] OK connected via vite proxy :3002');
  ws.close();
  process.exit(0);
};
ws.onerror = (e) => {
  console.error('[ws-proxy] FAIL', e);
  process.exit(1);
};
setTimeout(() => {
  console.error('[ws-proxy] timeout');
  process.exit(1);
}, 5000);

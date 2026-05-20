/**
 * Dual-client signaling smoke test (no WebRTC).
 */
const roomId = crypto.randomUUID();
const peerA = crypto.randomUUID();
const peerB = crypto.randomUUID();

type Msg = { type: string; [k: string]: unknown };

function connect(peerId: string, name: string): Promise<WebSocket> {
  const url = `ws://localhost:3001/signal?roomId=${roomId}&peerId=${peerId}&displayName=${name}`;
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    const t = setTimeout(() => reject(new Error(`timeout ${peerId}`)), 5000);
    ws.onopen = () => {
      clearTimeout(t);
      resolve(ws);
    };
    ws.onerror = () => reject(new Error(`ws error ${peerId}`));
  });
}

function waitMsg(ws: WebSocket, pred: (m: Msg) => boolean, label: string): Promise<Msg> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`no msg: ${label}`)), 5000);
    const onMessage = (ev: MessageEvent) => {
      const msg = JSON.parse(String(ev.data)) as Msg;
      if (pred(msg)) {
        clearTimeout(t);
        ws.removeEventListener('message', onMessage);
        resolve(msg);
      }
    };
    ws.addEventListener('message', onMessage);
  });
}

const log = (s: string) => console.log(`[dual-test] ${s}`);

const wsA = await connect(peerA, 'Alice');
log('A connected');

const roomStateA = await waitMsg(wsA, (m) => m.type === 'room-state', 'room-state A');
log(`A room-state members: ${(roomStateA as { members: unknown[] }).members?.length ?? 0}`);

const joinedOnAPromise = waitMsg(wsA, (m) => m.type === 'joined' && m.peerId === peerB, 'joined on A');

const wsB = await connect(peerB, 'Bob');
log('B connected');

const joinedOnA = await joinedOnAPromise;
log(`A saw joined: ${joinedOnA.peerId}`);

const roomStateB = await waitMsg(wsB, (m) => m.type === 'room-state', 'room-state B');
const members = (roomStateB as { members: { peerId: string }[] }).members;
log(`B room-state members: ${members.map((m) => m.peerId).join(', ')}`);

if (!members.some((m) => m.peerId === peerA)) throw new Error('B missing A in room-state');

// signal relay
wsA.send(
  JSON.stringify({
    type: 'signal',
    to: peerB,
    payload: { type: 'offer', sdp: { type: 'offer', sdp: 'v=0 test' } },
  }),
);
const relayed = await waitMsg(wsB, (m) => m.type === 'signal' && m.from === peerA, 'signal relay');
log(`B got signal from A: ${relayed.from}`);

wsB.close();
await waitMsg(wsA, (m) => m.type === 'left' && m.peerId === peerB, 'left on A');
log('A saw B left');

wsA.close();
log('PASS: dual signaling');

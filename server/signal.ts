/**
 * WebSocket signaling — forwards SDP/ICE and room membership only (no lat/lng).
 */
import type { ServerWebSocket } from 'bun';

const PORT = Number(process.env.PORT ?? process.env.SIGNAL_PORT ?? 3001);
const MAX_PEERS_PER_ROOM = 4;

type PeerMeta = {
  displayName: string;
};

type ClientData = {
  roomId: string;
  peerId: string;
  meta: PeerMeta;
};

type SignalPayload = {
  sdp?: { type?: string; sdp?: string };
  candidate?: Record<string, unknown>;
  type?: 'offer' | 'answer' | 'ice-candidate';
};

type Inbound =
  | { type: 'join'; roomId: string; peerId: string; meta: PeerMeta }
  | { type: 'signal'; to: string; payload: SignalPayload }
  | { type: 'leave' };

type MemberInfo = { peerId: string; meta: PeerMeta };

const rooms = new Map<string, Map<string, ServerWebSocket<ClientData>>>();

function getRoom(roomId: string) {
  let room = rooms.get(roomId);
  if (!room) {
    room = new Map();
    rooms.set(roomId, room);
  }
  return room;
}

function send(ws: ServerWebSocket<ClientData>, msg: unknown) {
  ws.send(JSON.stringify(msg));
}

function broadcast(roomId: string, msg: unknown, exceptPeerId?: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const [peerId, ws] of room) {
    if (peerId !== exceptPeerId) send(ws, msg);
  }
}

function roomMembers(roomId: string): MemberInfo[] {
  const room = rooms.get(roomId);
  if (!room) return [];
  return [...room.entries()].map(([peerId, ws]) => ({
    peerId,
    meta: ws.data.meta,
  }));
}

function removePeer(roomId: string, peerId: string) {
  const room = rooms.get(roomId);
  if (!room) return;
  room.delete(peerId);
  if (room.size === 0) rooms.delete(roomId);
  broadcast(roomId, { type: 'left', peerId }, peerId);
}

Bun.serve<ClientData>({
  port: PORT,
  hostname: '0.0.0.0',
  fetch(req, server) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/health') {
      return Response.json({ ok: true, service: 'locate-room-signal' });
    }
    if (url.pathname !== '/signal') {
      return new Response('LocateRoom signal server', { status: 404 });
    }

    const roomId = url.searchParams.get('roomId');
    const peerId = url.searchParams.get('peerId');
    const displayName = url.searchParams.get('displayName') ?? 'Guest';

    if (!roomId || !peerId) {
      return new Response('roomId and peerId required', { status: 400 });
    }

    const room = getRoom(roomId);
    if (room.size >= MAX_PEERS_PER_ROOM && !room.has(peerId)) {
      return new Response('room full', { status: 403 });
    }

    const upgraded = server.upgrade(req, {
      data: { roomId, peerId, meta: { displayName } },
    });
    if (upgraded) return undefined;
    return new Response('WebSocket upgrade failed', { status: 500 });
  },
  websocket: {
    open(ws) {
      const { roomId, peerId, meta } = ws.data;
      const room = getRoom(roomId);
      room.set(peerId, ws);

      send(ws, { type: 'room-state', members: roomMembers(roomId) });
      broadcast(roomId, { type: 'joined', peerId, meta }, peerId);
    },
    message(ws, raw) {
      const { roomId, peerId } = ws.data;
      let msg: Inbound;
      try {
        msg = JSON.parse(String(raw)) as Inbound;
      } catch {
        return;
      }

      if (msg.type === 'signal') {
        const room = rooms.get(roomId);
        const target = room?.get(msg.to);
        if (target) {
          send(target, { type: 'signal', from: peerId, payload: msg.payload });
        }
        return;
      }

      if (msg.type === 'leave') {
        ws.close();
      }
    },
    close(ws) {
      removePeer(ws.data.roomId, ws.data.peerId);
    },
  },
});

console.log(`[signal] http://0.0.0.0:${PORT}  ws://0.0.0.0:${PORT}/signal`);

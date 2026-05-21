import { useRoomStore } from '#/features/room/memberStore';
import { appendTrail, removeTrail } from '#/features/trajectory/trailStore';
import { PeerConnectionPool } from '#/features/webrtc/PeerConnectionPool';
import type { DataChannelMessage, ServerMessage } from '#/features/webrtc/protocol';
import { SignalingClient } from '#/features/webrtc/SignalingClient';
import { getSignalUrl } from '#/lib/config';

type SessionKey = string;

type RoomSession = {
  key: SessionKey;
  signal: SignalingClient;
  pool: PeerConnectionPool;
  refCount: number;
  destroyTimer: ReturnType<typeof setTimeout> | null;
};

const sessions = new Map<SessionKey, RoomSession>();

function sessionKey(roomId: string, peerId: string) {
  return `${roomId}:${peerId}`;
}

function scheduleDestroy(session: RoomSession) {
  if (session.destroyTimer) clearTimeout(session.destroyTimer);
  session.destroyTimer = setTimeout(() => {
    if (session.refCount > 0) return;
    session.signal.disconnect();
    session.pool.closeAll();
    sessions.delete(session.key);
  }, 1500);
}

export function acquireRoomSession(opts: { roomId: string; peerId: string; displayName: string }): RoomSession {
  const key = sessionKey(opts.roomId, opts.peerId);
  let session = sessions.get(key);

  if (session) {
    if (session.destroyTimer) {
      clearTimeout(session.destroyTimer);
      session.destroyTimer = null;
    }
    session.refCount++;
    return session;
  }

  const store = useRoomStore.getState();
  store.init({
    roomId: opts.roomId,
    localPeerId: opts.peerId,
    localName: opts.displayName.trim() || 'Guest',
  });

  const signal = new SignalingClient(getSignalUrl(opts.roomId, opts.peerId, opts.displayName), {
    onOpen: () => store.setConnectionStatus('connected'),
    onClose: () => store.setConnectionStatus('reconnecting'),
    onError: () => {
      store.setConnectionStatus('reconnecting');
      store.pushEvent('信令连接失败，请检查 Railway 信令服务是否在线');
    },
    onMessage: (msg) => void handleServerMessage(opts.roomId, opts.peerId, msg),
  });

  const pool = new PeerConnectionPool(opts.peerId, (to, payload) => signal.signal(to, payload), {
    onLocation: (from, msg) => handleLocation(from, msg),
    onLinkState: (remotePeerId, state) => store.setLinkState(remotePeerId, state),
  });

  signal.connect();

  session = { key, signal, pool, refCount: 1, destroyTimer: null };
  sessions.set(key, session);
  return session;
}

export function releaseRoomSession(key: SessionKey) {
  const session = sessions.get(key);
  if (!session) return;
  session.refCount--;
  if (session.refCount <= 0) scheduleDestroy(session);
}

async function handleServerMessage(roomId: string, localPeerId: string, msg: ServerMessage) {
  const store = useRoomStore.getState();
  const pool = sessions.get(sessionKey(roomId, localPeerId))?.pool;
  if (!pool) return;

  if (msg.type === 'room-state') {
    for (const m of msg.members) {
      if (m.peerId !== localPeerId) {
        store.upsertPeer(m.peerId, m.meta);
        await pool.handlePeerJoined(m.peerId);
      }
    }
    return;
  }

  if (msg.type === 'joined') {
    store.upsertPeer(msg.peerId, msg.meta);
    store.pushEvent(`${msg.meta.displayName} 加入了房间`);
    await pool.handlePeerJoined(msg.peerId);
    return;
  }

  if (msg.type === 'left') {
    const displayName = store.peers[msg.peerId]?.meta.displayName || 'Guest';
    pool.handlePeerLeft(msg.peerId);
    store.removePeer(msg.peerId);
    removeTrail(msg.peerId);
    store.pushEvent(`${displayName}离开了房间`);
    return;
  }

  if (msg.type === 'signal') {
    await pool.handleSignal(msg.from, msg.payload);
  }
}

function handleLocation(fromPeerId: string, msg: DataChannelMessage) {
  if (msg.t === 'snapshot' || msg.t === 'update') {
    useRoomStore.getState().setPeerLocation(fromPeerId, msg.loc);
    appendTrail(fromPeerId, msg.loc);
  }
}

export function getSessionPool(roomId: string, peerId: string): PeerConnectionPool | null {
  return sessions.get(sessionKey(roomId, peerId))?.pool ?? null;
}

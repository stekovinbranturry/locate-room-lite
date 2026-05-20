export const MAX_PEERS = 4;
export const LOCATION_TICK_MS = 100;

export const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

export function getSignalUrl(roomId: string, peerId: string, displayName: string): string {
  const params = new URLSearchParams({ roomId, peerId, displayName });
  // Dev: connect signal server directly (avoids Vite ws proxy ECONNRESET under load).
  if (import.meta.env.DEV) {
    const port = import.meta.env.VITE_SIGNAL_PORT ?? '3001';
    return `ws://localhost:${port}/signal?${params}`;
  }
  const proto = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss' : 'ws';
  const host = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  return `${proto}://${host}/signal?${params}`;
}

export function createRoomId(): string {
  return crypto.randomUUID();
}

export function createPeerId(): string {
  return crypto.randomUUID();
}

/** Stable peer id per tab+room (survives React Strict Mode remount). */
export function getOrCreatePeerId(roomId: string): string {
  const key = `locate-peer:${roomId}`;
  if (typeof sessionStorage !== 'undefined') {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = createPeerId();
    sessionStorage.setItem(key, id);
    return id;
  }
  return createPeerId();
}

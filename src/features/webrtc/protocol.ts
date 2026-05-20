export type LocationPayload = {
  lat: number;
  lng: number;
  accuracy?: number;
  heading?: number;
  speed?: number;
  ts: number;
};

export type DataChannelMessage =
  | { t: 'snapshot'; peerId: string; loc: LocationPayload }
  | { t: 'update'; peerId: string; loc: LocationPayload }
  | { t: 'ping'; ts: number }
  | { t: 'pong'; ts: number };

export type PeerMeta = { displayName: string };

export type MemberInfo = { peerId: string; meta: PeerMeta };

export type SignalPayload = {
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  type?: 'offer' | 'answer' | 'ice-candidate';
};

export type ServerMessage =
  | { type: 'room-state'; members: MemberInfo[] }
  | { type: 'joined'; peerId: string; meta: PeerMeta }
  | { type: 'left'; peerId: string }
  | { type: 'signal'; from: string; payload: SignalPayload };

export type ClientMessage =
  | { type: 'join'; roomId: string; peerId: string; meta: PeerMeta }
  | { type: 'signal'; to: string; payload: SignalPayload }
  | { type: 'leave' };

export function parseDataChannelMessage(raw: string): DataChannelMessage | null {
  try {
    const msg = JSON.parse(raw) as DataChannelMessage;
    if (msg.t === 'snapshot' || msg.t === 'update') {
      if (typeof msg.peerId === 'string' && msg.loc && typeof msg.loc.lat === 'number') {
        return msg;
      }
    }
    if (msg.t === 'ping' || msg.t === 'pong') return msg;
    return null;
  } catch {
    return null;
  }
}

export function encodeDataChannelMessage(msg: DataChannelMessage): string {
  return JSON.stringify(msg);
}

/** Lexicographically smaller peerId initiates offer (polite peer pattern). */
export function shouldInitiateOffer(localPeerId: string, remotePeerId: string): boolean {
  return localPeerId < remotePeerId;
}

import { create } from 'zustand';
import type { PeerLinkState } from '#/features/webrtc/PeerConnectionPool';
import type { LocationPayload, PeerMeta } from '#/features/webrtc/protocol';

export type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'error';

export type PeerState = {
  peerId: string;
  meta: PeerMeta;
  linkState: PeerLinkState | 'signaling';
  location: LocationPayload | null;
};

type RoomStore = {
  localPeerId: string;
  localName: string;
  roomId: string;
  connectionStatus: ConnectionStatus;
  peers: Record<string, PeerState>;
  events: { id: string; text: string; ts: number }[];
  localLocation: LocationPayload | null;

  init: (opts: { roomId: string; localPeerId: string; localName: string }) => void;
  setConnectionStatus: (s: ConnectionStatus) => void;
  setLocalLocation: (loc: LocationPayload | null) => void;
  upsertPeer: (peerId: string, meta: PeerMeta) => void;
  removePeer: (peerId: string) => void;
  setLinkState: (peerId: string, linkState: PeerState['linkState']) => void;
  setPeerLocation: (peerId: string, loc: LocationPayload) => void;
  pushEvent: (text: string) => void;
  reset: () => void;
};

let eventSeq = 0;

export const useRoomStore = create<RoomStore>((set, get) => ({
  localPeerId: '',
  localName: '',
  roomId: '',
  connectionStatus: 'idle',
  peers: {},
  events: [],
  localLocation: null,

  init: ({ roomId, localPeerId, localName }) =>
    set({
      roomId,
      localPeerId,
      localName,
      connectionStatus: 'connecting',
      peers: {},
      events: [],
      localLocation: null,
    }),

  setConnectionStatus: (connectionStatus) => set({ connectionStatus }),

  setLocalLocation: (localLocation) => set({ localLocation }),

  upsertPeer: (peerId, meta) => {
    if (peerId === get().localPeerId) return;
    set((s) => ({
      peers: {
        ...s.peers,
        [peerId]: s.peers[peerId] ?? { peerId, meta, linkState: 'signaling', location: null },
      },
    }));
  },

  removePeer: (peerId) => {
    set((s) => {
      const { [peerId]: _, ...rest } = s.peers;
      return { peers: rest };
    });
  },

  setLinkState: (peerId, linkState) => {
    set((s) => {
      const p = s.peers[peerId];
      if (!p) return s;
      return { peers: { ...s.peers, [peerId]: { ...p, linkState } } };
    });
  },

  setPeerLocation: (peerId, location) => {
    set((s) => {
      const p = s.peers[peerId];
      if (!p) return s;
      return { peers: { ...s.peers, [peerId]: { ...p, location } } };
    });
  },

  pushEvent: (text) => {
    const id = `${++eventSeq}`;
    set((s) => ({
      events: [{ id, text, ts: Date.now() }, ...s.events].slice(0, 20),
    }));
  },

  reset: () =>
    set({
      localPeerId: '',
      localName: '',
      roomId: '',
      connectionStatus: 'idle',
      peers: {},
      events: [],
      localLocation: null,
    }),
}));

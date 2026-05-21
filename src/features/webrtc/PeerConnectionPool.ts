import { perfMonitor } from '#/features/perf/perfMonitor';
import {
  type DataChannelMessage,
  encodeDataChannelMessage,
  type LocationPayload,
  parseDataChannelMessage,
  type SignalPayload,
  shouldInitiateOffer,
} from '#/features/webrtc/protocol';
import { ICE_SERVERS } from '#/lib/config';

export type PeerLinkState = 'connecting' | 'connected' | 'disconnected' | 'failed' | 'closed';

type LinkCallbacks = {
  onLocation: (fromPeerId: string, msg: DataChannelMessage) => void;
  onLinkState: (remotePeerId: string, state: PeerLinkState) => void;
};

type PeerLink = {
  pc: RTCPeerConnection;
  dc: RTCDataChannel | null;
  remotePeerId: string;
  makingOffer: boolean;
  ignoreOffer: boolean;
  pingTimer: ReturnType<typeof setInterval> | null;
};

const PING_INTERVAL_MS = 3000;

export class PeerConnectionPool {
  private links = new Map<string, PeerLink>();
  private localPeerId: string;
  private sendSignal: (to: string, payload: SignalPayload) => void;
  private callbacks: LinkCallbacks;
  private lastLocalLocation: LocationPayload | null = null;
  private markedFirstRemote = false;

  constructor(localPeerId: string, sendSignal: (to: string, payload: SignalPayload) => void, callbacks: LinkCallbacks) {
    this.localPeerId = localPeerId;
    this.sendSignal = sendSignal;
    this.callbacks = callbacks;
  }

  setLocalLocation(loc: LocationPayload) {
    this.lastLocalLocation = loc;
  }

  getOpenLinkCount() {
    return [...this.links.values()].filter((l) => l.dc?.readyState === 'open').length;
  }

  async handlePeerJoined(remotePeerId: string) {
    if (remotePeerId === this.localPeerId || this.links.has(remotePeerId)) return;
    if (shouldInitiateOffer(this.localPeerId, remotePeerId)) {
      await this.createOffererLink(remotePeerId);
    }
  }

  async handleSignal(from: string, payload: SignalPayload) {
    if (payload.type === 'offer' && payload.sdp) {
      let link = this.links.get(from);
      if (!link) {
        link = this.createLink(from);
        this.attachPcHandlers(link);
      }

      const offerCollision = link.makingOffer;
      link.ignoreOffer = !shouldInitiateOffer(this.localPeerId, from) && offerCollision;
      if (link.ignoreOffer) return;

      await link.pc.setRemoteDescription(payload.sdp);
      const answer = await link.pc.createAnswer();
      await link.pc.setLocalDescription(answer);
      this.sendSignal(from, { type: 'answer', sdp: answer });
      return;
    }

    if (payload.type === 'answer' && payload.sdp) {
      const link = this.links.get(from);
      if (!link) return;
      await link.pc.setRemoteDescription(payload.sdp);
      return;
    }

    if (payload.type === 'ice-candidate' && payload.candidate) {
      const link = this.links.get(from);
      if (!link) return;
      try {
        await link.pc.addIceCandidate(payload.candidate);
      } catch {
        /* ignore stale candidates */
      }
    }
  }

  handlePeerLeft(remotePeerId: string) {
    const link = this.links.get(remotePeerId);
    if (!link) return;
    if (link.pingTimer) clearInterval(link.pingTimer);
    link.dc?.close();
    link.pc.close();
    this.links.delete(remotePeerId);
    this.callbacks.onLinkState(remotePeerId, 'closed');
    perfMonitor.setPeerLinkCount(this.getOpenLinkCount());
  }

  broadcastLocation(loc: LocationPayload) {
    this.lastLocalLocation = loc;
    const msg: DataChannelMessage = { t: 'update', peerId: this.localPeerId, loc };
    const raw = encodeDataChannelMessage(msg);
    const bytes = new TextEncoder().encode(raw).length;
    for (const link of this.links.values()) {
      if (link.dc?.readyState === 'open') {
        link.dc.send(raw);
        perfMonitor.recordDcSent(bytes);
      }
    }
  }

  closeAll() {
    for (const id of [...this.links.keys()]) this.handlePeerLeft(id);
  }

  private createLink(remotePeerId: string): PeerLink {
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    const link: PeerLink = {
      pc,
      dc: null,
      remotePeerId,
      makingOffer: false,
      ignoreOffer: false,
      pingTimer: null,
    };
    this.links.set(remotePeerId, link);
    return link;
  }

  private async createOffererLink(remotePeerId: string) {
    const link = this.createLink(remotePeerId);
    this.attachPcHandlers(link);
    const dc = link.pc.createDataChannel('location', { ordered: false, maxRetransmits: 0 });
    this.wireDataChannel(link, dc);
    link.makingOffer = true;
    const offer = await link.pc.createOffer();
    await link.pc.setLocalDescription(offer);
    link.makingOffer = false;
    this.sendSignal(remotePeerId, { type: 'offer', sdp: offer });
  }

  private attachPcHandlers(link: PeerLink) {
    link.pc.onicecandidate = (ev) => {
      if (ev.candidate) {
        this.sendSignal(link.remotePeerId, {
          type: 'ice-candidate',
          candidate: ev.candidate.toJSON(),
        });
      }
    };

    link.pc.onconnectionstatechange = () => {
      const s = link.pc.connectionState;
      if (s === 'connected') this.callbacks.onLinkState(link.remotePeerId, 'connected');
      else if (s === 'disconnected') this.callbacks.onLinkState(link.remotePeerId, 'disconnected');
      else if (s === 'failed') this.callbacks.onLinkState(link.remotePeerId, 'failed');
      else if (s === 'closed') this.callbacks.onLinkState(link.remotePeerId, 'closed');
      perfMonitor.setPeerLinkCount(this.getOpenLinkCount());
    };

    link.pc.ondatachannel = (ev) => {
      if (!link.dc) this.wireDataChannel(link, ev.channel);
    };
  }

  private wireDataChannel(link: PeerLink, dc: RTCDataChannel) {
    link.dc = dc;
    dc.onopen = () => {
      this.callbacks.onLinkState(link.remotePeerId, 'connected');
      perfMonitor.setPeerLinkCount(this.getOpenLinkCount());
      if (this.lastLocalLocation) {
        const snap: DataChannelMessage = {
          t: 'snapshot',
          peerId: this.localPeerId,
          loc: this.lastLocalLocation,
        };
        const raw = encodeDataChannelMessage(snap);
        dc.send(raw);
        perfMonitor.recordDcSent(new TextEncoder().encode(raw).length);
      }
      link.pingTimer = setInterval(() => {
        if (dc.readyState !== 'open') return;
        const raw = encodeDataChannelMessage({ t: 'ping', ts: Date.now() });
        dc.send(raw);
        perfMonitor.recordDcSent(new TextEncoder().encode(raw).length);
      }, PING_INTERVAL_MS);
    };
    dc.onmessage = (ev) => {
      const raw = String(ev.data);
      perfMonitor.recordDcRecv(new TextEncoder().encode(raw).length);
      const msg = parseDataChannelMessage(raw);
      if (!msg) return;

      if (msg.t === 'ping') {
        const pong = encodeDataChannelMessage({ t: 'pong', ts: msg.ts });
        dc.send(pong);
        perfMonitor.recordDcSent(new TextEncoder().encode(pong).length);
        return;
      }
      if (msg.t === 'pong') {
        perfMonitor.recordRtt(Date.now() - msg.ts);
        return;
      }
      if (msg.t === 'snapshot' || msg.t === 'update') {
        this.callbacks.onLocation(msg.peerId, msg);
        if (!this.markedFirstRemote) {
          this.markedFirstRemote = true;
          performance.mark('room:first-remote-location');
          perfMonitor.resolveFirstRemote();
        }
      }
    };
  }
}

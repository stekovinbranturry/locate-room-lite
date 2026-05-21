import type { ClientMessage, PeerMeta, ServerMessage } from '#/features/webrtc/protocol';

export type SignalingHandlers = {
  onMessage: (msg: ServerMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
};

export class SignalingClient {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers: SignalingHandlers;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private closedByUser = false;

  constructor(url: string, handlers: SignalingHandlers) {
    this.url = url;
    this.handlers = handlers;
  }

  connect() {
    this.closedByUser = false;
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) {
      return;
    }
    if (this.ws) {
      this.ws.onclose = null;
      this.ws.close();
    }
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.backoffMs = 1000;
      this.handlers.onOpen?.();
    };

    this.ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(String(ev.data)) as ServerMessage;
        this.handlers.onMessage(msg);
      } catch {
        /* ignore */
      }
    };

    this.ws.onclose = () => {
      this.handlers.onClose?.();
      if (!this.closedByUser) this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.handlers.onError?.();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.backoffMs = Math.min(this.backoffMs * 2, 30000);
      this.connect();
    }, this.backoffMs);
  }

  send(msg: ClientMessage) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  signal(to: string, payload: ClientMessage extends { type: 'signal' } ? ClientMessage['payload'] : never) {
    this.send({ type: 'signal', to, payload });
  }

  leave() {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.send({ type: 'leave' });
    this.ws?.close();
    this.ws = null;
  }

  disconnect() {
    this.closedByUser = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
  }
}

export function buildJoinMessage(roomId: string, peerId: string, meta: PeerMeta): ClientMessage {
  return { type: 'join', roomId, peerId, meta };
}

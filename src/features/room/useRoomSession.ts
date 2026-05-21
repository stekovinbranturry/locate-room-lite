import { useCallback, useEffect, useRef } from 'react';
import { useGeolocation } from '#/features/location/useGeolocation';
import { getLocationTickMs, shouldSendLocationUpdate, syncNetworkHint } from '#/features/network/weakNetPolicy';
import { perfMonitor } from '#/features/perf/perfMonitor';
import { useRoomStore } from '#/features/room/memberStore';
import { acquireRoomSession, getSessionPool, releaseRoomSession } from '#/features/room/roomSessionManager';
import { useRoomSettingsStore } from '#/features/room/roomSettingsStore';
import { appendTrail, clearTrails } from '#/features/trajectory/trailStore';
import type { LocationPayload } from '#/features/webrtc/protocol';

type SessionOpts = {
  roomId: string;
  peerId: string;
  displayName: string;
};

export function useRoomSession({ roomId, peerId, displayName }: SessionOpts) {
  const setLocalLocation = useRoomStore((s) => s.setLocalLocation);
  const pushEvent = useRoomStore((s) => s.pushEvent);
  const key = `${roomId}:${peerId}`;
  const lastSentRef = useRef<LocationPayload | null>(null);

  useEffect(() => {
    performance.mark('room:join-start');
    perfMonitor.reset();
    clearTrails();
    const dn = displayName.trim() || 'Guest';
    acquireRoomSession({ roomId, peerId, displayName: dn });

    const onUnload = () => {
      const pool = getSessionPool(roomId, peerId);
      pool?.closeAll();
      releaseRoomSession(key);
    };
    window.addEventListener('beforeunload', onUnload);

    return () => {
      window.removeEventListener('beforeunload', onUnload);
      releaseRoomSession(key);
    };
  }, [roomId, peerId, displayName, key]);

  const onTick = useCallback(
    (loc: Parameters<typeof setLocalLocation>[0]) => {
      if (!loc) return;
      const mode = useRoomSettingsStore.getState().weakNetMode;
      syncNetworkHint(mode);

      setLocalLocation(loc);
      appendTrail(peerId, loc);

      if (!shouldSendLocationUpdate(mode, lastSentRef.current, loc)) {
        perfMonitor.recordLocationSkipped();
        const pool = getSessionPool(roomId, peerId);
        pool?.setLocalLocation(loc);
        perfMonitor.setPeerLinkCount(pool?.getOpenLinkCount() ?? 0);
        return;
      }

      lastSentRef.current = loc;
      perfMonitor.recordLocationSend();
      const pool = getSessionPool(roomId, peerId);
      pool?.setLocalLocation(loc);
      pool?.broadcastLocation(loc);
      perfMonitor.setPeerLinkCount(pool?.getOpenLinkCount() ?? 0);
    },
    [roomId, peerId, setLocalLocation],
  );

  useGeolocation({
    enabled: true,
    getTickIntervalMs: () => getLocationTickMs(useRoomSettingsStore.getState().weakNetMode),
    onTick,
    onError: (message) => pushEvent(`定位: ${message}`),
  });

  return {};
}

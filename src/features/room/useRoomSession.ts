import { useCallback, useEffect } from 'react';
import { useGeolocation } from '#/features/location/useGeolocation';
import { useRoomStore } from '#/features/room/memberStore';
import { acquireRoomSession, getSessionPool, releaseRoomSession } from '#/features/room/roomSessionManager';

type SessionOpts = {
  roomId: string;
  peerId: string;
  displayName: string;
};

export function useRoomSession({ roomId, peerId, displayName }: SessionOpts) {
  const setLocalLocation = useRoomStore((s) => s.setLocalLocation);
  const pushEvent = useRoomStore((s) => s.pushEvent);
  const key = `${roomId}:${peerId}`;

  useEffect(() => {
    performance.mark('room:join-start');
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
      setLocalLocation(loc);
      const pool = getSessionPool(roomId, peerId);
      pool?.setLocalLocation(loc);
      pool?.broadcastLocation(loc);
    },
    [roomId, peerId, setLocalLocation],
  );

  useGeolocation({
    enabled: true,
    onTick,
    onError: (message) => pushEvent(`定位: ${message}`),
  });

  return {};
}

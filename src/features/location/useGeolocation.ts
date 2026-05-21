import { useEffect, useRef } from 'react';
import type { LocationPayload } from '#/features/webrtc/protocol';

type Options = {
  enabled: boolean;
  getTickIntervalMs: () => number;
  onTick: (loc: LocationPayload) => void;
  onError?: (message: string) => void;
};

export function useGeolocation({ enabled, getTickIntervalMs, onTick, onError }: Options) {
  const lastFix = useRef<LocationPayload | null>(null);
  const watchId = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const getTickRef = useRef(getTickIntervalMs);
  getTickRef.current = getTickIntervalMs;

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      onError?.('Geolocation unavailable');
      return;
    }

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        lastFix.current = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading ?? undefined,
          speed: pos.coords.speed ?? undefined,
          ts: Date.now(),
        };
      },
      (err) => onError?.(err.message),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );

    const arm = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const fix = lastFix.current;
        if (fix) onTick({ ...fix, ts: Date.now() });
      }, getTickRef.current());
    };

    arm();
    const rescheduler = setInterval(arm, 2000);

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(rescheduler);
    };
  }, [enabled, onTick, onError]);
}

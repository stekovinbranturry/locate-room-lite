import { useEffect, useRef } from 'react';
import type { LocationPayload } from '#/features/webrtc/protocol';
import { LOCATION_TICK_MS } from '#/lib/config';

type Options = {
  enabled: boolean;
  onTick: (loc: LocationPayload) => void;
  onError?: (message: string) => void;
};

export function useGeolocation({ enabled, onTick, onError }: Options) {
  const lastFix = useRef<LocationPayload | null>(null);
  const watchId = useRef<number | null>(null);

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

    const interval = setInterval(() => {
      const fix = lastFix.current;
      if (fix) onTick({ ...fix, ts: Date.now() });
    }, LOCATION_TICK_MS);

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      clearInterval(interval);
    };
  }, [enabled, onTick, onError]);
}

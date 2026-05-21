import { useEffect, useRef } from 'react';
import type { LocationPayload } from '#/features/webrtc/protocol';

type Options = {
  enabled: boolean;
  getTickIntervalMs: () => number;
  onTick: (loc: LocationPayload) => void;
  onError?: (message: string) => void;
};

function describeGeoError(err: GeolocationPositionError): string {
  switch (err.code) {
    case err.PERMISSION_DENIED:
      return '请允许浏览器定位权限（地址栏锁图标 → 位置）';
    case err.POSITION_UNAVAILABLE:
      return '无法获取位置：请在 macOS「系统设置 → 隐私与安全性 → 定位服务」中允许当前浏览器（不仅是网站权限）';
    case err.TIMEOUT:
      return '定位超时，仍在重试…';
    default:
      return err.message;
  }
}

function preferHighAccuracy(): boolean {
  if (typeof navigator === 'undefined') return false;
  return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
}

function positionOptions() {
  const high = preferHighAccuracy();
  return {
    enableHighAccuracy: high,
    maximumAge: high ? 10_000 : 60_000,
    timeout: high ? 20_000 : 60_000,
  } satisfies PositionOptions;
}

function toPayload(pos: GeolocationPosition): LocationPayload {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    heading: pos.coords.heading ?? undefined,
    speed: pos.coords.speed ?? undefined,
    ts: Date.now(),
  };
}

export function useGeolocation({ enabled, getTickIntervalMs, onTick, onError }: Options) {
  const lastFix = useRef<LocationPayload | null>(null);
  const watchId = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const getTickRef = useRef(getTickIntervalMs);
  const onTickRef = useRef(onTick);
  const onErrorRef = useRef(onError);
  const lastErrorRef = useRef<{ code: number; at: number } | null>(null);

  getTickRef.current = getTickIntervalMs;
  onTickRef.current = onTick;
  onErrorRef.current = onError;

  useEffect(() => {
    if (!enabled || typeof navigator === 'undefined' || !navigator.geolocation) {
      onErrorRef.current?.('当前环境不支持 Geolocation');
      return;
    }

    const applyFix = (pos: GeolocationPosition) => {
      lastErrorRef.current = null;
      lastFix.current = toPayload(pos);
    };

    const reportError = (err: GeolocationPositionError) => {
      const now = Date.now();
      const prev = lastErrorRef.current;
      if (prev && prev.code === err.code && now - prev.at < 30_000) return;
      lastErrorRef.current = { code: err.code, at: now };
      onErrorRef.current?.(describeGeoError(err));
    };

    const options = positionOptions();

    // 先 getCurrentPosition 再 watch，Mac 桌面首次 fix 更稳
    navigator.geolocation.getCurrentPosition(applyFix, () => {}, options);

    watchId.current = navigator.geolocation.watchPosition(applyFix, reportError, options);

    const arm = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        const fix = lastFix.current;
        if (fix) onTickRef.current({ ...fix, ts: Date.now() });
      }, getTickRef.current());
    };

    arm();
    const rescheduler = setInterval(arm, 2000);

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
      clearInterval(rescheduler);
    };
  }, [enabled]);
}

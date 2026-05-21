import { perfMonitor } from '#/features/perf/perfMonitor';
import type { WeakNetMode } from '#/features/room/roomSettingsStore';
import type { LocationPayload } from '#/features/webrtc/protocol';
import { distanceMeters } from '#/lib/geo';

const TICK_NORMAL_MS = 100;
const TICK_WEAK_MS = 200;
const MIN_DIST_NORMAL_M = 1.5;
const MIN_DIST_WEAK_M = 4;
const RTT_WEAK_MS = 280;

type NetworkInformation = {
  effectiveType?: string;
  saveData?: boolean;
};

function readNetwork(): { weak: boolean; type: string | null } {
  if (typeof navigator === 'undefined') return { weak: false, type: null };
  const conn = (navigator as Navigator & { connection?: NetworkInformation }).connection;
  if (!conn) return { weak: false, type: null };
  const type = conn.effectiveType ?? null;
  const weak = conn.saveData === true || type === 'slow-2g' || type === '2g' || type === '3g';
  return { weak, type };
}

export function isWeakNetActive(mode: WeakNetMode): boolean {
  if (mode === 'on') return true;
  if (mode === 'off') return false;
  const net = readNetwork();
  const rtt = perfMonitor.getRttAvg();
  return net.weak || (rtt != null && rtt >= RTT_WEAK_MS);
}

export function getLocationTickMs(mode: WeakNetMode): number {
  const weak = isWeakNetActive(mode);
  const net = readNetwork();
  perfMonitor.setNetworkHint(weak, net.type);
  return weak ? TICK_WEAK_MS : TICK_NORMAL_MS;
}

export function shouldSendLocationUpdate(
  mode: WeakNetMode,
  last: LocationPayload | null,
  next: LocationPayload,
): boolean {
  if (!last) return true;
  const minDist = isWeakNetActive(mode) ? MIN_DIST_WEAK_M : MIN_DIST_NORMAL_M;
  return distanceMeters(last, next) >= minDist;
}

export function syncNetworkHint(mode: WeakNetMode) {
  const weak = isWeakNetActive(mode);
  const net = readNetwork();
  perfMonitor.setNetworkHint(weak, net.type);
}

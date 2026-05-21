export type PerfTargets = {
  locationHz: number;
  mapFps: number;
  firstRemoteMs: number;
};

export const PERF_TARGETS: PerfTargets = {
  locationHz: 10,
  mapFps: 50,
  firstRemoteMs: 3000,
};

type Ring = number[];

function hzFromTimestamps(ring: Ring, windowMs: number): number {
  const now = performance.now();
  const recent = ring.filter((t) => now - t <= windowMs);
  if (recent.length < 2) return recent.length;
  return (recent.length / windowMs) * 1000;
}

class PerfMonitor {
  private locationSends: Ring = [];
  private mapFrames: Ring = [];
  private mapSetDataCalls: Ring = [];
  locationSentTotal = 0;
  locationSkippedTotal = 0;
  dcBytesSent = 0;
  dcBytesRecv = 0;
  peerLinkCount = 0;
  rttSamples: Ring = [];
  weakNetActive = false;
  effectiveType: string | null = null;
  firstRemoteMs: number | null = null;
  private firstRemoteResolved = false;

  recordLocationSend() {
    const t = performance.now();
    this.locationSends.push(t);
    if (this.locationSends.length > 200) this.locationSends.shift();
    this.locationSentTotal++;
  }

  recordLocationSkipped() {
    this.locationSkippedTotal++;
  }

  recordMapFrame() {
    const t = performance.now();
    this.mapFrames.push(t);
    if (this.mapFrames.length > 120) this.mapFrames.shift();
  }

  recordMapSetData() {
    const t = performance.now();
    this.mapSetDataCalls.push(t);
    if (this.mapSetDataCalls.length > 120) this.mapSetDataCalls.shift();
  }

  recordDcSent(bytes: number) {
    this.dcBytesSent += bytes;
  }

  recordDcRecv(bytes: number) {
    this.dcBytesRecv += bytes;
  }

  recordRtt(ms: number) {
    this.rttSamples.push(ms);
    if (this.rttSamples.length > 30) this.rttSamples.shift();
  }

  setPeerLinkCount(n: number) {
    this.peerLinkCount = n;
  }

  setNetworkHint(weak: boolean, effectiveType: string | null) {
    this.weakNetActive = weak;
    this.effectiveType = effectiveType;
  }

  resolveFirstRemote() {
    if (this.firstRemoteResolved) return;
    this.firstRemoteResolved = true;
    try {
      performance.measure('room:first-remote', 'room:join-start', 'room:first-remote-location');
      const entry = performance.getEntriesByName('room:first-remote').at(-1);
      if (entry) this.firstRemoteMs = Math.round(entry.duration);
    } catch {
      const join = performance.getEntriesByName('room:join-start').at(-1);
      const remote = performance.getEntriesByName('room:first-remote-location').at(-1);
      if (join && remote) this.firstRemoteMs = Math.round(remote.startTime - join.startTime);
    }
  }

  getLocationHz() {
    return Math.round(hzFromTimestamps(this.locationSends, 1000) * 10) / 10;
  }

  getMapFps() {
    return Math.round(hzFromTimestamps(this.mapFrames, 1000));
  }

  getMapSetDataPerSec() {
    return Math.round(hzFromTimestamps(this.mapSetDataCalls, 1000));
  }

  getRttAvg() {
    if (this.rttSamples.length === 0) return null;
    const sum = this.rttSamples.reduce((a, b) => a + b, 0);
    return Math.round(sum / this.rttSamples.length);
  }

  exportJson() {
    return {
      at: new Date().toISOString(),
      targets: PERF_TARGETS,
      locationHz: this.getLocationHz(),
      locationSentTotal: this.locationSentTotal,
      locationSkippedTotal: this.locationSkippedTotal,
      mapFps: this.getMapFps(),
      mapSetDataPerSec: this.getMapSetDataPerSec(),
      firstRemoteMs: this.firstRemoteMs,
      rttMsAvg: this.getRttAvg(),
      dcBytesSent: this.dcBytesSent,
      dcBytesRecv: this.dcBytesRecv,
      peerLinkCount: this.peerLinkCount,
      weakNetActive: this.weakNetActive,
      effectiveType: this.effectiveType,
    };
  }

  reset() {
    this.locationSends = [];
    this.mapFrames = [];
    this.mapSetDataCalls = [];
    this.locationSentTotal = 0;
    this.locationSkippedTotal = 0;
    this.dcBytesSent = 0;
    this.dcBytesRecv = 0;
    this.peerLinkCount = 0;
    this.rttSamples = [];
    this.weakNetActive = false;
    this.effectiveType = null;
    this.firstRemoteMs = null;
    this.firstRemoteResolved = false;
  }
}

export const perfMonitor = new PerfMonitor();

/** rAF loop for map FPS sampling — call start/stop from MapView */
let rafId: number | null = null;

export function startMapFpsSampler() {
  if (rafId != null) return;
  const tick = () => {
    perfMonitor.recordMapFrame();
    rafId = requestAnimationFrame(tick);
  };
  rafId = requestAnimationFrame(tick);
}

export function stopMapFpsSampler() {
  if (rafId != null) cancelAnimationFrame(rafId);
  rafId = null;
}

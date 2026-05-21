import type { LocationPayload } from '#/features/webrtc/protocol';

const MAX_POINTS = 150;

const trails = new Map<string, [number, number][]>();

export function appendTrail(peerId: string, loc: LocationPayload) {
  const pts = trails.get(peerId) ?? [];
  const next: [number, number][] = [...pts, [loc.lng, loc.lat]];
  trails.set(peerId, next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next);
}

export function removeTrail(peerId: string) {
  trails.delete(peerId);
}

export function clearTrails() {
  trails.clear();
}

export function trailsToGeoJSON(): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  for (const [peerId, coordinates] of trails) {
    if (coordinates.length < 2) continue;
    features.push({
      type: 'Feature',
      properties: { peerId },
      geometry: { type: 'LineString', coordinates },
    });
  }
  return { type: 'FeatureCollection', features };
}

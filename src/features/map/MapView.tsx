import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import { perfMonitor, startMapFpsSampler, stopMapFpsSampler } from '#/features/perf/perfMonitor';
import { useRoomStore } from '#/features/room/memberStore';
import { useRoomSettingsStore } from '#/features/room/roomSettingsStore';
import { trailsToGeoJSON } from '#/features/trajectory/trailStore';
import type { LocationPayload } from '#/features/webrtc/protocol';

function toFeatureCollection(
  localPeerId: string,
  localLoc: LocationPayload | null,
  peers: Record<string, { location: LocationPayload | null }>,
) {
  const features: GeoJSON.Feature[] = [];

  if (localLoc) {
    features.push({
      type: 'Feature',
      id: localPeerId,
      properties: { peerId: localPeerId, isLocal: true, name: '我' },
      geometry: { type: 'Point', coordinates: [localLoc.lng, localLoc.lat] },
    });
  }

  for (const [peerId, p] of Object.entries(peers)) {
    if (!p.location) continue;
    features.push({
      type: 'Feature',
      id: peerId,
      properties: { peerId, isLocal: false },
      geometry: { type: 'Point', coordinates: [p.location.lng, p.location.lat] },
    });
  }

  return { type: 'FeatureCollection' as const, features };
}

export default function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const rafRef = useRef<number | null>(null);
  const showTrails = useRoomSettingsStore((s) => s.showTrails);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    startMapFpsSampler();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://demotiles.maplibre.org/style.json',
      center: [116.3974, 39.9093],
      zoom: 12,
      attributionControl: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');

    map.on('load', () => {
      map.addSource('peers', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'peerId',
      });

      map.addSource('trails', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      });

      map.addLayer({
        id: 'trails-line',
        type: 'line',
        source: 'trails',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: {
          'line-color': '#4fb8b2',
          'line-width': 3,
          'line-opacity': 0.55,
        },
      });

      map.addLayer({
        id: 'peers-halo',
        type: 'circle',
        source: 'peers',
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'isLocal'], false], 14, 11],
          'circle-color': ['case', ['boolean', ['get', 'isLocal'], false], '#4fb8b2', '#94a3b8'],
          'circle-opacity': 0.35,
        },
      });

      map.addLayer({
        id: 'peers-dot',
        type: 'circle',
        source: 'peers',
        paint: {
          'circle-radius': ['case', ['boolean', ['get', 'isLocal'], false], 8, 6],
          'circle-color': ['case', ['boolean', ['get', 'isLocal'], false], '#2f6a4a', '#475569'],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });
    });

    mapRef.current = map;

    const scheduleUpdate = () => {
      if (rafRef.current != null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        const m = mapRef.current;
        if (!m?.isStyleLoaded()) return;

        const state = useRoomStore.getState();
        const peerSrc = m.getSource('peers') as maplibregl.GeoJSONSource | undefined;
        if (peerSrc) {
          peerSrc.setData(toFeatureCollection(state.localPeerId, state.localLocation, state.peers));
          perfMonitor.recordMapSetData();
        }

        const trailSrc = m.getSource('trails') as maplibregl.GeoJSONSource | undefined;
        if (trailSrc && useRoomSettingsStore.getState().showTrails) {
          trailSrc.setData(trailsToGeoJSON());
          perfMonitor.recordMapSetData();
        }

        const all = [
          ...(state.localLocation ? [[state.localLocation.lng, state.localLocation.lat]] : []),
          ...Object.values(state.peers)
            .filter((p): p is typeof p & { location: LocationPayload } => p.location != null)
            .map((p) => [p.location.lng, p.location.lat] as [number, number]),
        ];
        if (all.length === 1) m.easeTo({ center: all[0], zoom: Math.max(m.getZoom(), 14) });
      });
    };

    const unsub = useRoomStore.subscribe(scheduleUpdate);
    const unsubTrails = useRoomSettingsStore.subscribe(scheduleUpdate);

    return () => {
      unsub();
      unsubTrails();
      stopMapFpsSampler();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const m = mapRef.current;
    if (!m?.isStyleLoaded()) return;
    const trailSrc = m.getSource('trails') as maplibregl.GeoJSONSource | undefined;
    if (!trailSrc) return;
    if (showTrails) {
      trailSrc.setData(trailsToGeoJSON());
      m.setLayoutProperty('trails-line', 'visibility', 'visible');
    } else {
      m.setLayoutProperty('trails-line', 'visibility', 'none');
    }
  }, [showTrails]);

  return <div ref={containerRef} className="h-full w-full touch-none" />;
}

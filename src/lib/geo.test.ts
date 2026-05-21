import { describe, expect, it } from 'vitest';
import { distanceMeters } from '#/lib/geo';

describe('distanceMeters', () => {
  it('returns 0 for same point', () => {
    const p = { lat: 39.9, lng: 116.4, ts: 0 };
    expect(distanceMeters(p, p)).toBe(0);
  });

  it('returns positive distance for offset', () => {
    const a = { lat: 39.9, lng: 116.4, ts: 0 };
    const b = { lat: 39.901, lng: 116.401, ts: 0 };
    expect(distanceMeters(a, b)).toBeGreaterThan(100);
  });
});

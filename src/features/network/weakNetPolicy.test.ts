import { describe, expect, it } from 'vitest';
import { shouldSendLocationUpdate } from '#/features/network/weakNetPolicy';
import type { LocationPayload } from '#/features/webrtc/protocol';

const base: LocationPayload = { lat: 39.9, lng: 116.4, ts: 1 };

describe('shouldSendLocationUpdate', () => {
  it('always sends first fix', () => {
    expect(shouldSendLocationUpdate('off', null, base)).toBe(true);
  });

  it('skips tiny movement in normal mode', () => {
    const next = { ...base, lat: base.lat + 0.000001, lng: base.lng + 0.000001 };
    expect(shouldSendLocationUpdate('off', base, next)).toBe(false);
  });
});

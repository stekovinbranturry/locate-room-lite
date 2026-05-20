import { describe, expect, it } from 'vitest';
import { encodeDataChannelMessage, parseDataChannelMessage, shouldInitiateOffer } from '#/features/webrtc/protocol';

describe('shouldInitiateOffer', () => {
  it('smaller peerId initiates', () => {
    expect(shouldInitiateOffer('aaa', 'bbb')).toBe(true);
    expect(shouldInitiateOffer('bbb', 'aaa')).toBe(false);
  });
});

describe('parseDataChannelMessage', () => {
  it('parses update', () => {
    const raw = encodeDataChannelMessage({
      t: 'update',
      peerId: 'p1',
      loc: { lat: 1, lng: 2, ts: 3 },
    });
    const msg = parseDataChannelMessage(raw);
    expect(msg?.t).toBe('update');
    if (msg?.t === 'update') {
      expect(msg.loc.lat).toBe(1);
    }
  });

  it('rejects invalid json', () => {
    expect(parseDataChannelMessage('not json')).toBeNull();
  });
});

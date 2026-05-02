import { describe, it, expect, beforeAll } from 'vitest';
import { mintToken, verifyToken } from '../signing/hmac';

beforeAll(() => {
  process.env.SALES_ROOM_SIGNING_SECRET = 'unit-test-secret-must-be-at-least-32-chars-long-xx';
});

describe('hmac signing', () => {
  it('round-trips a preview token', () => {
    const m = mintToken({ assetId: 'asset-1', scope: 'preview' });
    const v = verifyToken({ token: m.token, assetId: 'asset-1', scope: 'preview' });
    expect(v.ok).toBe(true);
    if (v.ok === true) expect(v.expiresAt).toBe(m.expiresAt);
  });

  it('round-trips a download token bound to a roomCode', () => {
    const m = mintToken({ assetId: 'a-2', scope: 'download', roomCode: 'riyadbank-26q2' });
    const v = verifyToken({ token: m.token, assetId: 'a-2', scope: 'download', roomCode: 'riyadbank-26q2' });
    expect(v.ok).toBe(true);
  });

  it('rejects a token replayed on a different room', () => {
    const m = mintToken({ assetId: 'a-3', scope: 'preview', roomCode: 'roomA' });
    const v = verifyToken({ token: m.token, assetId: 'a-3', scope: 'preview', roomCode: 'roomB' });
    expect(v.ok).toBe(false);
    if (v.ok === false) expect(v.reason).toBe('bad_signature');
  });

  it('rejects scope mismatch (preview token used as download)', () => {
    const m = mintToken({ assetId: 'a-4', scope: 'preview' });
    const v = verifyToken({ token: m.token, assetId: 'a-4', scope: 'download' });
    expect(v.ok).toBe(false);
    if (v.ok === false) expect(v.reason).toBe('bad_signature');
  });

  it('rejects asset substitution', () => {
    const m = mintToken({ assetId: 'a-5', scope: 'preview' });
    const v = verifyToken({ token: m.token, assetId: 'a-different', scope: 'preview' });
    expect(v.ok).toBe(false);
    if (v.ok === false) expect(v.reason).toBe('bad_signature');
  });

  it('rejects expired tokens', () => {
    const m = mintToken({ assetId: 'a-6', scope: 'preview', ttlSeconds: -1 });
    const v = verifyToken({ token: m.token, assetId: 'a-6', scope: 'preview' });
    expect(v.ok).toBe(false);
    if (v.ok === false) expect(v.reason).toBe('expired');
  });

  it('rejects malformed tokens', () => {
    const v = verifyToken({ token: 'not-a-real-token', assetId: 'a-7', scope: 'preview' });
    expect(v.ok).toBe(false);
    if (v.ok === false) expect(v.reason).toBe('malformed');
  });

  it('rejects tampered signature', () => {
    const m = mintToken({ assetId: 'a-8', scope: 'preview' });
    const tampered = m.token.replace(/.$/, c => (c === 'A' ? 'B' : 'A'));
    const v = verifyToken({ token: tampered, assetId: 'a-8', scope: 'preview' });
    expect(v.ok).toBe(false);
    if (v.ok === false) {
      expect(['bad_signature', 'malformed']).toContain(v.reason);
    }
  });

  it('honors ip-bind hash mismatch', () => {
    const m = mintToken({ assetId: 'a-9', scope: 'preview', ipBindHash: 'hash-A' });
    const v = verifyToken({ token: m.token, assetId: 'a-9', scope: 'preview', ipBindHash: 'hash-B' });
    expect(v.ok).toBe(false);
    if (v.ok === false) expect(v.reason).toBe('ip_mismatch');
  });
});

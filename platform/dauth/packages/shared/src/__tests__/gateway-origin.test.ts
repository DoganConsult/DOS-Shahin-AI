/**
 * Wave 1 — gateway-origin signer/verifier + middleware contract tests.
 *
 * Locks the trust-boundary contract before any service code starts using
 * it. No skips, no mocks across the auth boundary — only an in-memory
 * replay registry and a fixed clock. Failures here mean the trust
 * boundary is broken: do NOT relax the assertions.
 */
import { describe, expect, it } from 'vitest';
import {
  GATEWAY_ORIGIN_HEADER,
  STRIPPED_INBOUND_HEADERS,
  createInMemoryReplayRegistry,
  signGatewayOrigin,
  verifyGatewayOrigin,
} from '../gateway-origin';
import { requireGatewayOrigin } from '../middleware/gateway-origin.middleware';

const SECRET = 'a'.repeat(64); // 64 chars, well above the 32-char floor
const SECRET_OTHER = 'b'.repeat(64);

function makeRes() {
  const res: any = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
  return res;
}

function makeReq(headers: Record<string, string> = {}, originalUrl = '/test') {
  return {
    headers: { ...headers },
    originalUrl,
  } as any;
}

// ───────── signer

describe('signGatewayOrigin', () => {
  it('rejects a too-short secret', () => {
    expect(() => signGatewayOrigin(
      { sub: 'u1', email: 'u1@x' },
      'short',
    )).toThrow(/secret must be ≥ 32/);
  });

  it('rejects missing sub', () => {
    expect(() => signGatewayOrigin(
      { sub: '', email: 'u1@x' },
      SECRET,
    )).toThrow(/sub is required/);
  });

  it('rejects missing email', () => {
    expect(() => signGatewayOrigin(
      { sub: 'u1', email: '' },
      SECRET,
    )).toThrow(/email is required/);
  });

  it('produces a token with two base64url segments separated by `.`', () => {
    const token = signGatewayOrigin(
      { sub: 'u1', email: 'u1@x', tenantId: 't1', roles: ['member'] },
      SECRET,
    );
    expect(token.split('.')).toHaveLength(2);
    // base64url alphabet only
    expect(token).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });
});

// ───────── verifier

describe('verifyGatewayOrigin', () => {
  function freshRegistry() {
    return createInMemoryReplayRegistry();
  }

  it('round-trips a valid token', () => {
    const replay = freshRegistry();
    const now = 1_000_000;
    const token = signGatewayOrigin(
      { sub: 'u1', email: 'u1@x', tenantId: 't1', roles: ['admin'], nowSeconds: now },
      SECRET,
    );
    const r = verifyGatewayOrigin(token, { secret: SECRET, replayRegistry: replay, nowSeconds: now });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.principal.sub).toBe('u1');
      expect(r.principal.tenantId).toBe('t1');
      expect(r.principal.email).toBe('u1@x');
      expect(r.principal.roles).toEqual(['admin']);
      expect(r.payload.src).toBe('gateway');
      expect(r.payload.v).toBe(1);
    }
  });

  it('rejects MISSING when token is empty / null / undefined', () => {
    const replay = freshRegistry();
    for (const t of ['', null, undefined]) {
      const r = verifyGatewayOrigin(t as any, { secret: SECRET, replayRegistry: replay });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.reason).toBe('MISSING');
    }
  });

  it('rejects MALFORMED on garbage', () => {
    const replay = freshRegistry();
    for (const t of ['not-a-token', 'a.b.c', 'noDot', '.onlyDot', 'pre.']) {
      const r = verifyGatewayOrigin(t, { secret: SECRET, replayRegistry: replay });
      expect(r.ok).toBe(false);
      if (!r.ok) {
        expect(['MALFORMED', 'BAD_HMAC', 'PAYLOAD_INVALID']).toContain(r.reason);
      }
    }
  });

  it('rejects BAD_HMAC when signed with a different secret', () => {
    const replay = freshRegistry();
    const token = signGatewayOrigin(
      { sub: 'u1', email: 'u1@x', tenantId: 't1' },
      SECRET_OTHER,
    );
    const r = verifyGatewayOrigin(token, { secret: SECRET, replayRegistry: replay });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('BAD_HMAC');
  });

  it('rejects EXPIRED tokens beyond the skew window', () => {
    const replay = freshRegistry();
    const iat = 1_000_000;
    const token = signGatewayOrigin(
      { sub: 'u1', email: 'u1@x', tenantId: 't1', ttlSeconds: 60, nowSeconds: iat },
      SECRET,
    );
    // 60s TTL + 5s skew = valid up to t=1_000_065. Verify at t=1_000_100.
    const r = verifyGatewayOrigin(token, { secret: SECRET, replayRegistry: replay, nowSeconds: 1_000_100 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('EXPIRED');
  });

  it('accepts tokens within the skew window', () => {
    const replay = freshRegistry();
    const iat = 1_000_000;
    const token = signGatewayOrigin(
      { sub: 'u1', email: 'u1@x', tenantId: 't1', ttlSeconds: 60, nowSeconds: iat },
      SECRET,
    );
    // exp = 1_000_060; verify at 1_000_063 (within +5s skew).
    const r = verifyGatewayOrigin(token, { secret: SECRET, replayRegistry: replay, nowSeconds: 1_000_063 });
    expect(r.ok).toBe(true);
  });

  it('rejects NOT_YET_VALID tokens (clock-drifted future iat)', () => {
    const replay = freshRegistry();
    const iat = 1_000_100;
    const token = signGatewayOrigin(
      { sub: 'u1', email: 'u1@x', tenantId: 't1', nowSeconds: iat },
      SECRET,
    );
    // Verify at t=1_000_000 (100s before iat) — skew is only 5s.
    const r = verifyGatewayOrigin(token, { secret: SECRET, replayRegistry: replay, nowSeconds: 1_000_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('NOT_YET_VALID');
  });

  it('rejects REPLAYED tokens within the TTL window', () => {
    const replay = freshRegistry();
    const now = 1_000_000;
    const token = signGatewayOrigin(
      { sub: 'u1', email: 'u1@x', tenantId: 't1', jti: 'fixed-jti', nowSeconds: now },
      SECRET,
    );
    const first = verifyGatewayOrigin(token, { secret: SECRET, replayRegistry: replay, nowSeconds: now });
    expect(first.ok).toBe(true);
    const second = verifyGatewayOrigin(token, { secret: SECRET, replayRegistry: replay, nowSeconds: now + 1 });
    expect(second.ok).toBe(false);
    if (!second.ok) expect(second.reason).toBe('REPLAYED');
  });

  it('rejects WRONG_SOURCE if the payload claims a non-gateway src', () => {
    // Hand-forge a payload with src='evil' and sign it with the real secret.
    // This proves we reject *any* shape that didn't come from the canonical
    // signer, even if HMAC is correct.
    const crypto = require('node:crypto');
    const payload = {
      iat: 1_000_000, exp: 1_000_060, jti: 'j1',
      sub: 'u1', tenantId: 't1', email: 'u1@x', roles: [],
      src: 'evil', v: 1,
    };
    const b64 = Buffer.from(JSON.stringify(payload), 'utf8')
      .toString('base64')
      .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64')
      .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const token = `${b64}.${sig}`;
    const replay = createInMemoryReplayRegistry();
    const r = verifyGatewayOrigin(token, { secret: SECRET, replayRegistry: replay, nowSeconds: 1_000_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('WRONG_SOURCE');
  });

  it('rejects WRONG_VERSION if the payload claims a non-1 schema', () => {
    const crypto = require('node:crypto');
    const payload = {
      iat: 1_000_000, exp: 1_000_060, jti: 'j2',
      sub: 'u1', tenantId: 't1', email: 'u1@x', roles: [],
      src: 'gateway', v: 99,
    };
    const b64 = Buffer.from(JSON.stringify(payload), 'utf8')
      .toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const sig = crypto.createHmac('sha256', SECRET).update(b64).digest('base64')
      .replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
    const replay = createInMemoryReplayRegistry();
    const r = verifyGatewayOrigin(`${b64}.${sig}`, { secret: SECRET, replayRegistry: replay, nowSeconds: 1_000_000 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('WRONG_VERSION');
  });
});

// ───────── middleware

describe('requireGatewayOrigin middleware', () => {
  it('LEGACY_HEADER_TRUST=false + missing token → 401 MISSING_GATEWAY_TOKEN', () => {
    const mw = requireGatewayOrigin({
      resolveSecret: () => SECRET,
      resolveLegacyTrust: () => false,
      replayRegistry: createInMemoryReplayRegistry(),
      logger: { info: () => {}, warn: () => {} },
    });
    const req = makeReq({ 'x-user-sub': 'spoofed', 'x-tenant-id': 'tenant-A' });
    const res = makeRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: 'MISSING_GATEWAY_TOKEN' });
    // Critical: spoofed headers were NOT trusted.
    expect(req.principal).toBeUndefined();
  });

  it('LEGACY_HEADER_TRUST=true + missing token + missing legacy headers → 401', () => {
    const mw = requireGatewayOrigin({
      resolveSecret: () => SECRET,
      resolveLegacyTrust: () => true,
      replayRegistry: createInMemoryReplayRegistry(),
      logger: { info: () => {}, warn: () => {} },
    });
    const req = makeReq({});
    const res = makeRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect(res.body).toMatchObject({ code: 'MISSING_PRINCIPAL' });
  });

  it('LEGACY_HEADER_TRUST=true + missing token + legacy headers → falls back', () => {
    const mw = requireGatewayOrigin({
      resolveSecret: () => SECRET,
      resolveLegacyTrust: () => true,
      replayRegistry: createInMemoryReplayRegistry(),
      logger: { info: () => {}, warn: () => {} },
    });
    const req = makeReq({
      'x-user-sub': 'u-legacy',
      'x-user-email': 'u-legacy@x',
      'x-tenant-id': 'tenant-legacy',
      'x-user-roles': 'member,admin',
    });
    const res = makeRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect(req.principal).toMatchObject({
      sub: 'u-legacy',
      tenantId: 'tenant-legacy',
      email: 'u-legacy@x',
      roles: ['member', 'admin'],
    });
  });

  it('valid signed token always wins over legacy headers (token is truth)', () => {
    const mw = requireGatewayOrigin({
      resolveSecret: () => SECRET,
      resolveLegacyTrust: () => true, // even in legacy mode
      replayRegistry: createInMemoryReplayRegistry(),
      logger: { info: () => {}, warn: () => {} },
    });
    const token = signGatewayOrigin(
      { sub: 'u-token', email: 'u-token@x', tenantId: 'tenant-token', roles: ['owner'] },
      SECRET,
    );
    const req = makeReq({
      [GATEWAY_ORIGIN_HEADER]: token,
      // Spoofed legacy headers; verifier MUST ignore.
      'x-user-sub': 'attacker',
      'x-tenant-id': 'tenant-attacker',
    });
    const res = makeRes();
    let nextCalled = false;
    mw(req, res, () => { nextCalled = true; });
    expect(nextCalled).toBe(true);
    expect(req.principal?.sub).toBe('u-token');
    expect(req.principal?.tenantId).toBe('tenant-token');
    // Back-compat sync:
    expect(req.tenantId).toBe('tenant-token');
    expect(req.user?.userId).toBe('u-token');
  });

  it('expired token → 401 EXPIRED in BOTH dual modes', () => {
    for (const legacy of [true, false]) {
      const mw = requireGatewayOrigin({
        resolveSecret: () => SECRET,
        resolveLegacyTrust: () => legacy,
        replayRegistry: createInMemoryReplayRegistry(),
        clockSkewSeconds: 0,
        logger: { info: () => {}, warn: () => {} },
      });
      // Expired by construction: ttl=5s, current time we don't control; sign
      // with iat far in the past so any "now" in the test is past exp.
      const token = signGatewayOrigin(
        { sub: 'u', email: 'u@x', tenantId: 't', ttlSeconds: 5, nowSeconds: 1 },
        SECRET,
      );
      const req = makeReq({ [GATEWAY_ORIGIN_HEADER]: token });
      const res = makeRes();
      let nextCalled = false;
      mw(req, res, () => { nextCalled = true; });
      expect(nextCalled).toBe(false);
      expect(res.statusCode).toBe(401);
      expect(res.body).toMatchObject({ code: 'EXPIRED' });
    }
  });

  it('replay (same token twice) → first allow, second 401 REPLAYED', () => {
    const replay = createInMemoryReplayRegistry();
    const mw = requireGatewayOrigin({
      resolveSecret: () => SECRET,
      resolveLegacyTrust: () => false,
      replayRegistry: replay,
      logger: { info: () => {}, warn: () => {} },
    });
    const token = signGatewayOrigin(
      { sub: 'u', email: 'u@x', tenantId: 't', jti: 'jti-replay-test' },
      SECRET,
    );

    // First request
    const req1 = makeReq({ [GATEWAY_ORIGIN_HEADER]: token });
    const res1 = makeRes();
    let n1 = false;
    mw(req1, res1, () => { n1 = true; });
    expect(n1).toBe(true);
    expect(req1.principal?.sub).toBe('u');

    // Second request — same token, must be rejected.
    const req2 = makeReq({ [GATEWAY_ORIGIN_HEADER]: token });
    const res2 = makeRes();
    let n2 = false;
    mw(req2, res2, () => { n2 = true; });
    expect(n2).toBe(false);
    expect(res2.statusCode).toBe(401);
    expect(res2.body).toMatchObject({ code: 'REPLAYED' });
  });

  it('STRIPPED_INBOUND_HEADERS contains every identity header the gateway must strip', () => {
    // This is a contract list; the gateway server.ts consumes it. If anyone
    // adds a new identity header, this list must grow alongside it.
    expect(STRIPPED_INBOUND_HEADERS).toEqual(expect.arrayContaining([
      'x-dos-gateway-token',
      'x-user-sub',
      'x-user-id',
      'x-user-email',
      'x-user-name',
      'x-user-roles',
      'x-tenant-id',
      'x-tenant-code',
      'x-platform-super-admin',
    ]));
  });
});

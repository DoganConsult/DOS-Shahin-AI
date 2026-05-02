/**
 * Regression tests for the canonical-middleware ↔ TokenVerifier-port wiring
 * and the legacy-HS256 kill-switch.
 *
 * These tests lock the two invariants the Keycloak-enforcement cutover
 * depends on:
 *
 *   1. When the TokenVerifier factory is initialised, `authenticate` goes
 *      through `primary.verify()` — it does NOT inline `jwt.verify` any
 *      more. We prove this by registering a verifier that returns a
 *      deterministic payload and asserting the middleware reads it.
 *
 *   2. Under `DAUTH_KEYCLOAK_ENFORCE=true` + `DAUTH_ACCEPT_NATIVE_HS256=false`,
 *      an HS256-signed token is rejected with 401 `LEGACY_TOKEN_REJECTED`
 *      even when the native verifier accepts it. This is the mechanism
 *      that cuts all live DAuth-issued sessions over to Keycloak RS256.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Request, Response } from 'express';
import * as jwt from 'jsonwebtoken';
import { createCanonicalAuthMiddleware } from '../canonical-middleware';
import {
  initTokenVerifierFactory,
  registerKeycloakVerifier,
  resetTokenVerifierFactory,
} from '../token-verifier-factory';
import type { TokenVerifier, MinimalAuthPayload } from '../dauth-ports/token-verifier.port';

const TEST_SECRET = 'test-secret-32-char-minimum-xxxxx';

interface MockRes {
  statusCode: number;
  body: unknown;
  status(code: number): MockRes;
  json(payload: unknown): MockRes;
}

function mockRes(): MockRes {
  const res: MockRes = {
    statusCode: 200,
    body: null,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res;
}

function mockReq(headers: Record<string, string> = {}): Request {
  return { headers, originalUrl: '/api/protected' } as unknown as Request;
}

function buildNativePayload(): MinimalAuthPayload {
  return {
    userId: 'u-native',
    email: 'native@example.com',
    tenantId: 't-native',
    role: 'user',
    jti: 'jti-native',
  };
}

function buildKcPayload(): MinimalAuthPayload {
  return {
    userId: 'u-kc',
    email: 'kc@example.com',
    tenantId: 't-kc',
    role: 'tenant_owner',
    jti: 'jti-kc',
  };
}

describe('canonical-middleware ↔ TokenVerifier port', () => {
  const prevEnforce = process.env.DAUTH_KEYCLOAK_ENFORCE;
  const prevAcceptLegacy = process.env.DAUTH_ACCEPT_NATIVE_HS256;
  const prevJwtSecret = process.env.JWT_SECRET;

  beforeEach(() => {
    resetTokenVerifierFactory();
    delete process.env.DAUTH_KEYCLOAK_ENFORCE;
    delete process.env.DAUTH_ACCEPT_NATIVE_HS256;
    process.env.JWT_SECRET = TEST_SECRET;
  });

  afterEach(() => {
    resetTokenVerifierFactory();
    if (prevEnforce === undefined) delete process.env.DAUTH_KEYCLOAK_ENFORCE;
    else process.env.DAUTH_KEYCLOAK_ENFORCE = prevEnforce;
    if (prevAcceptLegacy === undefined) delete process.env.DAUTH_ACCEPT_NATIVE_HS256;
    else process.env.DAUTH_ACCEPT_NATIVE_HS256 = prevAcceptLegacy;
    if (prevJwtSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevJwtSecret;
  });

  it('authenticate() goes through the factory primary verifier (not inline jwt.verify)', async () => {
    // Initialise the factory with a native verifier that returns a
    // predetermined payload regardless of the token contents.
    initTokenVerifierFactory<MinimalAuthPayload>({
      nativeVerify: async () => buildNativePayload(),
    });

    const mw = createCanonicalAuthMiddleware({ isBlacklisted: async () => false });
    // Sign a token whose contents *differ* from what the verifier returns,
    // so if the middleware inlined jwt.verify(getSecret) it would set
    // req.user to the raw claims rather than the verifier's output.
    const token = jwt.sign({ userId: 'u-raw', tenantId: 't-raw', role: 'raw' }, TEST_SECRET);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    let nextCalled = false;
    await mw.authenticate(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
    const user = (req as any).user;
    expect(user.userId).toBe('u-native');
    expect(user.tenantId).toBe('t-native');
  });

  it('authenticate() falls back to jwt.verify when the factory is not initialised', async () => {
    const mw = createCanonicalAuthMiddleware({ isBlacklisted: async () => false });
    const token = jwt.sign(
      { userId: 'u-fallback', tenantId: 't-fallback', role: 'user', jti: 'fb-jti' },
      TEST_SECRET,
    );
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    let nextCalled = false;
    await mw.authenticate(req, res as unknown as Response, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect((req as any).user.userId).toBe('u-fallback');
  });

  it('rejects HS256 with 401 LEGACY_TOKEN_REJECTED under ENFORCE + ACCEPT_NATIVE=false', async () => {
    process.env.DAUTH_KEYCLOAK_ENFORCE = 'true';
    process.env.DAUTH_ACCEPT_NATIVE_HS256 = 'false';

    // Initialise factory with a native verifier that would normally accept.
    initTokenVerifierFactory<MinimalAuthPayload>({
      nativeVerify: async () => buildNativePayload(),
    });

    const mw = createCanonicalAuthMiddleware({ isBlacklisted: async () => false });
    const token = jwt.sign({ userId: 'u' }, TEST_SECRET);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    let nextCalled = false;
    await mw.authenticate(req, res as unknown as Response, () => {
      nextCalled = true;
    });

    expect(nextCalled).toBe(false);
    expect(res.statusCode).toBe(401);
    expect((res.body as any)?.code).toBe('LEGACY_TOKEN_REJECTED');
  });

  it('accepts HS256 under ENFORCE when ACCEPT_NATIVE_HS256=true (transitional mode)', async () => {
    process.env.DAUTH_KEYCLOAK_ENFORCE = 'true';
    process.env.DAUTH_ACCEPT_NATIVE_HS256 = 'true';

    initTokenVerifierFactory<MinimalAuthPayload>({
      nativeVerify: async () => buildNativePayload(),
    });

    const mw = createCanonicalAuthMiddleware({ isBlacklisted: async () => false });
    const token = jwt.sign({ userId: 'u' }, TEST_SECRET);
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    let nextCalled = false;
    await mw.authenticate(req, res as unknown as Response, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
  });

  it('routes RS256 tokens through the Keycloak verifier when ENFORCE=true', async () => {
    process.env.DAUTH_KEYCLOAK_ENFORCE = 'true';
    process.env.DAUTH_ACCEPT_NATIVE_HS256 = 'false';

    // Init native + register a Keycloak verifier; factory promotes KC to
    // primary under ENFORCE.
    initTokenVerifierFactory<MinimalAuthPayload>({
      nativeVerify: async () => buildNativePayload(),
    });
    const kc: TokenVerifier<MinimalAuthPayload> = {
      name: 'keycloak',
      verify: async () => ({ payload: buildKcPayload(), source: 'keycloak' }),
    };
    registerKeycloakVerifier<MinimalAuthPayload>(kc);

    const mw = createCanonicalAuthMiddleware({ isBlacklisted: async () => false });
    // RS256-shaped tokens are opaque to this test — we just need the
    // middleware to route through the primary verifier and NOT trip the
    // legacy-HS256 gate. Craft an RS256-like header so `peekAlg` reports
    // RS256 even though the token is unsigned from jsonwebtoken's POV.
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: 'kc-user' })).toString('base64url');
    const fakeSig = 'AAAA';
    const token = `${header}.${payload}.${fakeSig}`;
    const req = mockReq({ authorization: `Bearer ${token}` });
    const res = mockRes();
    let nextCalled = false;
    await mw.authenticate(req, res as unknown as Response, () => {
      nextCalled = true;
    });
    expect(nextCalled).toBe(true);
    expect(res.statusCode).toBe(200);
    expect((req as any).user.userId).toBe('u-kc');
  });
});

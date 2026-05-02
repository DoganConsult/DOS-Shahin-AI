/**
 * KeycloakTokenVerifier — multi-issuer acceptance.
 *
 * The real regression this locks in: when the platform fronts the same
 * Keycloak realm behind multiple branded auth hosts (e.g.
 * `auth.shahin-ai.com` for Shahin product and `auth.dogan-ai.com` for
 * platform admin), the verifier must accept tokens minted on either
 * host — their `iss` claim differs even though the JWKS is identical.
 *
 * Before multi-issuer support, a single pinned `KEYCLOAK_ISSUER` env
 * caused tokens from the other host to be rejected with `ISSUER` at
 * jwt.verify(), surfacing as a 401 on first `/api/*` call post-login.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { generateKeyPairSync } from 'crypto';
import * as jwt from 'jsonwebtoken';
import { KeycloakTokenVerifier } from '../adapters/keycloak-token-verifier';

type Jwk = {
  kid: string;
  kty: 'RSA';
  use: 'sig';
  alg: 'RS256';
  n: string;
  e: string;
};

interface TestKey {
  privateKeyPem: string;
  jwk: Jwk;
}

const KID = 'test-kid-1';

function makeTestKey(): TestKey {
  const { publicKey, privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({ type: 'pkcs1', format: 'pem' }).toString();

  const pubJwk = publicKey.export({ format: 'jwk' }) as {
    kty: string;
    n: string;
    e: string;
  };

  const jwk: Jwk = {
    kid: KID,
    kty: 'RSA',
    use: 'sig',
    alg: 'RS256',
    n: pubJwk.n,
    e: pubJwk.e,
  };
  return { privateKeyPem, jwk };
}

function signToken(privateKeyPem: string, claims: Record<string, unknown>): string {
  return jwt.sign(claims, privateKeyPem, {
    algorithm: 'RS256',
    keyid: KID,
    expiresIn: '5m',
  });
}

function mockFetch(jwk: Jwk): typeof fetch {
  return (async () => ({
    ok: true,
    status: 200,
    statusText: 'OK',
    json: async () => ({ keys: [jwk] }),
  })) as unknown as typeof fetch;
}

const AUDIENCE = 'shahin-bff';
const DOGAN_ISS = 'https://auth.dogan-ai.com/realms/dogan';
const SHAHIN_ISS = 'https://auth.shahin-ai.com/realms/dogan';
const OTHER_ISS = 'https://auth.evil.example.com/realms/dogan';

describe('KeycloakTokenVerifier — multi-issuer', () => {
  let key: TestKey;

  beforeAll(() => {
    key = makeTestKey();
  });

  it('accepts a token whose iss matches a single-string issuer', async () => {
    const verifier = new KeycloakTokenVerifier({
      jwksUrl: 'https://ignored.example.com/certs',
      issuer: DOGAN_ISS,
      audience: AUDIENCE,
      fetchImpl: mockFetch(key.jwk),
    });
    const token = signToken(key.privateKeyPem, {
      sub: 'u1',
      iss: DOGAN_ISS,
      aud: AUDIENCE,
      email: 'u1@example.com',
    });
    const res = await verifier.verify(token);
    expect(res.source).toBe('keycloak');
    expect(res.payload.userId).toBe('u1');
  });

  it('rejects a token whose iss does not match a single-string issuer', async () => {
    const verifier = new KeycloakTokenVerifier({
      jwksUrl: 'https://ignored.example.com/certs',
      issuer: DOGAN_ISS,
      audience: AUDIENCE,
      fetchImpl: mockFetch(key.jwk),
    });
    const token = signToken(key.privateKeyPem, {
      sub: 'u1',
      iss: SHAHIN_ISS,
      aud: AUDIENCE,
      email: 'u1@example.com',
    });
    // Use duck-typing rather than `instanceof` — module-instance duplication
    // under vite's transform pipeline can surface two distinct class objects
    // named `InvalidTokenError`, breaking `instanceof` while the runtime
    // shape is identical.
    await expect(verifier.verify(token)).rejects.toMatchObject({
      name: 'InvalidTokenError',
      code: 'ISSUER',
    });
  });

  it('accepts a token whose iss matches the FIRST entry of a multi-issuer array', async () => {
    const verifier = new KeycloakTokenVerifier({
      jwksUrl: 'https://ignored.example.com/certs',
      issuer: [DOGAN_ISS, SHAHIN_ISS],
      audience: AUDIENCE,
      fetchImpl: mockFetch(key.jwk),
    });
    const token = signToken(key.privateKeyPem, {
      sub: 'admin-user',
      iss: DOGAN_ISS,
      aud: AUDIENCE,
      email: 'admin@example.com',
    });
    const res = await verifier.verify(token);
    expect(res.payload.userId).toBe('admin-user');
  });

  it('accepts a token whose iss matches the SECOND entry of a multi-issuer array', async () => {
    const verifier = new KeycloakTokenVerifier({
      jwksUrl: 'https://ignored.example.com/certs',
      issuer: [DOGAN_ISS, SHAHIN_ISS],
      audience: AUDIENCE,
      fetchImpl: mockFetch(key.jwk),
    });
    const token = signToken(key.privateKeyPem, {
      sub: 'shahin-user',
      iss: SHAHIN_ISS,
      aud: AUDIENCE,
      email: 'shahin@example.com',
    });
    const res = await verifier.verify(token);
    expect(res.payload.userId).toBe('shahin-user');
  });

  it('rejects a token whose iss matches NO entry in a multi-issuer array', async () => {
    const verifier = new KeycloakTokenVerifier({
      jwksUrl: 'https://ignored.example.com/certs',
      issuer: [DOGAN_ISS, SHAHIN_ISS],
      audience: AUDIENCE,
      fetchImpl: mockFetch(key.jwk),
    });
    const token = signToken(key.privateKeyPem, {
      sub: 'attacker',
      iss: OTHER_ISS,
      aud: AUDIENCE,
      email: 'x@example.com',
    });
    await expect(verifier.verify(token)).rejects.toMatchObject({
      name: 'InvalidTokenError',
      // Must classify as ISSUER, not MALFORMED / SIGNATURE — defense-in-depth
      // against silent issuer bypass where a mis-categorized error could be
      // retried as a valid token.
      code: 'ISSUER',
    });
  });

  it('accepts any iss when no issuer option is set (parity with pre-multi-issuer default)', async () => {
    const verifier = new KeycloakTokenVerifier({
      jwksUrl: 'https://ignored.example.com/certs',
      audience: AUDIENCE,
      fetchImpl: mockFetch(key.jwk),
    });
    const token = signToken(key.privateKeyPem, {
      sub: 'u',
      iss: OTHER_ISS,
      aud: AUDIENCE,
      email: 'e@example.com',
    });
    const res = await verifier.verify(token);
    expect(res.payload.userId).toBe('u');
  });
});

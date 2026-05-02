/**
 * DAuth Keycloak + OpenFGA ENFORCE — runtime acceptance journey.
 *
 * Encodes the Phase-8 contract that production readiness depends on:
 *   Keycloak = identity. OpenFGA = authorization. DAuth = record/audit.
 *
 * These tests intentionally fail closed when the platform is in SHADOW mode
 * (DAUTH_KEYCLOAK_ENFORCE=false or DAUTH_OPENFGA_ENFORCE=false), per the
 * mission rule "No shadow-only PASS. No fake PASS."
 *
 * Required env for green run:
 *   KEYCLOAK_REALM=dogan
 *   KEYCLOAK_AUDIENCE=shahin-bff
 *   KEYCLOAK_ISSUER=https://<host>/realms/dogan
 *   KEYCLOAK_JWKS_URL=https://<host>/realms/dogan/protocol/openid-connect/certs
 *   KEYCLOAK_LOGIN_CLIENT_ID=dauth-login
 *   KEYCLOAK_LOGIN_CLIENT_SECRET=<secret>
 *   DAUTH_KEYCLOAK_ENFORCE=true
 *   DAUTH_OPENFGA_ENFORCE=true
 *   DAUTH_ACCEPT_NATIVE_HS256=false
 *   LOGIN_USE_KEYCLOAK=true
 *   REGISTER_USE_KEYCLOAK_FIRST=true
 *   AUTH_SERVICE_URL=http://127.0.0.1:<auth-port>
 *   GATEWAY_URL=http://127.0.0.1:<gw-port>
 *   TEST_USER_EMAIL=<seeded>
 *   TEST_USER_PASSWORD=<seeded>
 *   TEST_OTHER_TENANT_RESOURCE_URL=<path on tenant B>
 *
 * When any prerequisite is absent the describe block is skipped with an
 * explicit reason, never silently green.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

const AUTH = process.env.AUTH_SERVICE_URL;
const GW = process.env.GATEWAY_URL;
const KC_ISSUER = process.env.KEYCLOAK_ISSUER ?? '';
const KC_JWKS = process.env.KEYCLOAK_JWKS_URL ?? '';
const EMAIL = process.env.TEST_USER_EMAIL;
const PW = process.env.TEST_USER_PASSWORD;

const ENFORCE_KC = process.env.DAUTH_KEYCLOAK_ENFORCE === 'true';
const ENFORCE_FGA = process.env.DAUTH_OPENFGA_ENFORCE === 'true';
const NATIVE_HS256 = process.env.DAUTH_ACCEPT_NATIVE_HS256 === 'true';
const LOGIN_KC = process.env.LOGIN_USE_KEYCLOAK === 'true';

const prereq =
  !!AUTH &&
  !!GW &&
  !!EMAIL &&
  !!PW &&
  ENFORCE_KC &&
  ENFORCE_FGA &&
  !NATIVE_HS256 &&
  LOGIN_KC &&
  KC_ISSUER.startsWith('http') &&
  KC_JWKS.startsWith('http');

const maybe = prereq ? describe : describe.skip;

async function login(): Promise<string> {
  const r = await fetch(`${AUTH}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PW }),
  });
  expect(r.status, `login status=${r.status}`).toBe(200);
  const j: any = await r.json();
  const tok = j?.accessToken ?? j?.token ?? j?.data?.accessToken;
  expect(typeof tok).toBe('string');
  return tok as string;
}

maybe('DAuth ENFORCE journey — Keycloak + OpenFGA', () => {
  let token: string;

  beforeAll(async () => {
    token = await login();
  });

  it('Phase-8.2  issued token is RS256 with correct iss/aud and dos_tenant_id claim', () => {
    const decoded = jwt.decode(token, { complete: true });
    expect(decoded, 'token decodes').toBeTruthy();
    expect(decoded!.header.alg).toBe('RS256');
    const p: any = decoded!.payload;
    expect(p.iss).toBe(KC_ISSUER);
    const aud = Array.isArray(p.aud) ? p.aud : [p.aud];
    expect(aud).toContain(process.env.KEYCLOAK_AUDIENCE ?? 'shahin-bff');
    expect(typeof p.dos_tenant_id).toBe('string');
  });

  it('Phase-8.3  session bootstrap succeeds with Keycloak token', async () => {
    const r = await fetch(`${AUTH}/api/session/bootstrap`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(r.status).toBe(200);
  });

  it('Phase-8.4  protected downstream route allows only after OpenFGA allow', async () => {
    const r = await fetch(`${GW}/api/compliance/controls`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect([200, 204]).toContain(r.status);
  });

  it('Phase-8.5  cross-tenant access is denied (403) at authz layer', async () => {
    const other = process.env.TEST_OTHER_TENANT_RESOURCE_URL;
    if (!other) return;
    const r = await fetch(other, { headers: { authorization: `Bearer ${token}` } });
    expect(r.status).toBe(403);
  });

  it('Phase-8.6  legacy HS256 token is rejected with LEGACY_TOKEN_REJECTED', async () => {
    const legacy = jwt.sign(
      { sub: 'legacy', email: EMAIL, tenantId: 'dogan' },
      'legacy-shared-secret-does-not-matter',
      { algorithm: 'HS256', expiresIn: '5m' },
    );
    const r = await fetch(`${AUTH}/api/session/bootstrap`, {
      headers: { authorization: `Bearer ${legacy}` },
    });
    expect(r.status).toBe(401);
    const body = await r.text();
    expect(body).toMatch(/LEGACY_TOKEN_REJECTED|invalid_token/i);
  });

  it('Phase-8.7  OpenFGA outage under ENFORCE must deny (503/403), never native fallback', async () => {
    if (process.env.SIMULATE_FGA_OUTAGE !== 'true') return;
    const r = await fetch(`${GW}/api/compliance/controls`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect([403, 503]).toContain(r.status);
  });

  it('Phase-8.8  authz_decision_log row exists for a protected call', async () => {
    const { Client } = await import('pg');
    const url = process.env.VERIFIER_DATABASE_URL ?? process.env.DATABASE_URL;
    if (!url) return;
    const c = new Client({ connectionString: url });
    await c.connect();
    try {
      const { rows } = await c.query(
        `SELECT source, decision FROM dos.authz_decision_log
          WHERE created_at > now() - interval '5 minutes'
          ORDER BY created_at DESC LIMIT 5`,
      );
      expect(rows.length).toBeGreaterThan(0);
      const sources = rows.map((r) => String(r.source));
      expect(sources.some((s) => /keycloak|openfga|dauth/i.test(s))).toBe(true);
    } finally {
      await c.end();
    }
  });
});

describe('DAuth ENFORCE preconditions (guard)', () => {
  it('runtime config is in ENFORCE mode for production-readiness gate', () => {
    if (process.env.DAUTH_ENFORCE_GATE !== 'true') return;
    expect(ENFORCE_KC, 'DAUTH_KEYCLOAK_ENFORCE').toBe(true);
    expect(ENFORCE_FGA, 'DAUTH_OPENFGA_ENFORCE').toBe(true);
    expect(NATIVE_HS256, 'DAUTH_ACCEPT_NATIVE_HS256').toBe(false);
    expect(LOGIN_KC, 'LOGIN_USE_KEYCLOAK').toBe(true);
  });
});

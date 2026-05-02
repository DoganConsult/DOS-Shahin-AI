/**
 * Regression tests for the safety rails added alongside per-surface auth
 * hosts and multi-issuer verifier support.
 *
 *   - parseIssuerList()       — KEYCLOAK_ISSUER env parsing
 *   - assertDauthConfigSafe() — partial per-surface client config is fatal;
 *                               malformed issuer entries are fatal under
 *                               ENFORCE.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseIssuerList } from '../bootstrap';
import { assertDauthConfigSafe } from '../config-safety';

describe('parseIssuerList', () => {
  it('undefined raw → undefined (no issuer check)', () => {
    expect(parseIssuerList(undefined)).toBeUndefined();
  });

  it('empty string → undefined', () => {
    expect(parseIssuerList('')).toBeUndefined();
  });

  it('whitespace-only → undefined', () => {
    expect(parseIssuerList('   ,  ,')).toBeUndefined();
  });

  it('single issuer → string (preserves the scalar verifier API)', () => {
    expect(parseIssuerList('https://auth.dogan-ai.com/realms/dogan')).toBe(
      'https://auth.dogan-ai.com/realms/dogan',
    );
  });

  it('two issuers → string[] in declared order', () => {
    expect(
      parseIssuerList(
        'https://auth.dogan-ai.com/realms/dogan,https://auth.shahin-ai.com/realms/dogan',
      ),
    ).toEqual([
      'https://auth.dogan-ai.com/realms/dogan',
      'https://auth.shahin-ai.com/realms/dogan',
    ]);
  });

  it('trims whitespace around entries and drops empties', () => {
    expect(
      parseIssuerList(
        '  https://auth.dogan-ai.com/realms/dogan  , , https://auth.shahin-ai.com/realms/dogan ',
      ),
    ).toEqual([
      'https://auth.dogan-ai.com/realms/dogan',
      'https://auth.shahin-ai.com/realms/dogan',
    ]);
  });
});

describe('assertDauthConfigSafe — per-surface OIDC client + multi-issuer', () => {
  const ENV_KEYS = [
    'DAUTH_KEYCLOAK_ENFORCE',
    'DAUTH_KEYCLOAK_SHADOW',
    'KEYCLOAK_JWKS_URL',
    'KEYCLOAK_BASE_URL',
    'KEYCLOAK_ISSUER',
    'KEYCLOAK_AUDIENCE',
    'KEYCLOAK_REALM',
    'KEYCLOAK_TARGET_REALM',
    'KEYCLOAK_TARGET_AUDIENCE',
    'KEYCLOAK_PRODUCT_OIDC_CLIENT_ID',
    'KEYCLOAK_PRODUCT_OIDC_CLIENT_SECRET',
    'KEYCLOAK_ADMIN_OIDC_CLIENT_ID',
    'KEYCLOAK_ADMIN_OIDC_CLIENT_SECRET',
    'DAUTH_JWT_ALGORITHM',
    'DAUTH_JWT_MIXED_ALG_ACK',
    'NODE_ENV',
  ];
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    for (const k of ENV_KEYS) delete process.env[k];
    // Minimal valid ENFORCE config. Individual tests mutate from here.
    process.env.DAUTH_KEYCLOAK_ENFORCE = 'true';
    process.env.DAUTH_KEYCLOAK_SHADOW = 'true';
    process.env.KEYCLOAK_JWKS_URL = 'https://auth.dogan-ai.com/realms/dogan/protocol/openid-connect/certs';
    process.env.KEYCLOAK_BASE_URL = 'https://auth.dogan-ai.com';
    process.env.KEYCLOAK_REALM = 'dogan';
    process.env.KEYCLOAK_AUDIENCE = 'shahin-bff';
    process.env.DAUTH_JWT_MIXED_ALG_ACK = 'true';
  });

  afterEach(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k]!;
    }
  });

  const silentLog = { info: () => {}, warn: () => {}, error: () => {} };

  it('accepts fully unset per-surface client config (generic fallback path)', () => {
    const r = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true, log: silentLog });
    expect(r.violations.find((v) => v.code === 'KC_PRODUCT_CLIENT_CONFIG_PARTIAL')).toBeUndefined();
    expect(r.violations.find((v) => v.code === 'KC_ADMIN_CLIENT_CONFIG_PARTIAL')).toBeUndefined();
  });

  it('accepts fully set per-surface product client config', () => {
    process.env.KEYCLOAK_PRODUCT_OIDC_CLIENT_ID = 'shahin-bff';
    process.env.KEYCLOAK_PRODUCT_OIDC_CLIENT_SECRET = 'secret-xyz';
    const r = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true, log: silentLog });
    expect(r.violations.find((v) => v.code === 'KC_PRODUCT_CLIENT_CONFIG_PARTIAL')).toBeUndefined();
  });

  it('blocks when product CLIENT_ID is set without CLIENT_SECRET', () => {
    process.env.KEYCLOAK_PRODUCT_OIDC_CLIENT_ID = 'shahin-bff';
    // Secret deliberately missing.
    const r = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true, log: silentLog });
    const v = r.violations.find((x) => x.code === 'KC_PRODUCT_CLIENT_CONFIG_PARTIAL');
    expect(v).toBeDefined();
    expect(v!.severity).toBe('block');
    expect(r.ok).toBe(false);
  });

  it('blocks when product CLIENT_SECRET is set without CLIENT_ID', () => {
    process.env.KEYCLOAK_PRODUCT_OIDC_CLIENT_SECRET = 'dangling-secret';
    const r = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true, log: silentLog });
    const v = r.violations.find((x) => x.code === 'KC_PRODUCT_CLIENT_CONFIG_PARTIAL');
    expect(v).toBeDefined();
    expect(v!.severity).toBe('block');
  });

  it('blocks when admin CLIENT_ID is set without CLIENT_SECRET', () => {
    process.env.KEYCLOAK_ADMIN_OIDC_CLIENT_ID = 'admin-portal';
    const r = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true, log: silentLog });
    const v = r.violations.find((x) => x.code === 'KC_ADMIN_CLIENT_CONFIG_PARTIAL');
    expect(v).toBeDefined();
    expect(v!.severity).toBe('block');
  });

  it('accepts a valid comma-separated KEYCLOAK_ISSUER', () => {
    process.env.KEYCLOAK_ISSUER =
      'https://auth.dogan-ai.com/realms/dogan,https://auth.shahin-ai.com/realms/dogan';
    const r = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true, log: silentLog });
    expect(r.violations.find((v) => v.code === 'KC_ISSUER_MALFORMED')).toBeUndefined();
  });

  it('blocks when KEYCLOAK_ISSUER contains a non-URL entry', () => {
    process.env.KEYCLOAK_ISSUER =
      'https://auth.dogan-ai.com/realms/dogan,not-a-url';
    const r = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true, log: silentLog });
    const v = r.violations.find((x) => x.code === 'KC_ISSUER_MALFORMED');
    expect(v).toBeDefined();
    expect(v!.severity).toBe('block');
  });

  it('blocks when KEYCLOAK_ISSUER contains an entry without /realms/', () => {
    process.env.KEYCLOAK_ISSUER = 'https://auth.dogan-ai.com/wrong-path';
    const r = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true, log: silentLog });
    const v = r.violations.find((x) => x.code === 'KC_ISSUER_MALFORMED');
    expect(v).toBeDefined();
  });

  it('throws in mode:throw when a block-severity violation is present', () => {
    process.env.KEYCLOAK_PRODUCT_OIDC_CLIENT_ID = 'shahin-bff';
    // no secret → partial → block
    expect(() =>
      assertDauthConfigSafe({ mode: 'throw', skipDivergenceCheck: true, log: silentLog }),
    ).toThrow(/KC_PRODUCT_CLIENT_CONFIG_PARTIAL/);
  });
});

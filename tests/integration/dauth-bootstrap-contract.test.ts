/**
 * X5 — DAuth end-to-end bootstrap contract test.
 *
 * Verifies that the DAuth facade exposes the canonical surface each service
 * consumes at startup:
 *   1. bootstrapDauth() returns the four-engine result shape.
 *   2. assertDauthConfigSafe() warns — not throws — on the shadow baseline.
 *   3. The RS256 issuance-alignment warning fires only under ENFORCE.
 *   4. getDauthSecretsAdapter() returns the env adapter by default.
 *   5. getLastDauthBootstrapResult() round-trips the bootstrap result.
 *
 * No network is required — the test runs with adapters disabled (shadow flags
 * off) so Keycloak/OpenFGA/Cerbos code paths are exercised only to the point
 * where the factory degrades to native.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  bootstrapDauth,
  getLastDauthBootstrapResult,
  getDauthSecretsAdapter,
  assertDauthConfigSafe,
} from '@dos/dauth-shared';

const FLAGS = [
  'DAUTH_KEYCLOAK_SHADOW',
  'DAUTH_KEYCLOAK_ENFORCE',
  'DAUTH_OPENFGA_SHADOW',
  'DAUTH_OPENFGA_ENFORCE',
  'DAUTH_CERBOS_SHADOW',
  'DAUTH_CERBOS_ENFORCE',
  'DAUTH_VAULT_ENABLED',
  'DAUTH_CONFIG_FAIL_CLOSED',
  'DAUTH_JWT_ALGORITHM',
  'DAUTH_JWT_MIXED_ALG_ACK',
  'KEYCLOAK_JWKS_URL',
  'KEYCLOAK_BASE_URL',
  'KEYCLOAK_REALM',
  'KEYCLOAK_AUDIENCE',
  'KEYCLOAK_TARGET_REALM',
  'KEYCLOAK_TARGET_AUDIENCE',
  'OPENFGA_API_URL',
  'OPENFGA_STORE_ID',
  'OPENFGA_MODEL_ID',
  'CERBOS_PDP_URL',
  'VAULT_ADDR',
  'VAULT_TOKEN',
  'NODE_ENV',
];

const saved: Record<string, string | undefined> = {};

function snap() { for (const k of FLAGS) saved[k] = process.env[k]; }
function restore() {
  for (const k of FLAGS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
}

describe('DAuth bootstrap contract (X5)', () => {
  beforeEach(() => snap());
  afterEach(() => restore());

  it('returns the four-engine result shape with all engines off', () => {
    for (const k of FLAGS) delete process.env[k];

    const result = bootstrapDauth({ nativeVerify: async () => ({ ok: false, error: 'native-disabled' }) });

    expect(result).toHaveProperty('keycloak');
    expect(result).toHaveProperty('openfga');
    expect(result).toHaveProperty('cerbos');
    expect(result).toHaveProperty('secrets');
    expect(result.keycloak.enabled).toBe(false);
    expect(result.openfga.enabled).toBe(false);
    expect(result.cerbos.enabled).toBe(false);
    expect(result.secrets.adapter).toBe('env');
  });

  it('round-trips through getLastDauthBootstrapResult()', () => {
    for (const k of FLAGS) delete process.env[k];
    const result = bootstrapDauth({ nativeVerify: async () => ({ ok: false, error: 'native-disabled' }) });
    const last = getLastDauthBootstrapResult();
    expect(last).not.toBeNull();
    expect(last).toEqual(result);
  });

  it('config-safety is clean on the shadow baseline', () => {
    for (const k of FLAGS) delete process.env[k];
    process.env.DAUTH_KEYCLOAK_SHADOW = 'true';
    process.env.DAUTH_OPENFGA_SHADOW = 'true';
    process.env.KEYCLOAK_JWKS_URL = 'http://127.0.0.1:8180/realms/master/protocol/openid-connect/certs';

    const report = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true });
    expect(report.ok).toBe(true);
    expect(report.violations.filter((v) => v.severity === 'block')).toHaveLength(0);
  });

  it('K7 — issuance-alg mismatch warning fires under Keycloak ENFORCE without RS256', () => {
    for (const k of FLAGS) delete process.env[k];
    process.env.DAUTH_KEYCLOAK_SHADOW = 'true';
    process.env.DAUTH_KEYCLOAK_ENFORCE = 'true';
    process.env.KEYCLOAK_JWKS_URL = 'http://127.0.0.1:8180/realms/dogan/protocol/openid-connect/certs';
    process.env.KEYCLOAK_REALM = 'dogan';
    process.env.KEYCLOAK_AUDIENCE = 'shahin-bff';
    process.env.KEYCLOAK_TARGET_REALM = 'dogan';
    process.env.KEYCLOAK_TARGET_AUDIENCE = 'shahin-bff';

    const report = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true });
    const warnCodes = report.violations.filter((v) => v.severity === 'warn').map((v) => v.code);
    expect(warnCodes).toContain('KC_ISSUANCE_ALG_MISMATCH');
  });

  it('K7 — ack flag suppresses the issuance-alg warning', () => {
    for (const k of FLAGS) delete process.env[k];
    process.env.DAUTH_KEYCLOAK_SHADOW = 'true';
    process.env.DAUTH_KEYCLOAK_ENFORCE = 'true';
    process.env.KEYCLOAK_JWKS_URL = 'http://127.0.0.1:8180/realms/dogan/protocol/openid-connect/certs';
    process.env.KEYCLOAK_REALM = 'dogan';
    process.env.KEYCLOAK_AUDIENCE = 'shahin-bff';
    process.env.KEYCLOAK_TARGET_REALM = 'dogan';
    process.env.KEYCLOAK_TARGET_AUDIENCE = 'shahin-bff';
    process.env.DAUTH_JWT_MIXED_ALG_ACK = 'true';

    const report = assertDauthConfigSafe({ mode: 'warn', skipDivergenceCheck: true });
    const codes = report.violations.map((v) => v.code);
    expect(codes).not.toContain('KC_ISSUANCE_ALG_MISMATCH');
  });

  it('secrets adapter falls back to env when Vault flag is off', () => {
    for (const k of FLAGS) delete process.env[k];
    const adapter = getDauthSecretsAdapter();
    expect(adapter.name).toBe('env');
  });
});

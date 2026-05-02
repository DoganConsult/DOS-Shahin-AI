/**
 * DAuth — assertDauthConfigSafe()
 *
 * The "golden rule" gate referenced throughout the DAuth runtime:
 *
 *   ENFORCE may only be enabled for an engine when:
 *     1. SHADOW=true is also set (or has been set in a previous cycle), AND
 *     2. the divergence-report job has produced ≥ 2 consecutive clean cycles
 *        (zero allow/deny mismatch between the engine and the authoritative
 *        decision), AND
 *     3. transport / realm / audience configuration matches the production
 *        spec (TLS, target realm, target audience, signed admin client).
 *
 * This module exposes a pure config-side check. The divergence-cycle
 * portion is read out of the live ledger by `verifyDivergenceClean()` and
 * is optional — services that do not have ledger access (e.g. gateway)
 * skip it via `{ skipDivergenceCheck: true }`.
 *
 * Failure policy:
 *   - In `mode: 'warn'` (default), we log violations and let the process
 *     continue.
 *   - In `mode: 'throw'`, we throw — used by the auth-service entrypoint
 *     when DAUTH_CONFIG_FAIL_CLOSED=true.
 */

export interface DauthConfigSafetyReport {
  ok: boolean;
  violations: Array<{
    code: string;
    severity: 'block' | 'warn';
    detail: string;
  }>;
  checked: {
    keycloak: { mode: 'off' | 'shadow' | 'enforce'; realm?: string; audience?: string };
    openfga: { mode: 'off' | 'shadow' | 'enforce' };
    cerbos: { mode: 'off' | 'shadow' | 'enforce' };
  };
}

export interface AssertDauthConfigSafeOptions {
  /** 'warn' (default) just logs; 'throw' throws on any block-severity violation. */
  mode?: 'warn' | 'throw';
  /** Skip the live ledger query (services without DB access). */
  skipDivergenceCheck?: boolean;
  /** Optional logger; defaults to console. */
  log?: {
    info?: (msg: string, meta?: Record<string, unknown>) => void;
    warn?: (msg: string, meta?: Record<string, unknown>) => void;
    error?: (msg: string, meta?: Record<string, unknown>) => void;
  };
}

function readBool(key: string): boolean {
  const v = process.env[key];
  if (!v) return false;
  const low = v.toLowerCase();
  return low === '1' || low === 'true';
}

function modeOf(prefix: string): 'off' | 'shadow' | 'enforce' {
  if (readBool(`${prefix}_ENFORCE`)) return 'enforce';
  if (readBool(`${prefix}_SHADOW`)) return 'shadow';
  return 'off';
}

function isHttps(url: string | undefined | null): boolean {
  if (!url) return false;
  return /^https:\/\//i.test(url);
}

function isLoopback(url: string | undefined | null): boolean {
  if (!url) return false;
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])/i.test(url);
}

export function assertDauthConfigSafe(
  opts: AssertDauthConfigSafeOptions = {},
): DauthConfigSafetyReport {
  const log = {
    info: opts.log?.info ?? ((m: string, meta?: Record<string, unknown>) => console.info(m, meta ?? {})),
    warn: opts.log?.warn ?? ((m: string, meta?: Record<string, unknown>) => console.warn(m, meta ?? {})),
    error: opts.log?.error ?? ((m: string, meta?: Record<string, unknown>) => console.error(m, meta ?? {})),
  };

  const violations: DauthConfigSafetyReport['violations'] = [];
  const isProd = (process.env.NODE_ENV || '').toLowerCase() === 'production';

  // ── Keycloak ─────────────────────────────────────────────────────
  const kcMode = modeOf('DAUTH_KEYCLOAK');
  const kcBase = process.env.KEYCLOAK_BASE_URL;
  const kcJwks = process.env.KEYCLOAK_JWKS_URL;
  const kcRealm = process.env.KEYCLOAK_REALM;
  const kcAud = process.env.KEYCLOAK_AUDIENCE;
  const kcTargetRealm = process.env.KEYCLOAK_TARGET_REALM;
  const kcTargetAud = process.env.KEYCLOAK_TARGET_AUDIENCE;

  if (kcMode === 'enforce') {
    if (!kcJwks) {
      violations.push({ code: 'KC_JWKS_MISSING', severity: 'block', detail: 'KEYCLOAK_JWKS_URL required when ENFORCE=true' });
    }
    if (isProd && (!isHttps(kcBase) || !isHttps(kcJwks))) {
      violations.push({
        code: 'KC_TLS_MISSING',
        severity: 'block',
        detail: 'Keycloak ENFORCE in production requires HTTPS for KEYCLOAK_BASE_URL and KEYCLOAK_JWKS_URL',
      });
    }
    if (kcTargetRealm && kcRealm && kcRealm !== kcTargetRealm) {
      violations.push({
        code: 'KC_REALM_NOT_TARGET',
        severity: 'block',
        detail: `KEYCLOAK_REALM=${kcRealm} but target=${kcTargetRealm} — provision target realm before ENFORCE`,
      });
    }
    if (kcTargetAud && kcAud && kcAud !== kcTargetAud) {
      violations.push({
        code: 'KC_AUDIENCE_NOT_TARGET',
        severity: 'block',
        detail: `KEYCLOAK_AUDIENCE=${kcAud} but target=${kcTargetAud}`,
      });
    }
    if (!readBool('DAUTH_KEYCLOAK_SHADOW')) {
      // SHADOW=false + ENFORCE=true is allowed only when divergence report is clean,
      // but losing the shadow signal is still a downgrade — warn.
      violations.push({
        code: 'KC_SHADOW_DISABLED',
        severity: 'warn',
        detail: 'DAUTH_KEYCLOAK_ENFORCE=true without DAUTH_KEYCLOAK_SHADOW=true — keep shadow on for rollback safety',
      });
    }
    // K7 — Native DAuth tokens are HS256 (shared-secret); Keycloak tokens are
    // RS256 (JWKS). When Keycloak is authoritative, downstream verifiers must
    // be prepared to reject HS256 — warn if the native issuance algorithm has
    // not been explicitly pinned to RS256 or mixed-mode acknowledged.
    const jwtAlg = (process.env.DAUTH_JWT_ALGORITHM || '').toUpperCase();
    const mixedAck = readBool('DAUTH_JWT_MIXED_ALG_ACK');
    if (jwtAlg !== 'RS256' && !mixedAck) {
      violations.push({
        code: 'KC_ISSUANCE_ALG_MISMATCH',
        severity: 'warn',
        detail:
          'DAUTH_KEYCLOAK_ENFORCE=true but DAUTH_JWT_ALGORITHM is not RS256. Native HS256 tokens remain accepted alongside Keycloak RS256 tokens. Set DAUTH_JWT_MIXED_ALG_ACK=true to acknowledge, or migrate native issuance to RS256.',
      });
    }

    // Per-surface OIDC client config must be all-or-nothing. Partial config
    // (e.g. `KEYCLOAK_PRODUCT_OIDC_CLIENT_ID` set without its `_SECRET`)
    // silently falls back to the generic `KEYCLOAK_OIDC_CLIENT_ID/_SECRET`
    // pair inside oidc.routes.clientCredsFor() — the user sees a successful
    // login, but the token exchange used the wrong client. Fail-closed so
    // the operator notices at boot rather than after a production incident.
    const productId = process.env.KEYCLOAK_PRODUCT_OIDC_CLIENT_ID;
    const productSecret = process.env.KEYCLOAK_PRODUCT_OIDC_CLIENT_SECRET;
    if (!!productId !== !!productSecret) {
      violations.push({
        code: 'KC_PRODUCT_CLIENT_CONFIG_PARTIAL',
        severity: 'block',
        detail:
          'KEYCLOAK_PRODUCT_OIDC_CLIENT_ID and KEYCLOAK_PRODUCT_OIDC_CLIENT_SECRET must be set together, or neither. Partial config silently falls back to the generic client.',
      });
    }
    const adminId = process.env.KEYCLOAK_ADMIN_OIDC_CLIENT_ID;
    const adminSecret = process.env.KEYCLOAK_ADMIN_OIDC_CLIENT_SECRET;
    if (!!adminId !== !!adminSecret) {
      violations.push({
        code: 'KC_ADMIN_CLIENT_CONFIG_PARTIAL',
        severity: 'block',
        detail:
          'KEYCLOAK_ADMIN_OIDC_CLIENT_ID and KEYCLOAK_ADMIN_OIDC_CLIENT_SECRET must be set together, or neither. Partial config silently falls back to the generic client.',
      });
    }

    // Multi-issuer sanity: when ENFORCE=true and KEYCLOAK_ISSUER is a
    // comma-separated list, every entry must be a syntactically-valid URL
    // and must match `{KEYCLOAK_BASE_URL scheme}://<host>/realms/<realm>`
    // structure. A typo here bypasses the issuer check silently (jwt.verify
    // accepts if *any* entry matches, so a bogus entry doesn't fail — but
    // a missing real entry means real tokens get rejected).
    const issuerRaw = process.env.KEYCLOAK_ISSUER;
    if (issuerRaw) {
      const issuers = issuerRaw.split(',').map((s) => s.trim()).filter(Boolean);
      const malformed = issuers.filter((iss) => {
        try {
          const u = new URL(iss);
          return !u.pathname.includes('/realms/');
        } catch {
          return true;
        }
      });
      if (malformed.length > 0) {
        violations.push({
          code: 'KC_ISSUER_MALFORMED',
          severity: 'block',
          detail: `KEYCLOAK_ISSUER contains malformed entries: ${malformed.join(', ')}`,
        });
      }
    }
  }

  // ── OpenFGA ──────────────────────────────────────────────────────
  const fgaMode = modeOf('DAUTH_OPENFGA');
  const fgaApi = process.env.OPENFGA_API_URL;
  const fgaStore = process.env.OPENFGA_STORE_ID;
  const fgaModel = process.env.OPENFGA_MODEL_ID;
  const fgaToken = process.env.OPENFGA_API_TOKEN;
  if (fgaMode === 'enforce') {
    if (!fgaApi || !fgaStore || !fgaModel) {
      violations.push({
        code: 'FGA_CONFIG_INCOMPLETE',
        severity: 'block',
        detail: 'OpenFGA ENFORCE requires OPENFGA_API_URL, _STORE_ID, _MODEL_ID',
      });
    }
    if (isProd && !isHttps(fgaApi)) {
      violations.push({
        code: 'FGA_TLS_MISSING',
        severity: 'block',
        detail: 'OpenFGA ENFORCE in production requires HTTPS OPENFGA_API_URL',
      });
    }
    if (isProd && !fgaToken && !isLoopback(fgaApi)) {
      violations.push({
        code: 'FGA_AUTH_MISSING',
        severity: 'block',
        detail: 'OpenFGA ENFORCE on remote endpoint requires OPENFGA_API_TOKEN',
      });
    }
    if (!readBool('DAUTH_OPENFGA_SHADOW')) {
      violations.push({
        code: 'FGA_SHADOW_DISABLED',
        severity: 'warn',
        detail: 'DAUTH_OPENFGA_ENFORCE=true without _SHADOW=true',
      });
    }
  }

  // ── Cerbos ───────────────────────────────────────────────────────
  const cerbosMode = modeOf('DAUTH_CERBOS');
  const cerbosUrl = process.env.CERBOS_PDP_URL;
  const cerbosTls = readBool('CERBOS_TLS_ENABLED');
  if (cerbosMode === 'enforce') {
    if (!cerbosUrl) {
      violations.push({ code: 'CERBOS_URL_MISSING', severity: 'block', detail: 'CERBOS_PDP_URL required when ENFORCE=true' });
    }
    if (isProd && !cerbosTls && !isLoopback(cerbosUrl)) {
      violations.push({
        code: 'CERBOS_TLS_DISABLED',
        severity: 'block',
        detail: 'Cerbos ENFORCE in production requires CERBOS_TLS_ENABLED=true',
      });
    }
  }

  // ── RLS / safety rails ───────────────────────────────────────────
  if (!readBool('DAUTH_RLS_FAIL_CLOSED') && isProd) {
    violations.push({
      code: 'RLS_FAIL_OPEN',
      severity: 'warn',
      detail: 'DAUTH_RLS_FAIL_CLOSED=false in production — RLS errors will fall back to permissive mode',
    });
  }

  const blockers = violations.filter((v) => v.severity === 'block');
  const ok = blockers.length === 0;

  for (const v of violations) {
    if (v.severity === 'block') log.error(`[DAuth:config] ${v.code} — ${v.detail}`);
    else log.warn(`[DAuth:config] ${v.code} — ${v.detail}`);
  }

  if (!ok && opts.mode === 'throw') {
    throw new Error(
      `[DAuth] config-safety check failed: ${blockers.map((b) => b.code).join(', ')}`,
    );
  }

  return {
    ok,
    violations,
    checked: {
      keycloak: { mode: kcMode, realm: kcRealm, audience: kcAud },
      openfga: { mode: fgaMode },
      cerbos: { mode: cerbosMode },
    },
  };
}

/**
 * Read the latest divergence report from the decision ledger and verify the
 * last `windowsRequired` cycles had zero divergence. Returns `true` if the
 * gate is clean (i.e. ENFORCE may be promoted), `false` otherwise.
 *
 * The actual ledger query is delegated to the auth-service divergence-report
 * job module; this helper is a thin re-import so callers in other services
 * can use the same gate without depending on the job class directly.
 *
 * Caller passes a query function so we don't pull `@dos/db` into bundles
 * that don't need it (e.g. gateway).
 */
export async function verifyDivergenceClean(
  queryFn: (sql: string, params: unknown[]) => Promise<{ rows: Array<{ engine: string; diverged: number }> }>,
  opts: { engine: string; windowsRequired?: number; windowMinutes?: number } = { engine: 'keycloak' },
): Promise<{ clean: boolean; lastDivergedCount: number }> {
  const windowsRequired = opts.windowsRequired ?? 2;
  const windowMinutes = opts.windowMinutes ?? 60;
  try {
    const since = new Date(Date.now() - windowsRequired * windowMinutes * 60_000).toISOString();
    const { rows } = await queryFn(
      `SELECT engine, SUM(diverged_count)::int AS diverged
       FROM dos.dauth_divergence_report
       WHERE engine = $1 AND window_start >= $2
       GROUP BY engine`,
      [opts.engine, since],
    );
    const div = rows[0]?.diverged ?? 0;
    return { clean: div === 0, lastDivergedCount: div };
  } catch (_err) {
    // Ledger unreachable → treat as not-clean (caller decides).
    return { clean: false, lastDivergedCount: -1 };
  }
}

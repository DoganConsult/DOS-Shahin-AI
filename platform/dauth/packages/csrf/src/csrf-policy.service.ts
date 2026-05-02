import { safeQuery } from '@dos/db';
import { publish } from '@dos/platform-core/events';
import { catchHandler, EC } from '@dos/platform-core/resilience';
import type { CsrfPolicyConfig, CsrfPolicyRow } from './csrf-policy.contracts';

const DEFAULT_CSRF_POLICY: CsrfPolicyConfig = {
  tokenMaxAgeMs: 4 * 60 * 60 * 1000,    // 4 hours
  rotationIntervalMs: 60_000,             // 1 minute
  graceWindowMs: 5_000,                   // 5 seconds
  enforcementMode: 'block',
  sameIpRequired: false,
  sameUaRequired: true,
  maxFailuresPerWindow: 10,
  failureWindowMs: 5 * 60 * 1000,        // 5 minutes
};

function mapRow(row: CsrfPolicyRow): CsrfPolicyConfig {
  return {
    tokenMaxAgeMs: row.token_max_age_ms,
    rotationIntervalMs: row.rotation_interval_ms,
    graceWindowMs: row.grace_window_ms,
    enforcementMode: row.enforcement_mode as CsrfPolicyConfig['enforcementMode'],
    sameIpRequired: row.same_ip_required,
    sameUaRequired: row.same_ua_required,
    maxFailuresPerWindow: row.max_failures_per_window,
    failureWindowMs: row.failure_window_ms,
  };
}

/** Read per-tenant CSRF policy. Falls back to defaults if none configured. */
export async function getCsrfPolicy(tenantId: string): Promise<CsrfPolicyConfig> {
  try {
    const { rows } = await safeQuery(
      `SELECT * FROM csrf_security_policies
       WHERE tenant_id = $1 AND is_active = TRUE LIMIT 1`,
      [tenantId],
    );
    if (rows[0]) {
      return { ...DEFAULT_CSRF_POLICY, ...mapRow(rows[0] as CsrfPolicyRow) };
    }
  } catch (_e) { /* non-critical */ }
  return DEFAULT_CSRF_POLICY;
}

/** Upsert per-tenant CSRF policy. Publishes event on change. */
export async function updateCsrfPolicy(
  tenantId: string,
  patch: Partial<CsrfPolicyConfig>,
  updatedBy: string,
): Promise<CsrfPolicyConfig> {
  const current = await getCsrfPolicy(tenantId);
  const merged = { ...current, ...patch };

  await safeQuery(
    `INSERT INTO csrf_security_policies
       (tenant_id, token_max_age_ms, rotation_interval_ms, grace_window_ms,
        enforcement_mode, same_ip_required, same_ua_required,
        max_failures_per_window, failure_window_ms, is_active, created_by, updated_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, $10, $10)
     ON CONFLICT (tenant_id) DO UPDATE SET
       token_max_age_ms = EXCLUDED.token_max_age_ms,
       rotation_interval_ms = EXCLUDED.rotation_interval_ms,
       grace_window_ms = EXCLUDED.grace_window_ms,
       enforcement_mode = EXCLUDED.enforcement_mode,
       same_ip_required = EXCLUDED.same_ip_required,
       same_ua_required = EXCLUDED.same_ua_required,
       max_failures_per_window = EXCLUDED.max_failures_per_window,
       failure_window_ms = EXCLUDED.failure_window_ms,
       updated_by = EXCLUDED.updated_by,
       updated_at = NOW()`,
    [
      tenantId, merged.tokenMaxAgeMs, merged.rotationIntervalMs, merged.graceWindowMs,
      merged.enforcementMode, merged.sameIpRequired, merged.sameUaRequired,
      merged.maxFailuresPerWindow, merged.failureWindowMs, updatedBy,
    ],
  );

  await publish('csrf.policy.updated', tenantId, {
    policyId: tenantId,
    updatedBy,
    enforcementMode: merged.enforcementMode,
  }).catch(catchHandler(EC.EVENT_BUS));

  return merged;
}

/** Return defaults for tenants without custom policy. */
export function getCsrfPolicyDefaults(): CsrfPolicyConfig {
  return { ...DEFAULT_CSRF_POLICY };
}

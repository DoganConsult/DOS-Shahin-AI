// Governance-OS config service — runtime config + feature-flag reader for
// the governance-os pipeline. Backed by dos.governance_os_config (key/value
// + per-tenant overrides). Sibling files (governance-os-knowledge-publisher,
// governance-os-learning) consume getConfig + isFeatureEnabled.

import { safeQuery } from '@dos/db';

export interface GovernanceOsConfig {
  tenantId: string;
  key: string;
  value: unknown;
  updatedAt: string;
}

export async function getConfig<T = unknown>(
  tenantId: string,
  key: string,
  defaultValue?: T,
): Promise<T | undefined> {
  try {
    const r = await safeQuery(
      `SELECT value FROM dos.governance_os_config
        WHERE tenant_id = $1 AND key = $2 LIMIT 1`,
      [tenantId, key],
    );
    const row = r.rows[0] as { value?: unknown } | undefined;
    if (row && row.value !== undefined && row.value !== null) return row.value as T;
  } catch { /* table absent */ }
  return defaultValue;
}

export async function setConfig(tenantId: string, key: string, value: unknown): Promise<void> {
  try {
    await safeQuery(
      `INSERT INTO dos.governance_os_config (tenant_id, key, value, updated_at)
       VALUES ($1, $2, $3::jsonb, NOW())
       ON CONFLICT (tenant_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [tenantId, key, JSON.stringify(value)],
    );
  } catch { /* table absent */ }
}

export async function isFeatureEnabled(tenantId: string, flag: string): Promise<boolean> {
  const v = await getConfig<boolean | { enabled: boolean }>(tenantId, `feature.${flag}`);
  if (typeof v === 'boolean') return v;
  if (v && typeof v === 'object' && 'enabled' in v) return Boolean((v as { enabled: boolean }).enabled);
  return false;
}

export async function listConfig(tenantId: string): Promise<GovernanceOsConfig[]> {
  try {
    const r = await safeQuery(
      `SELECT tenant_id, key, value, updated_at FROM dos.governance_os_config WHERE tenant_id = $1`,
      [tenantId],
    );
    return (r.rows as Record<string, unknown>[]).map((row) => ({
      tenantId: row['tenant_id'] as string,
      key: row['key'] as string,
      value: row['value'],
      updatedAt: row['updated_at'] as string,
    }));
  } catch {
    return [];
  }
}

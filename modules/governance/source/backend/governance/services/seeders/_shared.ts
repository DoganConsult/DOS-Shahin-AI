// ============================================================================
// Shahin — Governance Baseline Seeders: Shared Helpers
// Common utilities used across all governance seeder modules.
// ============================================================================

import { safeQuery } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

/** Generate a v4-like UUID without external dependencies */
export function uuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

/** Get tenant admin user_id */
export async function getTenantAdmin(tenantId: string): Promise<string | null> {
  const res = await safeQuery(
    `SELECT user_id FROM public.users
     WHERE tenant_id = $1 AND role IN ('admin','tenant_admin','platform_admin') AND status = 'active'
     ORDER BY created_at ASC LIMIT 1`,
    [tenantId],
  );
  return getFirstRow(res)?.user_id ?? null;
}

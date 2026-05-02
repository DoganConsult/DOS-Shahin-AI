// ============================================
// Process Orchestration — SLA Lookup
// Resolves SLA hours through a 4-level cascade:
//   1. Role-based override (role_sla_defaults)
//   2. Process-type + priority (sla_config)
//   3. Priority-level default (sla_priority_config)
//   4. Hardcoded fallback constants
// ============================================

import { safeQuery, tenantSchema } from '@dos/db';
import { getFirstRow } from '@dos/db';
import { SLA_DEFAULTS } from './types';

export async function lookupSLA(
  tenantId: string,
  processType: string,
  priority: string,
  assigneeRole?: string,
): Promise<number> {
  const schema = tenantSchema(tenantId);

  // Role-based override (role_sla_defaults) when assigneeRole is set
  if (assigneeRole) {
    try {
      const roleRes = await safeQuery(
        `SELECT initial_sla_hours FROM "${schema}".role_sla_defaults
         WHERE process_type = $1 AND priority_level = $2 AND assignee_role = $3 AND active = true LIMIT 1`,
        [processType, priority, assigneeRole],
      );
      if (roleRes.rows.length > 0) return Number(getFirstRow(roleRes)?.initial_sla_hours);
    } catch {
      // role_sla_defaults may not exist
    }
  }

  try {
    const res = await safeQuery(
      `SELECT initial_sla_hours FROM "${schema}".sla_config
       WHERE process_type = $1 AND priority_level = $2 AND active = true LIMIT 1`,
      [processType, priority],
    );
    if (res.rows.length > 0) return Number(getFirstRow(res)?.initial_sla_hours);
  } catch {
    // sla_config table may not exist
  }

  // Law 4: DB-driven SLA defaults from sla_priority_config (migration 434)
  try {
    const pRes = await safeQuery(
      `SELECT sla_hours FROM "${schema}".sla_priority_config WHERE priority_level = $1 LIMIT 1`,
      [priority],
    );
    if (pRes.rows.length > 0) return Number(getFirstRow(pRes)?.sla_hours);
  } catch {
    // sla_priority_config may not exist yet
  }

  // Ultimate fallback to code constants (only when both DB tables missing)
  return SLA_DEFAULTS[priority] ?? 72;
}

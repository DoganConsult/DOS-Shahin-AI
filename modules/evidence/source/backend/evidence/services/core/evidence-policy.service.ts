// ============================================
// Evidence Policy Enforcement
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '@dos/types';

// === Pure function for property testing ===

export function checkEvidenceCompleteness(
  existingTypes: string[],
  requiredTypes: string[]
): { compliant: boolean; missing: string[] } {
  const existingSet = new Set(existingTypes);
  const missing = requiredTypes.filter((t) => !existingSet.has(t));
  return {
    compliant: missing.length === 0,
    missing,
  };
}

// === Enforce Evidence Policy (DB-backed) ===

export async function enforceEvidencePolicy(
  tenantId: string,
  controlId: string,
  requiredTypes: string[]
): Promise<{ compliant: boolean; missing: string[] }> {
  const schema = tenantSchema(tenantId);

  // Get existing evidence for the control
  const result = await safeQuery(
    `SELECT title FROM "${schema}".evidence WHERE control_id = $1`,
    [controlId]
  );

  const existingTypes = result.rows.map((r: GenericRow) => r.title);
  return checkEvidenceCompleteness(existingTypes, requiredTypes);
}

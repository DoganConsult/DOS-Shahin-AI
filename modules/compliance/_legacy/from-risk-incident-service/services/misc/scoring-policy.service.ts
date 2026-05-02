/**
 * Phase 0.5 build-compat stub for risk/routes/scoring.routes.ts.
 *
 * The scoring-policy module was moved out of the risk service during the
 * unfinished extraction. This no-op shim keeps the risk domain building; the
 * scoring routes are not user-certified in Wave 1 and return empty results
 * until Wave 2 restores the real implementation.
 */

export interface ScoringPolicy {
  id: string;
  tenant_id: string;
  name: string;
  version: number;
}

export async function createScoringPolicy(_tenantId: string, _input: Record<string, unknown>): Promise<ScoringPolicy | null> {
  return null;
}

export async function listScoringPolicies(_tenantId: string): Promise<ScoringPolicy[]> {
  return [];
}

export async function getScoringPolicyById(_tenantId: string, _id: string): Promise<ScoringPolicy | null> {
  return null;
}

export async function updateScoringPolicy(_tenantId: string, _id: string, _input: Record<string, unknown>): Promise<ScoringPolicy | null> {
  return null;
}

export async function deleteScoringPolicy(_tenantId: string, _id: string): Promise<boolean> {
  return false;
}

export async function applyPolicy(_tenantId: string, _assessmentId: string, _policyId: string): Promise<Record<string, unknown>> {
  return {};
}

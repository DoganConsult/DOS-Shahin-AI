/**
 * Compliance Workspace — Shared helpers & types
 *
 * Extracted from compliance-workspace.service.ts for modularity.
 */

import { tenantSchema } from '../../ports/database.port';
import { safeQuery } from "@dos/db";

// ═══════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════

export function pct(n: number, d: number): number {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

/** Maturity bands: Initial → Developing → Defined → Managed → Optimized (SAMA/industry alignment) */
export type MaturityLevel = "Initial" | "Developing" | "Defined" | "Managed" | "Optimized";

export function computeMaturity(
  pctImplemented: number,
  pctWithEvidence: number,
  pctTested: number
): { maturityScore: number; maturityLevel: MaturityLevel } {
  const score = Math.round(
    0.4 * pctImplemented + 0.3 * pctWithEvidence + 0.3 * pctTested
  );
  const maturityScore = Math.min(100, Math.max(0, score));
  let maturityLevel: MaturityLevel = "Initial";
  if (maturityScore >= 81) maturityLevel = "Optimized";
  else if (maturityScore >= 61) maturityLevel = "Managed";
  else if (maturityScore >= 41) maturityLevel = "Defined";
  else if (maturityScore >= 21) maturityLevel = "Developing";
  return { maturityScore, maturityLevel };
}

export interface TenantContext {
  schema: string;
  tenantId: string;
}

export function ctx(tenantId: string): TenantContext {
  return { schema: tenantSchema(tenantId), tenantId };
}

export type ComplianceScope = "my" | "my_team" | "all";

/**
 * Convert cadence string to days (for freshness calculation)
 */
export function cadenceToDays(cadence: string | null | undefined): number {
  if (!cadence) return 90; // default fallback
  const cad = cadence.toLowerCase();
  if (cad === 'continuous' || cad === 'daily') return 1;
  if (cad === 'weekly') return 7;
  if (cad === 'monthly') return 30;
  if (cad === 'quarterly') return 90;
  if (cad === 'semi_annual' || cad === 'semi-annual') return 180;
  if (cad === 'annual') return 365;
  if (cad === 'ad_hoc' || cad === 'ad-hoc') return 365; // ad-hoc treated as annual
  return 90; // default fallback
}

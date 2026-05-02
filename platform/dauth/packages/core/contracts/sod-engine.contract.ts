/**
 * SoD engine contract — separation of duties evaluation types.
 * Canonical SoD outcome and violation structures used by the
 * sod-engine, sod-policy, and sod-conflict-audit services.
 *
 * NOTE: This replaces the stale sod-decision.contract.ts outcomes
 * ('clear'|'warn'|'blocked') with the actual engine outcomes
 * ('block'|'warn'|'escalate'|'allow') used in production code.
 */

export type SodOutcome = 'block' | 'warn' | 'escalate' | 'allow';

export interface SodViolation {
  roleA: string;
  roleB: string;
  conflictLevel: string;
  moduleCode?: string;
  description?: string;
}

export interface ModuleSodViolation {
  actionA: string;
  actionB: string;
  conflictType: 'hard' | 'soft';
  resolutionStrategy: SodOutcome;
  moduleCode: string;
  description?: string;
}

export interface SodCheckResult {
  passed: boolean;
  outcome: SodOutcome;
  violations: SodViolation[];
  moduleViolations?: ModuleSodViolation[];
}

export interface ModuleSodDefinition {
  moduleCode: string;
  actionA: string;
  actionB: string;
  conflictType: 'hard' | 'soft';
  resolutionStrategy: SodOutcome;
  description?: string;
}

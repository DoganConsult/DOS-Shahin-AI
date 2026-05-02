// Type contracts for the case-outcome service. The evaluators emit
// CaseOutcomeResult; the orchestrator persists InitiativeEffectivenessRow.
export interface CaseOutcomeResult {
  effectiveness: number;
  verdict: 'effective' | 'mixed' | 'ineffective';
  rationale: string;
  metadata?: Record<string, unknown>;
}

export interface InitiativeEffectivenessRow {
  initiativeId: string;
  tenantId: string;
  effectiveness: number;
  evaluatedAt: string;
  rationale: string;
  metadata?: Record<string, unknown>;
}

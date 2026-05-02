export const RISK_LEVELS = ['critical', 'high', 'medium', 'low', 'negligible'] as const;
export type RiskLevel = typeof RISK_LEVELS[number];

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 80) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  if (score >= 20) return 'low';
  return 'negligible';
}

export interface RiskRecord {
  id: string;
  title: string;
  description?: string;
  inherentScore: number;
  residualScore: number;
  riskLevel: RiskLevel;
  status: 'open' | 'mitigated' | 'accepted' | 'transferred' | 'closed';
  ownerId?: string;
  treatmentPlan?: string;
}

export interface RiskTreatment {
  id: string;
  riskId: string;
  type: 'mitigate' | 'accept' | 'transfer' | 'avoid';
  status: 'planned' | 'in_progress' | 'completed';
  description: string;
}

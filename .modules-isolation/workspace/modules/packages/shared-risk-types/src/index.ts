export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;
export type RiskLevel = typeof RISK_LEVELS[number];

export function riskLevelFromScore(score: number): RiskLevel {
  if (score >= 75) return 'critical';
  if (score >= 50) return 'high';
  if (score >= 25) return 'medium';
  return 'low';
}

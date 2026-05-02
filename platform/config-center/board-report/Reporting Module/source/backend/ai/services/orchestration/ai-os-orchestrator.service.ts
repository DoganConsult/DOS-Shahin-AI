export async function orchestratedAssessRisk(
  _tenantId: string,
  _riskId: string,
  _opts: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
  return { allowed: false, reason: 'ai_disabled' };
}

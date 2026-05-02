export async function checkRiskAgainstAppetite(
  _tenantId: string,
  _domain: string,
  riskScore: number,
): Promise<{ withinAppetite: boolean; maxAllowed: number }> {
  const maxAllowed = 75;
  return { withinAppetite: riskScore <= maxAllowed, maxAllowed };
}

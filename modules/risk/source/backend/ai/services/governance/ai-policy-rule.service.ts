export async function evaluatePolicies(
  _tenantId: string,
  _context: Record<string, unknown>,
): Promise<{ allowed: boolean; blockedBy?: Record<string, unknown> }> {
  return { allowed: true };
}

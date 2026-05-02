export async function checkBudgetAllowance(_tenantId: string): Promise<{ allowed: boolean; reason?: string }> {
  return { allowed: true };
}

export async function trackUsage(_entry: Record<string, unknown>): Promise<void> {
  return;
}

export async function guardInput(
  _tenantId: string,
  input: string,
  _userId?: string,
  _agentId?: string,
): Promise<{ allowed: boolean; warning?: string; sanitizedInput: string }> {
  return { allowed: true, sanitizedInput: input };
}

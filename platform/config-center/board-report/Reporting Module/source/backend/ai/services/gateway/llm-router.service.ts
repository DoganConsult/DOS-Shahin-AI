export async function getAgentModelConfig(_tenantId: string, _agentId: string): Promise<Record<string, unknown> | null> {
  return null;
}

export async function resolveModelForAgent(
  _tenantId: string,
  _agentId: string,
  _modelCfg: Record<string, unknown>,
  _context?: unknown,
  _inputTokenEstimate?: number,
): Promise<{ provider?: string; model?: string; maxTokens?: number; temperature?: number }> {
  return {};
}

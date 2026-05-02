export async function resolveGovernedAgent(
  _tenantId: string,
  _agentId: string,
): Promise<Record<string, any>> {
  return {
    governed: false,
    resolution_status: 'ungoverned',
    warnings: [],
    resolved_system_prompt: '',
    resolved_model: null,
  };
}

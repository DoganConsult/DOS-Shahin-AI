import type { AgentDefinition } from '../contracts/agent.types';

const _agents = new Map<string, AgentDefinition>();

export function registerAgent(def: AgentDefinition): void {
  _agents.set(def.agentId, def);
}

export function registerAgentBatch(defs: AgentDefinition[]): void {
  for (const def of defs) {
    registerAgent(def);
  }
}

export function getAgentDefinition(agentId: string): AgentDefinition | undefined {
  return _agents.get(agentId);
}

export function getAllAgentDefinitions(): AgentDefinition[] {
  return [..._agents.values()];
}

export async function persistAgentRegistration(_tenantId: string, _agent: AgentDefinition): Promise<void> {}


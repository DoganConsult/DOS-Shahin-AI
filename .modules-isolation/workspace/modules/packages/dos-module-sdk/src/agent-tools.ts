import { safeQuery } from '@dos/db';

export interface AgentToolInputSchema {
  type: 'object';
  properties: Record<string, unknown>;
  required?: string[];
}

export interface AgentToolDefinition {
  name: string;
  description: string;
  input_schema: AgentToolInputSchema;
  handler: (tenantId: string, input: Record<string, unknown>) => Promise<unknown>;
}

export function buildAgentToolRegistry(tools: AgentToolDefinition[]): Map<string, AgentToolDefinition> {
  return new Map(tools.map(t => [t.name, t]));
}



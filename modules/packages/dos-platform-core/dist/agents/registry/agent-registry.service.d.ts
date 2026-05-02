import type { AgentDefinition } from '../contracts/agent.types';
export declare function registerAgent(def: AgentDefinition): void;
export declare function registerAgentBatch(defs: AgentDefinition[]): void;
export declare function getAgentDefinition(agentId: string): AgentDefinition | undefined;
export declare function getAllAgentDefinitions(): AgentDefinition[];
export declare function persistAgentRegistration(_tenantId: string, _agent: AgentDefinition): Promise<void>;

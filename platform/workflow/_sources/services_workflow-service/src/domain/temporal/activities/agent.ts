export type AgentStatus = 'idle' | 'active' | 'paused' | 'error' | 'terminated' | string;
export interface AgentMetrics { tasksCompleted?: number; tasksAssigned?: number; avgResponseTimeMs?: number; errorRate?: number; lastActiveAt?: string; [k: string]: unknown; }
export function VALID_AGENT_TRANSITIONS(_from: string, _to: string): boolean { return true; }
export interface SquadMember { agentId?: string; role?: string; status?: AgentStatus; capabilities?: string[]; [k: string]: unknown; }
export type DeploymentMode = 'standalone' | 'squad' | 'pipeline' | string;
export type ParticipantStatus = 'active' | 'standby' | 'removed' | string;
export type InterventionType = 'override' | 'escalation' | 'correction' | 'approval' | string;
export interface InterventionAuditEntry { interventionId?: string; type?: InterventionType; actor?: string; reason?: string; timestamp?: string; entityType?: string; entityId?: string; [k: string]: unknown; }
export interface HandoffContext { fromAgentId?: string; toAgentId?: string; taskId?: string; reason?: string; state?: Record<string, unknown>; [k: string]: unknown; }
export interface HandoffResult { success?: boolean; handoffId?: string; receivedBy?: string; timestamp?: string; [k: string]: unknown; }
export interface AgentDef { id: string; name: string; nameAr: string; domain: string; domainAr: string; icon: string; color: string; moduleCode: string; routePatterns: string[]; delegationScope: string; quickPrompts: { en: string; ar: string }[]; governance: Record<string, unknown>; }
export interface AgentToolDef { toolName: string; description: string; schema?: unknown; inputSchema?: unknown; [k: string]: unknown; }

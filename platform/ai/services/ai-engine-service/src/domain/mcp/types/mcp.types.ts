export type ToolStatus = 'active' | 'inactive' | 'deprecated' | 'pending_approval' | 'suspended';
export type AgentStatus = 'active' | 'inactive' | 'deprecated' | 'suspended';
export type PromptStatus = 'active' | 'inactive' | 'deprecated';
export type ResourceStatus = 'active' | 'inactive' | 'deprecated';
export type ApprovalMode = 'none' | 'auto' | 'manual' | 'escalation';
export type AutonomyLevel = 'L0' | 'L1' | 'L2' | 'L3';
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
export type DataClassification = 'public' | 'internal' | 'confidential' | 'restricted';
export type SensitivityLevel = 'normal' | 'sensitive' | 'highly_sensitive';
export type VisibilityScope = 'all' | 'admin' | 'agent_only' | 'internal';
export type ExecutionType = 'service_call' | 'http' | 'workflow' | 'composite';
export type TransportType = 'http' | 'stdio' | 'internal';
export type ExecutionStatus = 'succeeded' | 'failed' | 'timeout' | 'blocked' | 'pending_approval';
export type ApprovalRequestStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';

export interface McpToolDef {
  toolId: string;
  toolName: string;
  displayNameEn: string;
  displayNameAr: string | null;
  descriptionEn: string;
  descriptionAr: string | null;
  agentId: string;
  ownerModuleCode: string;
  domainCode: string;
  category: string;
  executionType: ExecutionType;
  handlerKey: string;
  providerKey: string | null;
  executionConfig: Record<string, unknown>;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  riskLevel: RiskLevel;
  dataClassification: DataClassification;
  sensitivityLevel: SensitivityLevel;
  requiredPermissions: string[];
  requiredRoles: string[];
  allowedActorTypes: string[];
  approvalMode: ApprovalMode;
  approvalConfig: Record<string, unknown>;
  minAutonomy: AutonomyLevel;
  maxAutonomy: AutonomyLevel;
  defaultAutonomy: AutonomyLevel;
  humanReviewOnError: boolean;
  humanReviewOnSensitiveData: boolean;
  maxCallsPerMin: number;
  status: ToolStatus;
  version: number;
  tags: string[];
  visibilityScope: VisibilityScope;
  isEnabled: boolean;
  isSystem: boolean;
  sortOrder: number;
}

export interface McpAgentDef {
  agentId: string;
  nameEn: string;
  nameAr: string | null;
  summaryEn: string | null;
  summaryAr: string | null;
  ownerModuleCode: string;
  domainCode: string;
  moduleCodes: string[];
  capabilities: string[];
  tags: string[];
  guardrails: Record<string, unknown>;
  icon: string | null;
  color: string | null;
  status: AgentStatus;
  version: number;
  visibilityScope: VisibilityScope;
  isEnabled: boolean;
  isSystem: boolean;
  sortOrder: number;
}

export interface McpPromptDef {
  promptId: string;
  promptName: string;
  displayNameEn: string;
  displayNameAr: string;
  descriptionEn: string;
  ownerModuleCode: string;
  agentId: string | null;
  domainCode: string;
  category: string;
  promptTemplate: string;
  inputSchema: Record<string, unknown>;
  outputMode: string;
  guardrails: Record<string, unknown>;
  status: PromptStatus;
  version: number;
  isEnabled: boolean;
}

export interface McpResourceDef {
  resourceId: string;
  resourceName: string;
  displayNameEn: string;
  displayNameAr: string;
  descriptionEn: string;
  uriPattern: string;
  ownerModuleCode: string;
  domainCode: string;
  resolverKey: string;
  inputSchema: Record<string, unknown>;
  outputSchema: Record<string, unknown>;
  sensitivityLevel: SensitivityLevel;
  status: ResourceStatus;
  version: number;
  isEnabled: boolean;
}

export interface McpToolOverride {
  toolName: string;
  isEnabled: boolean | null;
  approvalMode: ApprovalMode | null;
  minAutonomy: AutonomyLevel | null;
  maxAutonomy: AutonomyLevel | null;
  defaultAutonomy: AutonomyLevel | null;
  maxCallsPerMin: number | null;
  customInputSchema: Record<string, unknown> | null;
  executionConfig: Record<string, unknown> | null;
}

export interface ToolExecutionRequest {
  toolName: string;
  arguments: Record<string, unknown>;
  tenantId: string;
  userId?: string;
  agentId?: string;
  traceId?: string;
  autonomyLevel?: AutonomyLevel;
  userRoles?: string[];
  userPermissions?: string[];
  actorType?: string;
}

export interface ToolExecutionResult {
  content: Array<{
    type: 'text' | 'json';
    text?: string;
    json?: Record<string, unknown>;
  }>;
  isError?: boolean;
  metadata?: ToolExecutionMetadata;
}

export interface ToolExecutionMetadata {
  handlerKey?: string;
  ownerModuleCode?: string;
  executionType?: string;
  providerKey?: string;
  durationMs?: number;
  riskLevel?: string;
  fromDb?: boolean;
  gatesPassed?: string[];
}

export interface ToolExecutionLog {
  logId: string;
  tenantId: string;
  toolName: string;
  agentId: string | null;
  userId: string | null;
  status: ExecutionStatus;
  inputArgs: Record<string, unknown>;
  outputResult: unknown;
  isError: boolean;
  errorMessage: string | null;
  durationMs: number;
  handlerKey: string | null;
  executionType: string | null;
  providerKey: string | null;
  transportType: TransportType;
  traceId: string | null;
  startedAt: string;
  completedAt: string;
  createdAt: string;
}

export interface ToolApprovalRequest {
  requestId: string;
  tenantId: string;
  toolName: string;
  requestedBy: string;
  agentId: string | null;
  approvalMode: ApprovalMode;
  riskLevel: RiskLevel;
  inputSummary: Record<string, string>;
  status: ApprovalRequestStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface ToolUsageCounter {
  tenantId: string;
  toolName: string;
  scope: string;
  callCount: number;
  deniedCount: number;
  windowStart: string;
  lastCallAt: string;
}

export interface McpServerInfo {
  enabled: boolean;
  agentsCount: number;
  toolsCount: number;
  promptsCount: number;
  resourcesCount: number;
  transport: TransportType;
  dynamicMode: boolean;
  activeSessionCount: number;
  version: string;
}

export interface McpSessionInfo {
  sessionId: string;
  createdAt: number;
  lastAccessedAt: number;
  ageMs: number;
}

export interface GateResult {
  allowed: boolean;
  reason?: string;
  gate: string;
}

export interface ToolListFilter {
  status?: ToolStatus;
  agentId?: string;
  moduleCode?: string;
  domainCode?: string;
  category?: string;
  riskLevel?: RiskLevel;
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: 'ASC' | 'DESC';
}

export interface ToolListResult {
  rows: McpToolDef[];
  total: number;
}

export interface ToolExecutionStatsRow {
  toolName: string;
  callCount: number;
  avgMs: number;
  errorCount: number;
  lastCalled: string;
}

export interface McpHealthReport {
  tenantId: string;
  generatedAt: string;
  serverStatus: 'healthy' | 'degraded' | 'down';
  registryStats: {
    tools: number;
    agents: number;
    prompts: number;
    resources: number;
    enabledTools: number;
    disabledTools: number;
  };
  executionStats: {
    totalCalls: number;
    errorRate: number;
    avgDurationMs: number;
    blockedByGates: number;
    pendingApprovals: number;
  };
  sessionStats: {
    activeSessions: number;
    maxSessions: number;
  };
  warnings: string[];
  errors: string[];
  overallHealth: 'healthy' | 'degraded' | 'critical';
}

export interface McpEventPayload {
  tenantId: string;
  entityType: string;
  entityId: string;
  moduleCode: 'mcp';
  triggeredBy: string;
  timestamp: string;
  correlationId: string;
  eventVersion: number;
  data: Record<string, unknown>;
}

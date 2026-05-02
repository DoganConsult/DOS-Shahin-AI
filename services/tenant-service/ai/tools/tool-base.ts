export interface ToolGovernanceMeta {
  toolId: string;
  toolName: string;
  description: string;
  version: string;
  category: 'data_access' | 'computation' | 'external_call' | 'workflow' | 'notification' | 'admin';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresApproval: boolean;
  auditRequired: boolean;
  allowedAgentTypes: string[];
  allowedRoles: string[];
  rateLimitPerMinute?: number;
  maxConcurrentCalls?: number;
  timeout?: number;
  piiAccess: boolean;
  dataClassification: 'public' | 'internal' | 'confidential' | 'restricted';
}

export interface AgrcToolInput {
  [key: string]: unknown;
}

export interface AgrcToolOutput {
  success: boolean;
  data?: unknown;
  error?: string;
  metadata?: {
    executionTimeMs: number;
    toolId: string;
    correlationId?: string;
  };
}

export interface AgrcToolContext {
  tenantId: string;
  agentId: string;
  actorId: string;
  correlationId?: string;
  sessionId?: string;
  permissions?: string[];
}

export interface AgrcTool {
  meta: ToolGovernanceMeta;
  schema: {
    input: Record<string, unknown>;
    output: Record<string, unknown>;
  };
  execute(input: AgrcToolInput, context: AgrcToolContext): Promise<AgrcToolOutput>;
  validate?(input: AgrcToolInput): { valid: boolean; errors?: string[] };
  canExecute?(context: AgrcToolContext): Promise<boolean>;
}

export function createTool(
  meta: ToolGovernanceMeta,
  execute: (input: AgrcToolInput, context: AgrcToolContext) => Promise<AgrcToolOutput>,
  opts?: {
    schema?: { input: Record<string, unknown>; output: Record<string, unknown> };
    validate?: (input: AgrcToolInput) => { valid: boolean; errors?: string[] };
    canExecute?: (context: AgrcToolContext) => Promise<boolean>;
  },
): AgrcTool {
  return {
    meta,
    schema: opts?.schema ?? { input: {}, output: {} },
    execute,
    validate: opts?.validate,
    canExecute: opts?.canExecute,
  };
}

export function isHighRiskTool(tool: AgrcTool): boolean {
  return tool.meta.riskLevel === 'high' || tool.meta.riskLevel === 'critical';
}

export function requiresHumanApproval(tool: AgrcTool): boolean {
  return tool.meta.requiresApproval || tool.meta.riskLevel === 'critical';
}

export const WORKFLOW_LEVELS = ['operational', 'managerial', 'executive'] as const;
export type WorkflowLevel = (typeof WORKFLOW_LEVELS)[number];

export type RiskClassification = 'low' | 'medium' | 'high' | 'critical';

export interface WorkflowLevelConfig {
  level: WorkflowLevel;
  label: string;
  approvalRequired: boolean;
  maxSteps: number;
}

export interface WorkflowLevelResolutionInput {
  entityType: string;
  entityId: string;
  riskClassification?: RiskClassification;
  moduleCode?: string;
}

export interface WorkflowLevelResolution {
  resolvedLevel: WorkflowLevel;
  reason: string;
  metadata?: Record<string, unknown>;
}

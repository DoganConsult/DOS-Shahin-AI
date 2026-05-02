import { safeQuery } from "@dos/db";

// ============================================================================
// Personal Agent Types & Interfaces
// ============================================================================

export type ActivationMode = 'human' | 'hyper' | 'autonomous';

export interface PersonalAgentAssignment {
  assignmentId: string;
  tenantId: string;
  userId: string;
  agentId: string;
  agentNameEn?: string;
  agentNameAr?: string;
  inheritedRoles: string[];
  inheritedPermissions: string[];
  activationMode: ActivationMode;
  slaBasedActivation: boolean;
  slaThresholdHours?: number;
  slaPriorityFilter?: string[];
  companyPolicyRules: Record<string, unknown>;
  processGovernanceRules: Record<string, unknown>;
  allowedActionTypes: string[];
  blockedActionTypes: string[];
  requiresApprovalFor: string[];
  autoApproveBelowRisk: string;
  isActive: boolean;
  isEnabled: boolean;
  lastActivityAt?: string;
  totalActionsExecuted: number;
  totalActionsApproved: number;
  totalActionsRejected: number;
  userConsentGranted: boolean;
  consentGrantedAt?: string;
  consentPurpose?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface AgentActivity {
  activityId: string;
  tenantId: string;
  assignmentId: string;
  userId: string;
  agentId: string;
  activityType: string;
  activityCategory: string;
  entityType?: string;
  entityId?: string;
  actionTitle?: string;
  actionDescription?: string;
  actionPayload: Record<string, unknown>;
  processId?: string;
  processStep?: string;
  governanceRuleApplied?: string;
  policyRuleApplied?: string;
  slaDeadline?: string;
  slaHoursOverdue?: number;
  triggeredBySla: boolean;
  executionMode: ActivationMode;
  requiredApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  riskLevel: string;
  complianceCheckPassed: boolean;
  complianceCheckDetails?: Record<string, unknown>;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed' | 'cancelled';
  result?: Record<string, unknown>;
  errorMessage?: string;
  executedAt?: string;
  completedAt?: string;
  durationMs?: number;
  authTokenHash?: string;
  authMethod?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
}

export interface ProcessGovernanceRule {
  ruleId: string;
  tenantId: string;
  ruleCode: string;
  ruleNameEn: string;
  ruleNameAr?: string;
  processId: string;
  processSteps?: string[];
  agentIds?: string[];
  activationModes?: ActivationMode[];
  requiresApproval: boolean;
  approvalRoles?: string[];
  maxRiskLevel: string;
  policyConditions: Record<string, unknown>;
  slaBasedActivation: boolean;
  slaThresholdHours?: number;
  enforcementLevel: 'blocking' | 'advisory' | 'informational';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SlaActivationRule {
  ruleId: string;
  tenantId: string;
  assignmentId: string;
  entityType: string;
  priorityFilter?: string[];
  hoursOverdueThreshold: number;
  actionType: string;
  actionTemplate?: Record<string, unknown>;
  requiresApproval: boolean;
  notifyUser: boolean;
  isActive: boolean;
  lastTriggeredAt?: string;
  triggerCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AgentDashboardSummary {
  totalAssignments: number;
  activeAgents: number;
  totalActivities: number;
  pendingApprovals: number;
  completedToday: number;
  failedToday: number;
  slaBreaches: number;
  activitiesByType: Record<string, number>;
  activitiesByStatus: Record<string, number>;
  recentActivities: AgentActivity[];
  performanceMetrics: {
    averageExecutionTime: number;
    approvalRate: number;
    successRate: number;
    slaComplianceRate: number;
  };
}

/** Risk level ordering for comparison */
export const riskLevelOrder: Record<string, number> = { low: 0, medium: 1, high: 2, critical: 3 };

export type RemediationStatus = 'planned' | 'assigned' | 'in_progress' | 'blocked' | 'escalated' | 'pending_verification' | 'verified' | 'closed' | 'archived';

export type RemediationPriority = 'critical' | 'high' | 'medium' | 'low';

export type RemediationSource = 'incident' | 'audit' | 'risk' | 'compliance' | 'vendor' | 'controls' | 'other';

export interface RemediationContract {
  remediationId: string;
  tenantId: string;
  titleEn: string;
  titleAr: string | null;
  description: string;
  status: RemediationStatus;
  priority: RemediationPriority;
  source: RemediationSource;
  sourceId: string | null;
  assignedToId: string;
  verifiedById: string | null;
  planSummary: string | null;
  dueDate: string;
  completedAt: string | null;
  verifiedAt: string | null;
  closedAt: string | null;
  escalationCount: number;
  isOverdue: boolean;
  linkedFindingIds: string[];
  linkedControlIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface RemediationPlanStepContract {
  stepId: string;
  remediationId: string;
  stepNumber: number;
  title: string;
  description: string;
  assignedToId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  dueDate: string | null;
  completedAt: string | null;
}

export interface RemediationDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalRemediations: number;
  openCount: number;
  overdueCount: number;
  blockedCount: number;
  escalatedCount: number;
  avgClosureDays: number | null;
  pendingVerification: number;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface RemediationDashboardContract {
  totalRemediations: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  bySource: Record<string, number>;
  overdueCount: number;
  blockedCount: number;
  avgClosureDays: number | null;
  closureRate: number;
  escalationRate: number;
}

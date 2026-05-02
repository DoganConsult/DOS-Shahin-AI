export type ActionStatus = 'open' | 'assigned' | 'in_progress' | 'blocked' | 'completed' | 'verified' | 'cancelled' | 'archived';

export type ActionPriority = 'critical' | 'high' | 'medium' | 'low';

export type ActionSource = 'remediation' | 'incident' | 'audit' | 'risk' | 'workflow' | 'manual' | 'ai_suggested';

export interface ActionItemContract {
  actionId: string;
  tenantId: string;
  titleEn: string;
  titleAr: string | null;
  description: string;
  status: ActionStatus;
  priority: ActionPriority;
  source: ActionSource;
  sourceId: string | null;
  assignedToId: string;
  ownerId: string;
  dueDate: string;
  completedAt: string | null;
  verifiedById: string | null;
  verifiedAt: string | null;
  progressPercent: number;
  isOverdue: boolean;
  linkedModuleCode: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActionDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalActions: number;
  openCount: number;
  overdueCount: number;
  blockedCount: number;
  completionRate: number;
  avgCompletionDays: number | null;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface ActionDashboardContract {
  totalActions: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  bySource: Record<string, number>;
  overdueCount: number;
  completionRate: number;
  avgCompletionDays: number | null;
}

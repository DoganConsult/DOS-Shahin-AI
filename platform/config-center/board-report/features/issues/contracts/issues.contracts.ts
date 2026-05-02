export type IssueStatus = 'open' | 'triaged' | 'assigned' | 'in_progress' | 'escalated' | 'resolved' | 'closed' | 'archived';
export type IssuePriority = 'critical' | 'high' | 'medium' | 'low';
export type IssueCategory = 'governance' | 'compliance' | 'risk' | 'operational' | 'technical' | 'security' | 'other';

export interface IssueContract {
  issueId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  status: IssueStatus; priority: IssuePriority; category: IssueCategory;
  description: string; reportedById: string; assignedToId: string | null; ownerId: string;
  sourceModule: string | null; sourceId: string | null;
  dueDate: string | null; resolvedAt: string | null; closedAt: string | null;
  linkedRemediationIds: string[]; escalationCount: number; isOverdue: boolean;
  createdAt: string; updatedAt: string;
}

export interface IssueDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalIssues: number; openCount: number;
  overdueCount: number; escalatedCount: number; unassignedCount: number;
  avgResolutionDays: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface IssueDashboardContract {
  totalIssues: number; byStatus: Record<string, number>; byPriority: Record<string, number>;
  byCategory: Record<string, number>; openCount: number; overdueCount: number;
  avgResolutionDays: number | null; escalationRate: number;
}

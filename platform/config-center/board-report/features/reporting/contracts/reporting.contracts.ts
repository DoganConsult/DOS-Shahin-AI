export type ReportStatus = 'draft' | 'generating' | 'generated' | 'under_review' | 'approved' | 'released' | 'distributed' | 'archived';
export type ReportType = 'operational' | 'executive' | 'board' | 'regulatory' | 'audit' | 'ad_hoc' | 'custom';
export type ExportFormat = 'pdf' | 'excel' | 'csv' | 'word' | 'pptx' | 'json';
export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'on_demand';

export interface ReportDefinitionContract {
  reportId: string; tenantId: string; code: string; nameEn: string; nameAr: string | null;
  status: ReportStatus; reportType: ReportType;
  description: string; templateId: string | null;
  sourceModules: string[]; ownerId: string;
  scheduleFrequency: ScheduleFrequency; lastGeneratedAt: string | null;
  nextScheduledAt: string | null; exportFormats: ExportFormat[];
  approvedById: string | null; releasedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface ReportRunContract {
  runId: string; reportId: string; tenantId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  startedAt: string; completedAt: string | null;
  durationMs: number | null; outputFormat: ExportFormat;
  outputSizeBytes: number | null; errorMessage: string | null;
  triggeredById: string;
}

export interface ReportTemplateContract {
  templateId: string; tenantId: string; code: string; nameEn: string;
  reportType: ReportType; version: string;
  sections: string[]; isDefault: boolean;
  createdAt: string; updatedAt: string;
}

export interface ReportDistributionContract {
  distributionId: string; reportId: string; runId: string;
  recipientIds: string[]; channel: 'email' | 'portal' | 'download' | 'api';
  distributedAt: string; distributedById: string;
}

export interface ReportingDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalReports: number;
  failedRuns: number; overdueSchedules: number; pendingApprovals: number;
  avgGenerationMs: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface ReportingDashboardContract {
  totalReports: number; byStatus: Record<string, number>;
  byType: Record<string, number>; scheduledCount: number;
  failedRunsLast24h: number; overdueCount: number; avgGenerationMs: number | null;
  recentRuns: Array<{ runId: string; reportCode: string; status: string; completedAt: string | null }>;
}

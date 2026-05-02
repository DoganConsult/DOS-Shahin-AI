export type ReportStatus = 'draft' | 'generating' | 'generated' | 'reviewing' | 'approved' | 'published' | 'distributed' | 'failed' | 'archived';
export type ReportType = 'compliance' | 'risk' | 'audit' | 'executive' | 'regulatory' | 'board_pack' | 'operational' | 'custom';
export type ExportFormat = 'pdf' | 'xlsx' | 'docx' | 'csv' | 'html';

export interface ReportDefinitionContract {
  reportId: string;
  tenantId: string;
  titleEn: string;
  titleAr: string | null;
  reportType: ReportType;
  status: ReportStatus;
  templateId: string | null;
  ownerId: string;
  scheduleCron: string | null;
  lastGeneratedAt: string | null;
  exportFormat: ExportFormat;
  createdAt: string;
  updatedAt: string;
}

export interface ReportRunContract {
  runId: string;
  reportId: string;
  status: 'queued' | 'generating' | 'completed' | 'failed';
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number | null;
  artifactUrl: string | null;
  errorMessage: string | null;
}

export interface ReportDiagnosticsContract {
  moduleCode: string;
  healthy: boolean;
  totalReports: number;
  failedGenerations: number;
  staleSchedules: number;
  pendingDistributions: number;
  checks: { name: string; passed: boolean; detail?: string }[];
  checkedAt: string;
}

export interface ReportDashboardContract {
  totalReports: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
  scheduledCount: number;
  failedLastWeek: number;
  avgGenerationMs: number | null;
  distributedThisMonth: number;
  pendingApproval: number;
}

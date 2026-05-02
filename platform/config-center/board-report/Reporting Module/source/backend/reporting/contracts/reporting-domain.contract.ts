import type { ReportingDefinitionState, ReportingTemplateState, ReportingScheduleState, ReportingSnapshotState, ReportingExportState } from '../workflows/reporting-lifecycle';

export interface ReportDefinition {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  descriptionEn?: string;
  descriptionAr?: string;
  status: ReportingDefinitionState;
  templateId?: string;
  scopeType: 'tenant' | 'foundation' | 'team' | 'module';
  scopeId?: string;
  outputFormats: ('pdf' | 'excel' | 'csv' | 'json')[];
  ownerActorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportTemplate {
  id: string;
  tenantId: string;
  code: string;
  nameEn: string;
  nameAr: string;
  status: ReportingTemplateState;
  templateBody: string;
  templateEngine: 'jinja2' | 'handlebars' | 'raw';
  supportedFormats: ('pdf' | 'excel' | 'csv')[];
  createdAt: string;
  updatedAt: string;
}

export interface ReportSchedule {
  id: string;
  tenantId: string;
  definitionId: string;
  status: ReportingScheduleState;
  cronExpression: string;
  nextRunAt: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'failed' | 'skipped';
  timezone: string;
  createdAt: string;
  updatedAt: string;
}

export interface ReportSnapshot {
  id: string;
  tenantId: string;
  definitionId: string;
  status: ReportingSnapshotState;
  generatedAt: string;
  dataAsOf: string;
  sizeBytes?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ReportExport {
  id: string;
  tenantId: string;
  definitionId: string;
  snapshotId?: string;
  status: ReportingExportState;
  format: 'pdf' | 'excel' | 'csv' | 'json';
  requestedByActorId: string;
  downloadUrl?: string;
  expiresAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

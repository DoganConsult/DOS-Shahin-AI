import type { ReportingDefinitionState, ReportingScheduleState, ReportingExportState } from '../workflows/reporting-lifecycle';

export interface ReportDefinitionQuery {
  tenantId: string;
  status?: ReportingDefinitionState | ReportingDefinitionState[];
  scopeType?: 'tenant' | 'foundation' | 'team' | 'module';
  scopeId?: string;
  ownerActorId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportScheduleQuery {
  tenantId: string;
  definitionId?: string;
  status?: ReportingScheduleState | ReportingScheduleState[];
  overdueSince?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportExportQuery {
  tenantId: string;
  definitionId?: string;
  status?: ReportingExportState | ReportingExportState[];
  requestedByActorId?: string;
  format?: 'pdf' | 'excel' | 'csv' | 'json';
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
}

export interface ReportSnapshotQuery {
  tenantId: string;
  definitionId?: string;
  staleOlderThanHours?: number;
  page?: number;
  pageSize?: number;
}

export interface ReportDashboardQuery {
  tenantId: string;
  scopeType?: 'tenant' | 'foundation' | 'team';
  scopeId?: string;
  widgetCodes?: string[];
}

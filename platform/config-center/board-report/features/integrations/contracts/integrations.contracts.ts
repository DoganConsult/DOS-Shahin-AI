export type ConnectorStatus = 'draft' | 'configured' | 'active' | 'paused' | 'error' | 'disabled' | 'archived';
export type ConnectorType = 'inbound' | 'outbound' | 'bidirectional';
export type SyncFrequency = 'realtime' | 'hourly' | 'daily' | 'weekly' | 'manual';

export interface ConnectorContract {
  connectorId: string; tenantId: string; code: string; nameEn: string; nameAr: string | null;
  connectorType: ConnectorType; status: ConnectorStatus;
  providerName: string; syncFrequency: SyncFrequency;
  lastSyncAt: string | null; lastSyncStatus: 'success' | 'partial' | 'failed' | null;
  recordsSynced: number; errorCount: number;
  ownerId: string; configuredAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface SyncRunContract {
  runId: string; connectorId: string; startedAt: string; completedAt: string | null;
  status: 'running' | 'success' | 'partial' | 'failed';
  recordsProcessed: number; recordsFailed: number; errorMessage: string | null;
}

export interface IntegrationsDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalConnectors: number; activeConnectors: number;
  errorConnectors: number; staleSyncs: number; failedRecentRuns: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface IntegrationsDashboardContract {
  totalConnectors: number; byStatus: Record<string, number>; byType: Record<string, number>;
  activeCount: number; errorCount: number; totalRecordsSynced: number;
  recentRuns: Array<{ runId: string; connectorName: string; status: string; completedAt: string | null }>;
}

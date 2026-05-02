import type { ConnectorContract, SyncRunContract, IntegrationsDiagnosticsContract } from '../contracts/integrations.contracts';
export function mockConnector(overrides?: Partial<ConnectorContract>): ConnectorContract {
  return { connectorId: 'conn-001', tenantId: 'tenant-001', code: 'JIRA-SYNC', nameEn: 'Jira Issue Sync', nameAr: null,
    connectorType: 'bidirectional', status: 'active', providerName: 'Atlassian Jira', syncFrequency: 'hourly',
    lastSyncAt: new Date().toISOString(), lastSyncStatus: 'success', recordsSynced: 1250, errorCount: 0,
    ownerId: 'user-001', configuredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockSyncRun(overrides?: Partial<SyncRunContract>): SyncRunContract {
  return { runId: 'run-001', connectorId: 'conn-001', startedAt: new Date().toISOString(), completedAt: new Date().toISOString(),
    status: 'success', recordsProcessed: 45, recordsFailed: 0, errorMessage: null, ...overrides };
}
export function mockIntegrationsDiagnostics(overrides?: Partial<IntegrationsDiagnosticsContract>): IntegrationsDiagnosticsContract {
  return { moduleCode: 'integrations', healthy: true, totalConnectors: 12, activeConnectors: 8, errorConnectors: 1, staleSyncs: 2, failedRecentRuns: 1,
    checks: [{ name: 'connector-health', passed: true }, { name: 'sync-freshness', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockConnectorList(count = 5): ConnectorContract[] { return Array.from({ length: count }, (_, i) => mockConnector({ connectorId: `conn-${String(i+1).padStart(3,'0')}`, nameEn: `Connector ${i+1}` })); }

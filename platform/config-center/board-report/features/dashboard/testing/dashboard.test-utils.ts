import type { DashboardDefinitionContract, DashboardDiagnosticsContract } from '../contracts/dashboard.contracts';
export function mockDashboard(overrides?: Partial<DashboardDefinitionContract>): DashboardDefinitionContract {
  return { dashboardId: 'dash-001', tenantId: 'tenant-001', code: 'exec-overview', titleEn: 'Executive GRC Overview', titleAr: null,
    dashboardType: 'executive', status: 'published', ownerId: 'user-001', description: 'C-level GRC posture overview',
    layoutConfig: { columns: 3, rows: 4 }, widgetIds: ['w-001', 'w-002', 'w-003'], isDefault: true, accessScope: 'tenant',
    publishedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockDashboardDiagnostics(overrides?: Partial<DashboardDiagnosticsContract>): DashboardDiagnosticsContract {
  return { moduleCode: 'dashboard', healthy: true, totalDashboards: 15, publishedCount: 8, brokenWidgets: 1, noOwnerCount: 0,
    checks: [{ name: 'dashboard-registry', passed: true }, { name: 'widget-health', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}

import type { WidgetDefinitionContract, WidgetBundleContract, WidgetRuntimeContract, WidgetsDiagnosticsContract } from '../contracts/widgets.contracts';

export function mockWidgetDefinition(overrides?: Partial<WidgetDefinitionContract>): WidgetDefinitionContract {
  return {
    widgetId: 'wgt-001', tenantId: 'tenant-001', code: 'RISK-HEATMAP',
    nameEn: 'Risk Heatmap Widget', nameAr: null,
    status: 'active', widgetType: 'heatmap', categoryCode: 'risk',
    description: 'Interactive risk heatmap showing likelihood vs impact distribution',
    version: '1.2.0', dataSource: 'api', dataEndpoint: '/api/v1/risk/heatmap-data',
    refreshIntervalMs: 60000, defaultConfig: { showLegend: true, colorScheme: 'risk' },
    requiredPermission: 'risk.view', publishedById: 'user-001',
    publishedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockWidgetBundle(overrides?: Partial<WidgetBundleContract>): WidgetBundleContract {
  return {
    bundleId: 'bnd-001', tenantId: 'tenant-001', name: 'Executive Risk Dashboard',
    widgetIds: ['wgt-001', 'wgt-002', 'wgt-003'],
    layout: { columns: 3, rows: 2 }, isDefault: true, ownerId: 'user-001',
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockWidgetRuntime(overrides?: Partial<WidgetRuntimeContract>): WidgetRuntimeContract {
  return {
    widgetId: 'wgt-001', instanceId: 'inst-001', tenantId: 'tenant-001',
    placementContext: 'dashboard', config: { showLegend: true },
    lastRenderedAt: new Date().toISOString(), renderLatencyMs: 120,
    errorCount: 0, ...overrides,
  };
}

export function mockWidgetsDiagnostics(overrides?: Partial<WidgetsDiagnosticsContract>): WidgetsDiagnosticsContract {
  return {
    moduleCode: 'widgets', healthy: true, totalWidgets: 28,
    activeWidgets: 22, deprecatedInUse: 2, renderErrors: 0, staleDataWidgets: 1,
    avgRenderLatencyMs: 95,
    checks: [{ name: 'render-health', passed: true }, { name: 'data-freshness', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides,
  };
}

export type WidgetStatus = 'draft' | 'registered' | 'active' | 'deprecated' | 'archived';
export type WidgetType = 'chart' | 'counter' | 'table' | 'timeline' | 'heatmap' | 'status_card' | 'composite' | 'custom';
export type WidgetCategory = 'risk' | 'compliance' | 'governance' | 'operations' | 'executive' | 'analytics' | 'general';
export type WidgetDataSourceType = 'api' | 'metric' | 'aggregation' | 'static' | 'realtime';

export interface WidgetDefinitionContract {
  widgetId: string; tenantId: string; code: string; nameEn: string; nameAr: string | null;
  status: WidgetStatus; widgetType: WidgetType; categoryCode: WidgetCategory;
  description: string; version: string;
  dataSource: WidgetDataSourceType; dataEndpoint: string | null;
  refreshIntervalMs: number; defaultConfig: Record<string, unknown>;
  requiredPermission: string | null; publishedById: string | null;
  publishedAt: string | null; createdAt: string; updatedAt: string;
}

export interface WidgetBundleContract {
  bundleId: string; tenantId: string; name: string;
  widgetIds: string[]; layout: Record<string, unknown>;
  isDefault: boolean; ownerId: string;
  createdAt: string; updatedAt: string;
}

export interface WidgetRuntimeContract {
  widgetId: string; instanceId: string; tenantId: string;
  placementContext: 'dashboard' | 'module_page' | 'executive_view' | 'portal';
  config: Record<string, unknown>;
  lastRenderedAt: string | null; renderLatencyMs: number | null;
  errorCount: number;
}

export interface WidgetsDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalWidgets: number;
  activeWidgets: number; deprecatedInUse: number;
  renderErrors: number; staleDataWidgets: number;
  avgRenderLatencyMs: number | null;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface WidgetsDashboardContract {
  totalWidgets: number; byStatus: Record<string, number>;
  byType: Record<string, number>; byCategory: Record<string, number>;
  activeCount: number; deprecatedCount: number;
  avgRenderLatencyMs: number | null; errorRate: number;
  recentlyPublished: Array<{ widgetId: string; code: string; widgetType: WidgetType; publishedAt: string }>;
}

export type DashboardStatus = 'draft' | 'published' | 'personal' | 'shared' | 'archived';
export type DashboardType = 'executive' | 'operational' | 'module' | 'custom' | 'system';

export interface DashboardDefinitionContract {
  dashboardId: string; tenantId: string; code: string; titleEn: string; titleAr: string | null;
  dashboardType: DashboardType; status: DashboardStatus;
  ownerId: string; description: string;
  layoutConfig: Record<string, unknown>; widgetIds: string[];
  isDefault: boolean; accessScope: 'tenant' | 'role' | 'personal';
  publishedAt: string | null; createdAt: string; updatedAt: string;
}

export interface DashboardWidgetPlacementContract {
  placementId: string; dashboardId: string; widgetCode: string;
  position: { row: number; col: number; width: number; height: number };
  config: Record<string, unknown>;
}

export interface DashboardDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalDashboards: number;
  publishedCount: number; brokenWidgets: number; noOwnerCount: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface DashboardRegistryContract {
  totalDashboards: number; byType: Record<string, number>; byStatus: Record<string, number>;
  publishedCount: number; personalCount: number; avgWidgetsPerDashboard: number;
}

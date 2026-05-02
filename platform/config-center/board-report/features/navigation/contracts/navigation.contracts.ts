export type NavItemStatus = 'active' | 'hidden' | 'disabled' | 'deprecated';
export type NavItemType = 'route' | 'group' | 'divider' | 'external_link';
export type NavVisibility = 'all' | 'authenticated' | 'permission_gated' | 'role_gated';

export interface NavItemContract {
  navItemId: string; tenantId: string; code: string;
  labelEn: string; labelAr: string | null;
  status: NavItemStatus; itemType: NavItemType;
  routePath: string | null; externalUrl: string | null;
  iconCode: string | null; displayOrder: number;
  parentId: string | null; moduleCode: string | null;
  requiredPermission: string | null; requiredRole: string | null;
  visibility: NavVisibility; badge: string | null;
  children: NavItemContract[];
  createdAt: string; updatedAt: string;
}

export interface NavExposureContract {
  exposureId: string; navItemId: string;
  productCode: string; tenantId: string;
  overrideLabel: string | null; overrideOrder: number | null;
  enabled: boolean; createdAt: string;
}

export interface NavRegistryContract {
  tenantId: string; productCode: string;
  totalItems: number; activeItems: number;
  hiddenItems: number; deprecatedItems: number;
  maxDepth: number; lastUpdatedAt: string;
}

export interface NavigationDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalNavItems: number;
  orphanedItems: number; brokenRoutes: number; duplicateOrders: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface NavigationDashboardContract {
  totalItems: number; byStatus: Record<string, number>;
  byType: Record<string, number>; activeRoutes: number;
  orphanedCount: number; brokenRouteCount: number;
}

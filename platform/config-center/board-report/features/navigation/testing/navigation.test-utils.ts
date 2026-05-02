import type { NavItemContract, NavExposureContract, NavigationDiagnosticsContract } from '../contracts/navigation.contracts';

export function mockNavItem(overrides?: Partial<NavItemContract>): NavItemContract {
  return {
    navItemId: 'nav-001', tenantId: 'tenant-001', code: 'RISK_HUB',
    labelEn: 'Risk Management', labelAr: 'إدارة المخاطر',
    status: 'active', itemType: 'route',
    routePath: '/features/risk', externalUrl: null,
    iconCode: 'shield-alert', displayOrder: 3,
    parentId: null, moduleCode: 'risk',
    requiredPermission: 'risk.view', requiredRole: null,
    visibility: 'permission_gated', badge: null, children: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockNavExposure(overrides?: Partial<NavExposureContract>): NavExposureContract {
  return {
    exposureId: 'exp-001', navItemId: 'nav-001',
    productCode: 'shahin-ai', tenantId: 'tenant-001',
    overrideLabel: null, overrideOrder: null,
    enabled: true, createdAt: new Date().toISOString(), ...overrides,
  };
}

export function mockNavigationDiagnostics(overrides?: Partial<NavigationDiagnosticsContract>): NavigationDiagnosticsContract {
  return {
    moduleCode: 'navigation', healthy: true, totalNavItems: 45,
    orphanedItems: 0, brokenRoutes: 0, duplicateOrders: 2,
    checks: [{ name: 'route-integrity', passed: true }, { name: 'orphan-check', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides,
  };
}

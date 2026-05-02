import type { PortalContract, PortalAccessContract, PortalsDiagnosticsContract } from '../contracts/portals.contracts';
export function mockPortal(overrides?: Partial<PortalContract>): PortalContract {
  return { portalId: 'ptl-001', tenantId: 'tenant-001', code: 'VENDOR-PORTAL', nameEn: 'Vendor Self-Service Portal', nameAr: null,
    portalType: 'vendor', status: 'published', description: 'Vendor self-service for assessments and document submission',
    accessUrl: '/portals/vendor', ownerId: 'user-001', allowedModules: ['vendor', 'evidence'], registeredUsers: 45,
    publishedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockPortalAccess(overrides?: Partial<PortalAccessContract>): PortalAccessContract {
  return { accessId: 'pa-001', portalId: 'ptl-001', userId: 'vendor-user-001', role: 'contributor', grantedAt: new Date().toISOString(), expiresAt: null, isActive: true, ...overrides };
}
export function mockPortalsDiagnostics(overrides?: Partial<PortalsDiagnosticsContract>): PortalsDiagnosticsContract {
  return { moduleCode: 'portals', healthy: true, totalPortals: 5, publishedCount: 3, suspendedCount: 0, noOwnerCount: 0,
    checks: [{ name: 'portal-availability', passed: true }], checkedAt: new Date().toISOString(), ...overrides };
}
export function mockPortalList(count = 5): PortalContract[] { return Array.from({ length: count }, (_, i) => mockPortal({ portalId: `ptl-${String(i+1).padStart(3,'0')}`, nameEn: `Portal ${i+1}` })); }

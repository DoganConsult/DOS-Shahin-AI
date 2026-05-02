import type { AssetContract, AssetDiagnosticsContract } from '../contracts/asset.contracts';
export function mockAsset(overrides?: Partial<AssetContract>): AssetContract {
  return { assetId: 'ast-001', tenantId: 'tenant-001', code: 'HW-001', nameEn: 'Production Database Server', nameAr: null,
    assetType: 'hardware', classification: 'critical', status: 'active', ownerId: 'user-001', custodianId: 'user-002',
    departmentId: 'dept-001', description: 'Primary Oracle DB server', location: 'DC-1 Rack A4',
    linkedControlIds: ['ctrl-001'], linkedRiskIds: ['risk-001'], acquisitionDate: '2023-01-15T00:00:00Z',
    endOfLifeDate: '2028-01-15T00:00:00Z', lastReviewDate: new Date().toISOString(),
    nextReviewDate: new Date(Date.now() + 90 * 86400000).toISOString(),
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides };
}
export function mockAssetDiagnostics(overrides?: Partial<AssetDiagnosticsContract>): AssetDiagnosticsContract {
  return { moduleCode: 'asset', healthy: true, totalAssets: 250, unclassifiedCount: 8, noOwnerCount: 3, overdueReviews: 12,
    endOfLifeApproaching: 5, checks: [{ name: 'asset-inventory', passed: true }, { name: 'classification-coverage', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides };
}
export function mockAssetList(count = 5): AssetContract[] { return Array.from({ length: count }, (_, i) => mockAsset({ assetId: `ast-${String(i+1).padStart(3,'0')}`, nameEn: `Asset ${i+1}` })); }

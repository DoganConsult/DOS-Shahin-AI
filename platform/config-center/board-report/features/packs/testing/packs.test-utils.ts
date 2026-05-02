import type { PackContract, PackInstallationContract, PackCompatibilityContract, PacksDiagnosticsContract } from '../contracts/packs.contracts';

export function mockPack(overrides?: Partial<PackContract>): PackContract {
  return {
    packId: 'pack-001', tenantId: 'tenant-001', code: 'SAMA-CSF-CONTROLS',
    nameEn: 'SAMA Cyber Security Framework Controls Pack', nameAr: null,
    status: 'published', packType: 'controls_library',
    description: 'Pre-built control library aligned with SAMA CSF requirements',
    version: '2.1.0', publishedById: 'user-001', publishedAt: new Date().toISOString(),
    contentManifest: [
      { entryType: 'control', entryCode: 'CTRL', entryName: 'Controls', count: 85 },
      { entryType: 'framework', entryCode: 'FW', entryName: 'Frameworks', count: 1 },
    ],
    targetModules: ['controls', 'compliance'], prerequisites: [],
    installedCount: 12, rating: 4.5,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockPackInstallation(overrides?: Partial<PackInstallationContract>): PackInstallationContract {
  return {
    installationId: 'inst-001', packId: 'pack-001', tenantId: 'tenant-001',
    status: 'installed', installedById: 'user-001', installedAt: new Date().toISOString(),
    itemsInstalled: 86, itemsFailed: 0, errorMessage: null, ...overrides,
  };
}

export function mockPackCompatibility(overrides?: Partial<PackCompatibilityContract>): PackCompatibilityContract {
  return {
    packId: 'pack-001', tenantId: 'tenant-001', status: 'compatible',
    missingPrerequisites: [], conflictingPacks: [], requiredUpgrades: [],
    checkedAt: new Date().toISOString(), ...overrides,
  };
}

export function mockPacksDiagnostics(overrides?: Partial<PacksDiagnosticsContract>): PacksDiagnosticsContract {
  return {
    moduleCode: 'packs', healthy: true, totalPacks: 15,
    installedCount: 8, failedInstallations: 0, deprecatedInUse: 1, incompatibleCount: 0,
    checks: [{ name: 'installation-health', passed: true }, { name: 'compatibility-check', passed: true }],
    checkedAt: new Date().toISOString(), ...overrides,
  };
}

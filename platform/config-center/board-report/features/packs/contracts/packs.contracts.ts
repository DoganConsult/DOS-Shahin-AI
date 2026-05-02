export type PackStatus = 'draft' | 'published' | 'installed' | 'deprecated' | 'archived';
export type PackType = 'content' | 'template' | 'framework' | 'regulation' | 'controls_library' | 'composite';
export type CompatibilityStatus = 'compatible' | 'incompatible' | 'requires_upgrade' | 'unknown';

export interface PackContract {
  packId: string; tenantId: string; code: string; nameEn: string; nameAr: string | null;
  status: PackStatus; packType: PackType; description: string;
  version: string; publishedById: string | null; publishedAt: string | null;
  contentManifest: PackManifestEntry[];
  targetModules: string[]; prerequisites: string[];
  installedCount: number; rating: number | null;
  createdAt: string; updatedAt: string;
}

export interface PackManifestEntry {
  entryType: 'policy' | 'control' | 'framework' | 'template' | 'workflow' | 'report' | 'other';
  entryCode: string; entryName: string; count: number;
}

export interface PackInstallationContract {
  installationId: string; packId: string; tenantId: string;
  status: 'pending' | 'installing' | 'installed' | 'failed' | 'rollback';
  installedById: string; installedAt: string;
  itemsInstalled: number; itemsFailed: number;
  errorMessage: string | null;
}

export interface PackCompatibilityContract {
  packId: string; tenantId: string; status: CompatibilityStatus;
  missingPrerequisites: string[]; conflictingPacks: string[];
  requiredUpgrades: string[]; checkedAt: string;
}

export interface PacksDiagnosticsContract {
  moduleCode: string; healthy: boolean; totalPacks: number;
  installedCount: number; failedInstallations: number;
  deprecatedInUse: number; incompatibleCount: number;
  checks: { name: string; passed: boolean; detail?: string }[]; checkedAt: string;
}

export interface PacksDashboardContract {
  totalPacks: number; byStatus: Record<string, number>;
  byType: Record<string, number>; installedCount: number;
  failedInstallations: number; deprecatedInUse: number;
  recentInstallations: Array<{ installationId: string; packCode: string; status: string; installedAt: string }>;
}

/**
 * Packs -- API Contracts
 *
 * Typed request/response shapes for the module's public API.
 * Covers catalog retrieval, installation actions, compatibility checks,
 * diagnostics, and admin operations.
 *
 * MP-36 Section 6.2: Required contracts.
 *
 * @owner DOS
 * @module packs
 */

// ── List / Query Contracts ──────────────────────────────────────────

export interface PacksListParams {
  tenantId: string;
  page?: number;
  limit?: number;
  status?: string;
  packType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PacksListResponse {
  success: boolean;
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

export interface PacksDetailResponse {
  success: boolean;
  data: unknown;
}

export interface PacksMutationResponse {
  success: boolean;
  id?: string;
  message?: string;
}

// ── Pack Catalog Contract ───────────────────────────────────────────

export interface PackCatalogContract {
  /** GET /api/packs/catalog */
  request: {
    tenantId: string;
    packType?: string;
    search?: string;
  };
  response: {
    success: boolean;
    packs: Array<{
      packId: string;
      code: string;
      version: string;
      nameEn: string;
      nameAr: string | null;
      descriptionEn: string | null;
      packType: string;
      dependsOn: string[];
      isInstalled: boolean;
      isOutdated: boolean;
    }>;
    total: number;
  };
}

// ── Pack Installation Contract ──────────────────────────────────────

export interface PackInstallationContract {
  /** POST /api/packs/install */
  request: {
    tenantId: string;
    packCode: string;
    appliesToRole?: string | null;
    workspaceId?: string | null;
  };
  response: {
    success: boolean;
    packCode: string;
    version: string;
    installed: boolean;
    steps: Array<{
      step: string;
      status: 'ok' | 'skipped' | 'failed';
      details?: string;
    }>;
  };
}

// ── Pack Uninstall Contract ─────────────────────────────────────────

export interface PackUninstallContract {
  /** POST /api/packs/uninstall */
  request: {
    tenantId: string;
    packCode: string;
  };
  response: {
    success: boolean;
    packCode: string;
    uninstalled: boolean;
    message?: string;
  };
}

// ── Compatibility Contract ──────────────────────────────────────────

export interface PackCompatibilityContract {
  /** GET /api/packs/compatibility/:packCode */
  request: {
    tenantId: string;
    packCode: string;
  };
  response: {
    compatible: boolean;
    packCode: string;
    packVersion: string;
    missingDependencies: string[];
    conflictingPacks: string[];
    platformVersionOk: boolean;
    requiredModulesPresent: boolean;
    reason: string;
  };
}

// ── Installed Packs Contract ────────────────────────────────────────

export interface InstalledPacksContract {
  /** GET /api/packs/installed */
  request: {
    tenantId: string;
  };
  response: {
    success: boolean;
    packs: Array<{
      installationId: string;
      packCode: string;
      packVersion: string;
      status: string;
      installedAt: string;
      installedBy: string;
    }>;
    total: number;
  };
}

// ── Pack Updates Contract ───────────────────────────────────────────

export interface PackUpdatesContract {
  /** GET /api/packs/updates */
  request: {
    tenantId: string;
  };
  response: {
    success: boolean;
    updates: Array<{
      packCode: string;
      currentVersion: string;
      latestVersion: string;
    }>;
    totalUpdates: number;
  };
}

// ── Diagnostics Contract ────────────────────────────────────────────

export interface PacksDiagnosticsContract {
  /** GET /api/packs/admin/diagnostics */
  request: {
    tenantId: string;
    includeMetrics?: boolean;
  };
  response: {
    moduleCode: 'packs';
    healthy: boolean;
    checks: Array<{ name: string; passed: boolean; detail?: string }>;
    checkedAt: string;
    metrics?: {
      totalInstalled: number;
      totalAvailable: number;
      failedInstallations: number;
      outdatedPacks: number;
      lastInstallDate: string | null;
      installSuccessRate: number;
    };
  };
}

// ── Admin Settings Contract ─────────────────────────────────────────

export interface PacksAdminSettingsContract {
  /** GET/PUT /api/packs/admin/settings */
  request: {
    tenantId: string;
  };
  response: {
    success: boolean;
    data: Array<{ key: string; value: unknown }>;
  };
}

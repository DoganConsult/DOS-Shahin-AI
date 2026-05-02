export interface BootstrapUserDto {
  userId: string;
  email: string;
  fullName: string | null;
  roleCode: string | null;
  roleCodes?: string[];
  tenantIds?: string[];
}

export interface BootstrapTenantDto {
  tenantId: string;
  tenantNameEn: string | null;
  tenantNameAr: string | null;
  tenantCode: string | null;
  schemaName: string;
}

export interface BootstrapWorkspaceDto {
  defaultDashboard: string | null;
  enforcementMode: string | null;
  riskAppetite: string | null;
  sectors: string[];
}

export interface BootstrapRoleProfileDto {
  roleCode: string | null;
  /** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Non-authoritative. Use navigation.visibleModules instead. */
  modules: string[];
  /** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Non-authoritative. Use navigation.dashboardWidgets instead. */
  dashboardWidgets: string[];
  /** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Non-authoritative. Use resolvedLandingPage instead. */
  defaultLandingPage: string | null;
}

/** Canonical navigation payload derived by backend policy engine. */
export interface BootstrapNavigationDto {
  visibleModules: string[];
  landingPage: string;
  dashboardWidgets: string[];
}

/** Tenant blueprint summary. */
export interface BootstrapBlueprintDto {
  archetypeCode: string | null;
  workflowProfile: string | null;
  aiAutonomyDefault: string | null;
}

export interface BootstrapResponseDto {
  user: BootstrapUserDto;
  tenant: BootstrapTenantDto;
  workspace: BootstrapWorkspaceDto;
  /** @deprecated
 * @removal-date Phase 6 (Frontend consumption)
 * @owner DOS
 * @replacement DAuth frontend services (core/dauth/) Non-authoritative for modules/landing. Use navigation + resolvedLandingPage. */
  roleProfile: BootstrapRoleProfileDto;
  resolvedLandingPage: string;
  /** Policy-derived navigation (replaces static roleProfile.modules as runtime truth). */
  navigation: BootstrapNavigationDto | null;
  /** Tenant blueprint summary. */
  blueprint: BootstrapBlueprintDto | null;
}

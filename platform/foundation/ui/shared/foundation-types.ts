/**
 * Foundation shared local types.
 *
 * These replaces @app/core/models/shared.types and @app/shared/models/* so
 * Foundation pages have no cross-tier @app/* imports.
 *
 * Keep in sync with the upstream definitions — these are intentional local
 * mirrors, not forks.
 */

/** Generic GRC record — any key-value payload from the GRC domain. */
export interface GrcRecord {
  [key: string]: unknown;
}

/** Minimal base DTO shape all entity responses conform to. */
export interface BaseEntityDto {
  id: string;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

/** Standard message-only response. */
export interface MessageResponse {
  message: string;
  [key: string]: unknown;
}

/** KPI card view-model used by the Foundation KPI grid component. */
export interface KpiCardVM {
  id: string;
  labelEn: string;
  labelAr: string;
  value: number | string;
  icon: string;
  color: string;
  bg: string;
  route: string;
  queryParams?: Record<string, string>;
  trend?: number;
  unit?: string;
  severity?: 'default' | 'danger' | 'warning' | 'success';
  /** Newest-last sparkline data points. */
  sparklinePoints?: number[];
}

/** Health alert view-model. */
export interface HealthAlertVM {
  id: string;
  labelEn: string;
  labelAr: string;
  count: number;
  icon: string;
  color: string;
  severity: 'danger' | 'warning' | 'info';
  route: string;
  queryParams?: Record<string, string>;
}

/** Next-action item in the overview rail. */
export interface NextActionVM {
  id: string;
  labelEn: string;
  labelAr: string;
  route: string;
  done: boolean;
  priority: number;
}

/** Audit-trail / activity feed row. */
export interface ActivityRowVM {
  id: string;
  action: string;
  actorName: string;
  entityType: string;
  entityId: string;
  timestamp: string;
  payload?: Record<string, unknown>;
}

/** Active module entry (nav context). */
export interface ActiveModule {
  code: string;
  displayName: string;
  route: string;
  iconClass?: string;
  enabled: boolean;
}

/** Cockpit / workspace config contract (simplified). */
export interface CockpitConfigContract {
  moduleCode: string;
  workspaceTitle?: string;
  showHealthRail?: boolean;
  showNextActions?: boolean;
  kpiCount?: number;
}

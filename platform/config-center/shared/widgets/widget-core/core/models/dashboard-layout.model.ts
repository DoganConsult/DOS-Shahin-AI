import { DashboardWidgetInstance } from './widget-instance.model';

export type DashboardLevel = 'system' | 'tenant' | 'role' | 'user';

/**
 * A complete dashboard layout definition.
 * Priority resolution: user > role > tenant > system.
 */
export interface DashboardLayout {
  id: string;
  code: string;
  name: string;
  audience?: string[];
  level: DashboardLevel;
  roleCode?: string;
  tenantId?: string;
  userId?: string;
  schemaVersion: number;
  widgets: DashboardWidgetInstance[];
}

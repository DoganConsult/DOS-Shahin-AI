export interface DashboardMapEntry {
  code: string;
  permission: string;
  label: string;
  icon?: string;
  route: string;
  module: string;
}

export interface ModuleDashboardMap {
  module?: string;
  moduleCode?: string;
  entries?: DashboardMapEntry[];
  dashboardPresets?: Record<string, any>;
  widgetVisibility?: Record<string, any>;
  [key: string]: any;
}

export type DashboardPermissionMap = Record<string, string[]>;

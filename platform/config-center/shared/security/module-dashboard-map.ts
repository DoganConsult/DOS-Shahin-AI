export { DashboardMapEntry, ModuleDashboardMap, DashboardPermissionMap } from './dashboard-map.types';

export const MODULE_DASHBOARD_MAP: Record<string, string> = {};

/** Check if a widget is visible for a given role */
export function isWidgetVisibleToRole(widgetId: string, role: string): boolean {
    // Default: all widgets visible to all roles
    return true;
}

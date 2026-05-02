/**
 * Standard navigation event subscriptions for a domain module.
 * Call this in every module's registerXxxEventSubscribers() function.
 *
 * Subscribes to:
 *   - module.enabled → refresh module-specific caches
 *   - module.disabled → clean up module-specific caches
 *   - navigation.menu.refreshed → log nav refresh for module
 *   - navigation.cache.invalidated → invalidate module nav-dependent caches
 *
 * @param moduleCode - The module code (e.g., 'risk', 'compliance')
 * @param onModuleEnabled - Optional callback when THIS module is enabled
 * @param onModuleDisabled - Optional callback when THIS module is disabled
 * @param onNavRefreshed - Optional callback when navigation is refreshed
 */
export declare function registerNavigationIntegration(moduleCode: string, opts?: {
    onModuleEnabled?: (tenantId: string, enabledModule: string) => Promise<void>;
    onModuleDisabled?: (tenantId: string, disabledModule: string) => Promise<void>;
    onNavRefreshed?: (tenantId: string) => Promise<void>;
    cacheInvalidator?: (tenantId: string) => Promise<void>;
}): void;
/**
 * Register module navigation items in the module_nav_registration table.
 * Called during module provisioning or initialization.
 * This is the DB-driven approach — modules declare their nav items in the DB,
 * and the navigation composition engine reads them.
 */
export declare function registerModuleNavItems(tenantId: string, moduleCode: string, items: Array<{
    navKey: string;
    parentNavKey?: string;
    labelEn: string;
    labelAr?: string;
    route?: string;
    icon?: string;
    permissionCode?: string;
    sortOrder?: number;
    uiSurface?: string;
}>): Promise<{
    registered: number;
    skipped: number;
}>;
/**
 * Track a navigation item access for analytics.
 * Called by the navigation usage tracking middleware.
 */
export declare function trackNavigationAccess(tenantId: string, userId: string, navKey: string, route: string, moduleCode: string | null, sessionId?: string): Promise<void>;
/**
 * Get navigation usage stats for a tenant (top items, trending, etc.)
 */
export declare function getNavigationUsageStats(tenantId: string, opts?: {
    days?: number;
    limit?: number;
}): Promise<Array<{
    navKey: string;
    route: string;
    moduleCode: string | null;
    hitCount: number;
    uniqueUsers: number;
}>>;

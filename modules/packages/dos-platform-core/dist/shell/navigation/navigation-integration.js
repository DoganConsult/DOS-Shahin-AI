"use strict";
// ============================================
// Platform — Navigation Integration Service
// Used by ALL domain modules to subscribe to
// navigation and module activation events.
// Provides standard cache invalidation and
// module-specific nav item registration.
// ============================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerNavigationIntegration = registerNavigationIntegration;
exports.registerModuleNavItems = registerModuleNavItems;
exports.trackNavigationAccess = trackNavigationAccess;
exports.getNavigationUsageStats = getNavigationUsageStats;
const db_1 = require("@dos/db");
const observability_1 = require("../../observability");
const resilience_1 = require("../../resilience");
const events_1 = require("../../events");
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
function registerNavigationIntegration(moduleCode, opts) {
    // React to module activation — refresh module-specific resources
    (0, events_1.subscribe)({
        eventType: 'module.enabled',
        subscriberId: `${moduleCode}:module-enabled`,
        handler: async (event) => {
            const tenantId = event.tenantId;
            if (!tenantId)
                return;
            const enabledModule = event.payload?.moduleCode;
            // If this module was enabled, run module-specific init
            if (enabledModule === moduleCode && opts?.onModuleEnabled) {
                await opts.onModuleEnabled(tenantId, enabledModule).catch((err) => {
                    observability_1.logger.warn(`[${moduleCode}] module.enabled handler failed`, { error: String(err) });
                });
            }
            // Invalidate module caches when any module changes (visibility may shift)
            if (opts?.cacheInvalidator) {
                await opts.cacheInvalidator(tenantId).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
            }
        },
    });
    (0, events_1.subscribe)({
        eventType: 'module.disabled',
        subscriberId: `${moduleCode}:module-disabled`,
        handler: async (event) => {
            const tenantId = event.tenantId;
            if (!tenantId)
                return;
            const disabledModule = event.payload?.moduleCode;
            if (disabledModule === moduleCode && opts?.onModuleDisabled) {
                await opts.onModuleDisabled(tenantId, disabledModule).catch((err) => {
                    observability_1.logger.warn(`[${moduleCode}] module.disabled handler failed`, { error: String(err) });
                });
            }
            if (opts?.cacheInvalidator) {
                await opts.cacheInvalidator(tenantId).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
            }
        },
    });
    // React to navigation changes — module may need to refresh UI-dependent caches
    (0, events_1.subscribe)({
        eventType: 'navigation.menu.refreshed',
        subscriberId: `${moduleCode}:nav-menu-refreshed`,
        handler: async (event) => {
            const tenantId = event.tenantId;
            if (!tenantId)
                return;
            if (opts?.onNavRefreshed) {
                await opts.onNavRefreshed(tenantId).catch((err) => {
                    observability_1.logger.warn(`[${moduleCode}] navigation.menu.refreshed handler failed`, { error: String(err) });
                });
            }
        },
    });
    // React to nav cache invalidation — clear any module-held nav data
    (0, events_1.subscribe)({
        eventType: 'navigation.cache.invalidated',
        subscriberId: `${moduleCode}:nav-cache-invalidated`,
        handler: async (event) => {
            const tenantId = event.tenantId;
            if (!tenantId)
                return;
            if (opts?.cacheInvalidator) {
                await opts.cacheInvalidator(tenantId).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
            }
        },
    });
    observability_1.logger.debug(`[${moduleCode}] Navigation integration registered (4 subscriptions)`);
}
/**
 * Register module navigation items in the module_nav_registration table.
 * Called during module provisioning or initialization.
 * This is the DB-driven approach — modules declare their nav items in the DB,
 * and the navigation composition engine reads them.
 */
async function registerModuleNavItems(tenantId, moduleCode, items) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    let registered = 0;
    let skipped = 0;
    for (const item of items) {
        try {
            const result = await (0, db_1.safeQuery)(`INSERT INTO "${schema}".module_nav_registration
          (module_code, nav_key, parent_nav_key, label_en, label_ar, route, icon, permission_code, sort_order, ui_surface)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (module_code, nav_key) DO UPDATE SET
           label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
           route = EXCLUDED.route, icon = EXCLUDED.icon,
           permission_code = EXCLUDED.permission_code,
           sort_order = EXCLUDED.sort_order, ui_surface = EXCLUDED.ui_surface
         RETURNING id`, [moduleCode, item.navKey, item.parentNavKey ?? null,
                item.labelEn, item.labelAr ?? '', item.route ?? null,
                item.icon ?? null, item.permissionCode ?? null,
                item.sortOrder ?? 0, item.uiSurface ?? null]);
            if (result.rows.length > 0)
                registered++;
            else
                skipped++;
        }
        catch {
            skipped++;
        }
    }
    // Also sync to navigation_registry for immediate composition
    for (const item of items) {
        await (0, db_1.safeQuery)(`INSERT INTO "${schema}".navigation_registry
        (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code,
         item_type, section, sort_order, permission_code, is_active, status, version, schema_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'link','primary',$8,$9,true,'published',1,'1.0')
       ON CONFLICT (nav_key) DO NOTHING`, [item.navKey, item.parentNavKey ?? null, item.labelEn, item.labelAr ?? '',
            item.route ?? null, item.icon ?? null, moduleCode,
            item.sortOrder ?? 0, item.permissionCode ?? null]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    }
    // Emit registration event
    await (0, events_1.publish)('navigation.menu.refreshed', tenantId, {
        moduleCode, registered, reason: 'module_nav_registration',
    }).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    return { registered, skipped };
}
/**
 * Track a navigation item access for analytics.
 * Called by the navigation usage tracking middleware.
 */
async function trackNavigationAccess(tenantId, userId, navKey, route, moduleCode, sessionId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    // Insert usage log
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".navigation_usage_log
      (tenant_id, user_id, nav_key, route, module_code, session_id)
     VALUES ($1, $2, $3, $4, $5, $6)`, [tenantId, userId, navKey, route, moduleCode, sessionId ?? null]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
    // Bump frequency_score on navigation_registry
    await (0, db_1.safeQuery)(`UPDATE "${schema}".navigation_registry
     SET frequency_score = frequency_score + 1, last_accessed_at = now()
     WHERE nav_key = $1`, [navKey]).catch((0, resilience_1.catchHandler)(resilience_1.EC.EVENT_BUS));
}
/**
 * Get navigation usage stats for a tenant (top items, trending, etc.)
 */
async function getNavigationUsageStats(tenantId, opts) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const days = opts?.days ?? 30;
    const limit = opts?.limit ?? 20;
    const { rows } = await (0, db_1.safeQuery)(`SELECT nav_key, route, module_code,
            COUNT(*)::int AS hit_count,
            COUNT(DISTINCT user_id)::int AS unique_users
     FROM "${schema}".navigation_usage_log
     WHERE tenant_id = $1 AND accessed_at > now() - interval '${days} days'
     GROUP BY nav_key, route, module_code
     ORDER BY hit_count DESC
     LIMIT $2`, [tenantId, limit]).catch(() => ({ rows: [] }));
    return rows.map((r) => ({
        navKey: r.nav_key,
        route: r.route,
        moduleCode: r.module_code,
        hitCount: r.hit_count,
        uniqueUsers: r.unique_users,
    }));
}
// Autonomous Subscription: Decoupled tracking from platform middleware (Law 15)
(0, events_1.subscribe)({
    eventType: 'analytics.navigation.menu_loaded',
    subscriberId: 'platform:navigation-tracker:menu_loaded',
    handler: async (event) => {
        const p = event.payload;
        if (event.tenantId && p?.userId) {
            await trackNavigationAccess(event.tenantId, p.userId, '__menu_load__', '/api/navigation/menu', null);
        }
    }
});
(0, events_1.subscribe)({
    eventType: 'analytics.navigation.item_clicked',
    subscriberId: 'platform:navigation-tracker:item_clicked',
    handler: async (event) => {
        const p = event.payload;
        if (event.tenantId && p?.userId && p?.navKey && p?.route) {
            await trackNavigationAccess(event.tenantId, p.userId, p.navKey, p.route, p.moduleCode || null);
        }
    }
});
//# sourceMappingURL=navigation-integration.js.map
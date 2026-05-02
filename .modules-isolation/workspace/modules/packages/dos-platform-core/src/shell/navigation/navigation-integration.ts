// ============================================
// Platform — Navigation Integration Service
// Used by ALL domain modules to subscribe to
// navigation and module activation events.
// Provides standard cache invalidation and
// module-specific nav item registration.
// ============================================

import { safeQuery, tenantSchema } from '@dos/db';
import type { PlatformEvent } from '@dos/types';
import { logger } from '../../observability';
import { catchHandler, EC } from '../../resilience';
import { subscribe, publish } from '../../events';

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
export function registerNavigationIntegration(
  moduleCode: string,
  opts?: {
    onModuleEnabled?: (tenantId: string, enabledModule: string) => Promise<void>;
    onModuleDisabled?: (tenantId: string, disabledModule: string) => Promise<void>;
    onNavRefreshed?: (tenantId: string) => Promise<void>;
    cacheInvalidator?: (tenantId: string) => Promise<void>;
  },
): void {
  // React to module activation — refresh module-specific resources
  subscribe({
    eventType: 'module.enabled',
    subscriberId: `${moduleCode}:module-enabled`,
    handler: async (event: PlatformEvent) => {
      const tenantId = event.tenantId;
      if (!tenantId) return;
      const enabledModule = (event.payload as Record<string, unknown>)?.moduleCode as string;

      // If this module was enabled, run module-specific init
      if (enabledModule === moduleCode && opts?.onModuleEnabled) {
        await opts.onModuleEnabled(tenantId, enabledModule).catch((err) => {
          logger.warn(`[${moduleCode}] module.enabled handler failed`, { error: String(err) });
        });
      }

      // Invalidate module caches when any module changes (visibility may shift)
      if (opts?.cacheInvalidator) {
        await opts.cacheInvalidator(tenantId).catch(catchHandler(EC.EVENT_BUS));
      }
    },
  });

  subscribe({
    eventType: 'module.disabled',
    subscriberId: `${moduleCode}:module-disabled`,
    handler: async (event: PlatformEvent) => {
      const tenantId = event.tenantId;
      if (!tenantId) return;
      const disabledModule = (event.payload as Record<string, unknown>)?.moduleCode as string;

      if (disabledModule === moduleCode && opts?.onModuleDisabled) {
        await opts.onModuleDisabled(tenantId, disabledModule).catch((err) => {
          logger.warn(`[${moduleCode}] module.disabled handler failed`, { error: String(err) });
        });
      }

      if (opts?.cacheInvalidator) {
        await opts.cacheInvalidator(tenantId).catch(catchHandler(EC.EVENT_BUS));
      }
    },
  });

  // React to navigation changes — module may need to refresh UI-dependent caches
  subscribe({
    eventType: 'navigation.menu.refreshed',
    subscriberId: `${moduleCode}:nav-menu-refreshed`,
    handler: async (event: PlatformEvent) => {
      const tenantId = event.tenantId;
      if (!tenantId) return;

      if (opts?.onNavRefreshed) {
        await opts.onNavRefreshed(tenantId).catch((err) => {
          logger.warn(`[${moduleCode}] navigation.menu.refreshed handler failed`, { error: String(err) });
        });
      }
    },
  });

  // React to nav cache invalidation — clear any module-held nav data
  subscribe({
    eventType: 'navigation.cache.invalidated',
    subscriberId: `${moduleCode}:nav-cache-invalidated`,
    handler: async (event: PlatformEvent) => {
      const tenantId = event.tenantId;
      if (!tenantId) return;

      if (opts?.cacheInvalidator) {
        await opts.cacheInvalidator(tenantId).catch(catchHandler(EC.EVENT_BUS));
      }
    },
  });

  logger.debug(`[${moduleCode}] Navigation integration registered (4 subscriptions)`);
}

/**
 * Register module navigation items in the module_nav_registration table.
 * Called during module provisioning or initialization.
 * This is the DB-driven approach — modules declare their nav items in the DB,
 * and the navigation composition engine reads them.
 */
export async function registerModuleNavItems(
  tenantId: string,
  moduleCode: string,
  items: Array<{
    navKey: string;
    parentNavKey?: string;
    labelEn: string;
    labelAr?: string;
    route?: string;
    icon?: string;
    permissionCode?: string;
    sortOrder?: number;
    uiSurface?: string;
  }>,
): Promise<{ registered: number; skipped: number }> {
  const schema = tenantSchema(tenantId);
  let registered = 0;
  let skipped = 0;

  for (const item of items) {
    try {
      const result = await safeQuery(
        `INSERT INTO "${schema}".module_nav_registration
          (module_code, nav_key, parent_nav_key, label_en, label_ar, route, icon, permission_code, sort_order, ui_surface)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (module_code, nav_key) DO UPDATE SET
           label_en = EXCLUDED.label_en, label_ar = EXCLUDED.label_ar,
           route = EXCLUDED.route, icon = EXCLUDED.icon,
           permission_code = EXCLUDED.permission_code,
           sort_order = EXCLUDED.sort_order, ui_surface = EXCLUDED.ui_surface
         RETURNING id`,
        [moduleCode, item.navKey, item.parentNavKey ?? null,
         item.labelEn, item.labelAr ?? '', item.route ?? null,
         item.icon ?? null, item.permissionCode ?? null,
         item.sortOrder ?? 0, item.uiSurface ?? null],
      );
      if (result.rows.length > 0) registered++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  // Also sync to navigation_registry for immediate composition
  for (const item of items) {
    await safeQuery(
      `INSERT INTO "${schema}".navigation_registry
        (nav_key, parent_nav_key, label_en, label_ar, route, icon, module_code,
         item_type, section, sort_order, permission_code, is_active, status, version, schema_version)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'link','primary',$8,$9,true,'published',1,'1.0')
       ON CONFLICT (nav_key) DO NOTHING`,
      [item.navKey, item.parentNavKey ?? null, item.labelEn, item.labelAr ?? '',
       item.route ?? null, item.icon ?? null, moduleCode,
       item.sortOrder ?? 0, item.permissionCode ?? null],
    ).catch(catchHandler(EC.EVENT_BUS));
  }

  // Emit registration event
  await publish('navigation.menu.refreshed', tenantId, {
    moduleCode, registered, reason: 'module_nav_registration',
  }).catch(catchHandler(EC.EVENT_BUS));

  return { registered, skipped };
}

/**
 * Track a navigation item access for analytics.
 * Called by the navigation usage tracking middleware.
 */
export async function trackNavigationAccess(
  tenantId: string,
  userId: string,
  navKey: string,
  route: string,
  moduleCode: string | null,
  sessionId?: string,
): Promise<void> {
  const schema = tenantSchema(tenantId);

  // Insert usage log
  await safeQuery(
    `INSERT INTO "${schema}".navigation_usage_log
      (tenant_id, user_id, nav_key, route, module_code, session_id)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [tenantId, userId, navKey, route, moduleCode, sessionId ?? null],
  ).catch(catchHandler(EC.EVENT_BUS));

  // Bump frequency_score on navigation_registry
  await safeQuery(
    `UPDATE "${schema}".navigation_registry
     SET frequency_score = frequency_score + 1, last_accessed_at = now()
     WHERE nav_key = $1`,
    [navKey],
  ).catch(catchHandler(EC.EVENT_BUS));
}

/**
 * Get navigation usage stats for a tenant (top items, trending, etc.)
 */
export async function getNavigationUsageStats(
  tenantId: string,
  opts?: { days?: number; limit?: number },
): Promise<Array<{ navKey: string; route: string; moduleCode: string | null; hitCount: number; uniqueUsers: number }>> {
  const schema = tenantSchema(tenantId);
  const days = opts?.days ?? 30;
  const limit = opts?.limit ?? 20;

  const { rows } = await safeQuery(
    `SELECT nav_key, route, module_code,
            COUNT(*)::int AS hit_count,
            COUNT(DISTINCT user_id)::int AS unique_users
     FROM "${schema}".navigation_usage_log
     WHERE tenant_id = $1 AND accessed_at > now() - interval '${days} days'
     GROUP BY nav_key, route, module_code
     ORDER BY hit_count DESC
     LIMIT $2`,
    [tenantId, limit],
  ).catch(() => ({ rows: [] as any[] }));

  return rows.map((r: Record<string, any>) => ({
    navKey: r.nav_key as string,
    route: r.route as string,
    moduleCode: r.module_code as string | null,
    hitCount: r.hit_count as number,
    uniqueUsers: r.unique_users as number,
  }));
}

// Autonomous Subscription: Decoupled tracking from platform middleware (Law 15)
subscribe({
  eventType: 'analytics.navigation.menu_loaded',
  subscriberId: 'platform:navigation-tracker:menu_loaded',
  handler: async (event: PlatformEvent) => {
    const p = event.payload as Record<string, unknown>;
    if (event.tenantId && p?.userId) {
      await trackNavigationAccess(event.tenantId, p.userId as string, '__menu_load__', '/api/navigation/menu', null);
    }
  }
});

subscribe({
  eventType: 'analytics.navigation.item_clicked',
  subscriberId: 'platform:navigation-tracker:item_clicked',
  handler: async (event: PlatformEvent) => {
    const p = event.payload as Record<string, unknown>;
    if (event.tenantId && p?.userId && p?.navKey && p?.route) {
      await trackNavigationAccess(
        event.tenantId,
        p.userId as string,
        p.navKey as string,
        p.route as string,
        (p.moduleCode as string) || null
      );
    }
  }
});

/**
 * Notification → Navigation Deep Link Resolution
 *
 * Validates and enriches notification deep links against the
 * navigation registry. If a notification links to a route that
 * doesn't exist in the user's navigation, marks it as inaccessible
 * so the frontend can show appropriate fallback.
 *
 * Bidirectional integration: notifications consume navigation truth.
 */

import { safeQuery, tenantSchema } from '../ports/database.port';
import { cacheGetOrSet, CacheTTL } from '../ports/platform.port';

export interface ResolvedLink {
  route: string;
  accessible: boolean;
  navKey: string | null;
  labelEn: string | null;
  breadcrumb: string[];
}

/**
 * Resolve a notification deep link against navigation registry.
 * Returns accessibility info for the target route.
 */
export async function resolveNotificationLink(
  tenantId: string,
  roleCode: string | null,
  link: string,
): Promise<ResolvedLink> {
  if (!link || !link.startsWith('/')) {
    return { route: link, accessible: true, navKey: null, labelEn: null, breadcrumb: [] };
  }

  const schema = tenantSchema(tenantId);
  const cacheKey = `nav:link:${tenantId}:${roleCode ?? 'anon'}:${link}`;

  return cacheGetOrSet<ResolvedLink>(
    cacheKey,
    async () => {
      // Find the matching navigation entry
      const { rows } = await safeQuery(
        `SELECT r.nav_key, r.label_en, r.module_code, r.parent_nav_key,
                COALESCE(b.is_allowed, true) AS is_allowed
         FROM "${schema}".navigation_registry r
         LEFT JOIN "${schema}".navigation_role_bindings b
           ON b.nav_key = r.nav_key AND b.role_code = $2
         WHERE r.route = $1 AND r.is_active = true
           AND (r.status = 'published' OR r.status IS NULL)
         LIMIT 1`,
        [link, roleCode ?? ''],
      );

      if (rows.length === 0) {
        // Route not in registry — try prefix match
        const segments = link.split('/').filter(Boolean);
        while (segments.length > 1) {
          segments.pop();
          const parentRoute = '/' + segments.join('/');
          const { rows: parentRows } = await safeQuery(
            `SELECT r.nav_key, r.label_en, COALESCE(b.is_allowed, true) AS is_allowed
             FROM "${schema}".navigation_registry r
             LEFT JOIN "${schema}".navigation_role_bindings b
               ON b.nav_key = r.nav_key AND b.role_code = $2
             WHERE r.route = $1 AND r.is_active = true
             LIMIT 1`,
            [parentRoute, roleCode ?? ''],
          );
          if (parentRows.length > 0) {
            return {
              route: link,
              accessible: parentRows[0].is_allowed !== false,
              navKey: parentRows[0].nav_key,
              labelEn: parentRows[0].label_en,
              breadcrumb: [parentRows[0].label_en],
            };
          }
        }
        return { route: link, accessible: true, navKey: null, labelEn: null, breadcrumb: [] };
      }

      const row = rows[0];
      const breadcrumb = await buildBreadcrumbLabels(schema, row.nav_key);

      return {
        route: link,
        accessible: row.is_allowed !== false,
        navKey: row.nav_key,
        labelEn: row.label_en,
        breadcrumb,
      };
    },
    CacheTTL.SHORT,
  );
}

/** Build breadcrumb labels by walking up the parent chain */
async function buildBreadcrumbLabels(schema: string, navKey: string): Promise<string[]> {
  const labels: string[] = [];
  const visited = new Set<string>();
  let current = navKey;

  while (current && !visited.has(current) && labels.length < 5) {
    visited.add(current);
    const { rows } = await safeQuery(
      `SELECT label_en, parent_nav_key FROM "${schema}".navigation_registry WHERE nav_key = $1`,
      [current],
    ).catch(() => ({ rows: [] }));

    if (rows.length === 0) break;
    labels.unshift(rows[0].label_en);
    current = rows[0].parent_nav_key;
  }

  return labels;
}

/**
 * Enrich a list of notifications with navigation accessibility info.
 * Used by the notification API to add `linkAccessible` and `linkBreadcrumb` fields.
 */
export async function enrichNotificationsWithNavLinks(
  tenantId: string,
  roleCode: string | null,
  notifications: Array<{ link?: string | null; [key: string]: any }>,
): Promise<Array<any>> {
  return Promise.all(
    notifications.map(async (notif) => {
      if (!notif.link) return { ...notif, linkAccessible: true, linkBreadcrumb: [] };
      const resolved = await resolveNotificationLink(tenantId, roleCode, notif.link);
      return {
        ...notif,
        linkAccessible: resolved.accessible,
        linkBreadcrumb: resolved.breadcrumb,
        linkNavKey: resolved.navKey,
      };
    }),
  );
}

import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================================================
// Regulatory Alert Service (Issue 16)
// Monitors for new regulatory updates and sends proactive notifications
// to affected tenants. Integrates with regulatory change tracking.
// ============================================================================

import { safeQuery } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import { logFrameworkChange } from "./regulatory-content.service";
import { getFirstRow } from '@dos/db';
import { SYSTEM_TENANT } from '../../ports/platform.port';

export interface RegulatoryAlert {
  alertId: string;
  authorityCode: string;
  authorityName: string;
  alertType: "new_regulation" | "amendment" | "circular" | "enforcement" | "deadline";
  title: string;
  description: string;
  affectedSectors: string[];
  effectiveDate?: string;
  urgency: "critical" | "high" | "medium" | "low";
  sourceUrl?: string;
}

/**
 * Create a new regulatory alert and propagate to affected tenants.
 */
export async function createRegulatoryAlert(
  alert: Omit<RegulatoryAlert, "alertId">
): Promise<{ alertId: string; tenantsNotified: number }> {
  // 1. Insert the alert
  const res = await safeQuery(
    `INSERT INTO public.regulatory_alerts
      (authority_code, alert_type, title, description,
       affected_sectors, effective_date, urgency, source_url)
     VALUES ($1, $2, $3, $4, $5, $6::date, $7, $8)
     RETURNING alert_id`,
    [
      alert.authorityCode,
      alert.alertType,
      alert.title,
      alert.description,
      alert.affectedSectors,
      alert.effectiveDate || null,
      alert.urgency,
      alert.sourceUrl || null,
    ]
  );

  const alertId = getFirstRow(res)?.alert_id;

  // 2. Find affected tenants by sector
  const tenantRes = await safeQuery(
    `SELECT DISTINCT ts.tenant_id, t.tenant_name
     FROM public.tenant_sectors ts
     JOIN public.tenants t ON t.tenant_id = ts.tenant_id
     WHERE ts.sector_code = ANY($1)
       AND t.status = 'active'`,
    [alert.affectedSectors]
  );

  // 3. Send notifications
  let tenantsNotified = 0;
  for (const tenant of tenantRes.rows) {
    await safeQuery(
      `INSERT INTO public.notification_queue
        (tenant_id, recipient_id, notification_type, subject, body, priority)
       SELECT $1, u.user_id, 'regulatory_alert',
              $2, $3,
              CASE WHEN $4 = 'critical' THEN 'urgent'
                   WHEN $4 = 'high' THEN 'high'
                   ELSE 'normal' END
       FROM public.users u
       WHERE u.tenant_id = $1
         AND u.role IN ('admin', 'compliance_officer', 'owner')
       LIMIT 5`,
      [
        tenant.tenant_id,
        `[${alert.authorityCode}] ${alert.title}`,
        alert.description,
        alert.urgency,
      ]
    );
    tenantsNotified++;
  }

  // 4. If it's an amendment, also log as a regulatory change
  if (alert.alertType === "amendment" || alert.alertType === "new_regulation") {
    await logFrameworkChange({
      frameworkCode: alert.authorityCode.toLowerCase(),
      toVersion: "update",
      changeType: alert.alertType === "new_regulation" ? "new" : "amended",
      effectiveDate: alert.effectiveDate,
      summary: alert.description,
      publishedBy: alert.authorityName,
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  eventBus.publish(({
      eventType: "regulatory.alert_created",
      tenantId: SYSTEM_TENANT,
      sourceService: "RegulatoryAlertService",
      severity: alert.urgency === "critical" ? "critical" : "warning",
      payload: { alertId, tenantsNotified, authorityCode: alert.authorityCode },
    } as any));

  return { alertId, tenantsNotified };
}

/**
 * List recent regulatory alerts.
 */
export async function listRecentAlerts(
  limit: number = 20,
  sector?: string
): Promise<RegulatoryAlert[]> {
  let queryStr = `
    SELECT ra.alert_id AS "alertId", ra.authority_code AS "authorityCode",
           COALESCE(a.authority_name_en, ra.authority_code) AS "authorityName",
           ra.alert_type AS "alertType", ra.title, ra.description,
           ra.affected_sectors AS "affectedSectors",
           ra.effective_date AS "effectiveDate",
           ra.urgency, ra.source_url AS "sourceUrl",
           ra.created_at
    FROM public.regulatory_alerts ra
    LEFT JOIN public.lookup_ksa_regulatory_authorities a
      ON a.authority_code = ra.authority_code`;

  const params: unknown[] = [limit];
  if (sector) {
    queryStr += ` WHERE $2 = ANY(ra.affected_sectors)`;
    params.push(sector);
  }
  queryStr += ` ORDER BY ra.created_at DESC LIMIT $1`;

  const res = await safeQuery(queryStr, params);
  return res.rows;
}

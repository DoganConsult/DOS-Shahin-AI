// ============================================================================
// Regulatory Change Propagation Service
// Detects framework changes, identifies affected tenants, and creates
// process tasks for compliance officers to review and action.
// Runs as a scheduled job (daily at 06:00 AM).
// ============================================================================

import { query as _query, safeQuery } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
import type { GenericRow as _GenericRow } from '@dos/types';
import { SYSTEM_TENANT } from '../../ports/platform.port';

/**
 * Main entry point — called by scheduled job.
 * 1. Find pending (un-assessed) regulatory changes
 * 2. For each change, find affected tenants
 * 3. Create tenant_regulatory_impacts records
 * 4. Create process tasks for compliance officers
 * 5. Mark change as propagated
 */
export async function propagateRegulatoryChanges(): Promise<{
  changesProcessed: number;
  tenantsNotified: number;
}> {
  let changesProcessed = 0;
  let tenantsNotified = 0;

  // 1. Find pending changes
  const pendingRes = await safeQuery(
    `SELECT change_id, framework_code, to_version, change_type,
            effective_date, summary, affected_controls
     FROM public.regulatory_change_log
     WHERE propagated_at IS NULL
     ORDER BY effective_date ASC
     LIMIT 20`,
    []
  );

  for (const change of pendingRes.rows) {
    // 2. Find tenants using this framework
    const tenantRes = await safeQuery(
      `SELECT DISTINCT t.tenant_id, t.tenant_name
       FROM public.tenants t
       JOIN public.tenant_sectors ts ON ts.tenant_id = t.tenant_id
       JOIN public.lookup_authority_sector_mapping asm ON asm.sector_code = ts.sector_code
       JOIN public.lookup_authority_frameworks af ON af.authority_code = asm.authority_code
       WHERE LOWER(af.framework_code) = LOWER($1)
         AND t.status = 'active'`,
      [change.framework_code]
    );

    // Fallback: check tenants with this framework directly in their workspace
    let affectedTenants = tenantRes.rows;
    if (affectedTenants.length === 0) {
      const directRes = await safeQuery(
        `SELECT DISTINCT t.tenant_id, t.tenant_name
         FROM public.tenants t
         WHERE t.status = 'active'
           AND EXISTS (
             SELECT 1 FROM public.lookup_authority_frameworks af
             WHERE LOWER(af.framework_code) = LOWER($1)
               AND af.mandatory_for_sectors && (
                 SELECT COALESCE(array_agg(ts.sector_code), '{}')
                 FROM public.tenant_sectors ts WHERE ts.tenant_id = t.tenant_id
               )
           )`,
        [change.framework_code]
      );
      affectedTenants = directRes.rows;
    }

    // 3. Create impact records for each tenant
    for (const tenant of affectedTenants) {
      const controlCount = Array.isArray(change.affected_controls)
        ? change.affected_controls.length
        : 0;

      await safeQuery(
        `INSERT INTO public.tenant_regulatory_impacts
          (change_id, tenant_id, framework_code, affected_control_count, status)
         VALUES ($1, $2, $3, $4, 'pending')
         ON CONFLICT DO NOTHING`,
        [change.change_id, tenant.tenant_id, change.framework_code, controlCount]
      );

      // 4. Create notification
      await safeQuery(
        `INSERT INTO public.notification_queue
          (tenant_id, recipient_id, notification_type, subject, body, priority)
         SELECT $1, u.user_id, 'regulatory_change',
                'Regulatory Update: ' || $2 || ' v' || $3,
                $4,
                'high'
         FROM public.users u
         WHERE u.tenant_id = $1
           AND u.role IN ('admin', 'compliance_officer', 'owner')
         LIMIT 5`,
        [
          tenant.tenant_id,
          change.framework_code,
          change.to_version,
          change.summary || `Framework ${change.framework_code} has been ${change.change_type}. Effective: ${change.effective_date}. Please review affected controls.`,
        ]
      );

      tenantsNotified++;
    }

    // 5. Mark as propagated
    await safeQuery(
      `UPDATE public.regulatory_change_log
       SET propagated_at = NOW(), impact_assessed = TRUE, updated_at = NOW()
       WHERE change_id = $1`,
      [change.change_id]
    );

    changesProcessed++;
  }

  if (changesProcessed > 0) {
    eventBus.publish(({
          eventType: "regulatory.changes_propagated",
          tenantId: SYSTEM_TENANT,
          sourceService: "RegulatoryChangePropagation",
          severity: "info",
          payload: { changesProcessed, tenantsNotified },
        } as any));
  }

  return { changesProcessed, tenantsNotified };
}

/**
 * Acknowledge a regulatory impact for a tenant.
 */
export async function acknowledgeRegulatoryImpact(
  impactId: string,
  userId: string,
  notes?: string
): Promise<void> {
  await safeQuery(
    `UPDATE public.tenant_regulatory_impacts
     SET status = 'acknowledged', acknowledged_by = $2, acknowledged_at = NOW(), notes = $3
     WHERE id = $1`,
    [impactId, userId, notes || null]
  );
}

/**
 * Resolve a regulatory impact (controls updated, compliance verified).
 */
export async function resolveRegulatoryImpact(
  impactId: string,
  notes?: string
): Promise<void> {
  await safeQuery(
    `UPDATE public.tenant_regulatory_impacts
     SET status = 'resolved', resolved_at = NOW(),
         notes = COALESCE(notes, '') || E'\n' || COALESCE($2, '')
     WHERE id = $1`,
    [impactId, notes || null]
  );
}

/**
 * Get pending regulatory impacts for a tenant.
 */
export async function getPendingImpacts(tenantId: string): Promise<Record<string, unknown>[]> {
  const res = await safeQuery(
    `SELECT tri.id, tri.framework_code, tri.affected_control_count, tri.status,
            tri.created_at, rcl.change_type, rcl.to_version, rcl.effective_date,
            rcl.summary, rcl.source_url
     FROM public.tenant_regulatory_impacts tri
     JOIN public.regulatory_change_log rcl ON rcl.change_id = tri.change_id
     WHERE tri.tenant_id = $1 AND tri.status <> 'resolved'
     ORDER BY rcl.effective_date DESC`,
    [tenantId]
  );
  return res.rows;
}

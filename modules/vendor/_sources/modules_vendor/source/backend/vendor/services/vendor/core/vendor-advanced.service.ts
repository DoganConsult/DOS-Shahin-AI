import { logger } from '../../../ports/logger.port';
import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { createLink } from '../../../ports/platform.port';
import { recordObservation } from "../../../../ai/services/observability/ai-observation.service.js";
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallow, EC , catchHandler } from '@dos/platform-core/resilience';

export async function initiateDueDiligence(tenantId: string, data: {
  vendor_id: string; dd_type?: string; initiated_by: string; due_date?: string; risk_tier?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const ddRow = await withTransaction(tenantId, async (client) => {
    const r = await safeQueryWithClient(
      `INSERT INTO "${schema}".vendor_due_diligence (vendor_id, dd_type, initiated_by, due_date, risk_tier)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [data.vendor_id, data.dd_type || 'initial', data.initiated_by, data.due_date || null, data.risk_tier || null], client
    );
    await safeQueryWithClient(`UPDATE "${schema}".vendors SET dd_status = 'in_progress', updated_at = NOW() WHERE vendor_id = $1`, [data.vendor_id], client);
    return getFirstRow(r);
  });

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'vendor.dd_initiated', tenantId, sourceService: 'vendor-advanced',
      entityType: 'vendor_dd', entityId: ddRow?.dd_id, severity: 'info',
      payload: { vendorId: data.vendor_id, ddType: data.dd_type },
    } as any)), { tenantId, operation: 'eventBus:vendor.dd_initiated' });
  return ddRow;
}

export async function getDueDiligenceStatus(tenantId: string, vendorId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT dd.*, (SELECT COUNT(*) FROM "${schema}".vendor_dd_steps s WHERE s.dd_id = dd.dd_id AND s.status = 'completed') AS steps_completed,
       (SELECT COUNT(*) FROM "${schema}".vendor_dd_steps s WHERE s.dd_id = dd.dd_id) AS steps_total
     FROM "${schema}".vendor_due_diligence dd
     WHERE dd.vendor_id = $1 AND dd.deleted_at IS NULL ORDER BY dd.initiated_at DESC`, [vendorId]
  )).rows;
}

export async function updateDueDiligenceStep(tenantId: string, stepId: string, data: {
  status: string; result?: string; notes?: string; completed_by?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const completedAt = data.status === 'completed' ? 'NOW()' : 'NULL';
  const step = getFirstRow((await safeQuery(
    `UPDATE "${schema}".vendor_dd_steps
     SET status = $1, result = $2, notes = COALESCE($3, notes), completed_by = $4, completed_at = ${completedAt}, updated_at = NOW()
     WHERE step_id = $5 RETURNING *`,
    [data.status, data.result || null, data.notes || null, data.completed_by || null, stepId]
  )));

  if (data.status === 'completed' && step?.dd_workflow_id) {
    try {
      const { completeDDWorkflow } = await import('./vendor-lifecycle-workflows.service.js');
      await completeDDWorkflow(tenantId, step.dd_workflow_id, data.status, { passed: true, completedBy: data.completed_by || 'system' });
    } catch { /* best effort — auto-completion non-fatal */ }
  }

  return step;
}

export async function addSubVendor(tenantId: string, data: {
  vendor_id: string; sub_vendor_name: string; service_provided?: string;
  data_access_level?: string; risk_tier?: string; geographic_location?: string;
  sub_vendor_id?: string; initiated_by?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const r = await withTransaction(tenantId, async (client) => {
    const inserted = await safeQueryWithClient(
      `INSERT INTO "${schema}".vendor_fourth_party_risk
         (vendor_id, sub_vendor_id, sub_vendor_name, service_provided, data_access_level, risk_tier, geographic_location)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [data.vendor_id, data.sub_vendor_id || null, data.sub_vendor_name, data.service_provided || null,
       data.data_access_level || 'none', data.risk_tier || 'medium', data.geographic_location || null], client
    );
    await safeQueryWithClient(
      `UPDATE "${schema}".vendors SET fourth_party_count = COALESCE(fourth_party_count,0) + 1, updated_at = NOW() WHERE vendor_id = $1`,
      [data.vendor_id], client
    );
    return getFirstRow(inserted);
  });
  if (data.data_access_level === 'full' || data.data_access_level === 'sensitive') {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'vendor.fourth_party_flagged', tenantId, sourceService: 'vendor-advanced',
          entityType: 'fourth_party', entityId: r?.fp_risk_id, severity: 'warning',
          payload: { vendorId: data.vendor_id, subVendorName: data.sub_vendor_name, dataAccess: data.data_access_level },
        } as any)), { tenantId, operation: 'eventBus:vendor.fourth_party_flagged' });
  }

  // If sub_vendor_id is provided, check for and create multi-vendor links
  if (data.sub_vendor_id) {
    // Find other vendors with the same sub_vendor_id
    const otherVendorsRes = await safeQuery(
      `SELECT DISTINCT vendor_id FROM "${schema}".vendor_fourth_party_risk
       WHERE sub_vendor_id = $1 AND vendor_id != $2 AND deleted_at IS NULL AND is_active = TRUE`,
      [data.sub_vendor_id, data.vendor_id]
    );

    for (const otherVendor of otherVendorsRes.rows) {
      // Check if link already exists
      const existingLink = await safeQuery(
        `SELECT link_id FROM "${schema}".entity_links
         WHERE ((source_type = 'vendor' AND source_id = $1 AND target_type = 'vendor' AND target_id = $2)
            OR (source_type = 'vendor' AND source_id = $2 AND target_type = 'vendor' AND target_id = $1))
           AND relationship_type = 'related_to'
         LIMIT 1`,
        [data.vendor_id, otherVendor.vendor_id]
      );

      if (existingLink.rows.length === 0) {
        try {
          await createLink(tenantId, data.initiated_by || 'system', {
            sourceType: 'vendor',
            sourceId: data.vendor_id,
            targetType: 'vendor',
            targetId: otherVendor.vendor_id,
            relationshipType: 'related_to',
            metadata: {
              reason: 'shared_sub_vendor',
              sharedSubVendorId: data.sub_vendor_id,
              sharedSubVendorName: data.sub_vendor_name,
            },
          });
        } catch (err: unknown) {
          // Non-fatal
          logger.warn(`[VendorAdvanced] Failed to create multi-vendor link: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }
  }

  return r;
}

export async function getSubVendors(tenantId: string, vendorId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".vendor_fourth_party_risk WHERE vendor_id = $1 AND deleted_at IS NULL AND is_active = TRUE ORDER BY created_at DESC`,
    [vendorId]
  )).rows;
}

export async function getSubVendorRiskExposure(tenantId: string, vendorId: string): Promise<{ vendorId: string; totalSubVendors: number; sensitiveCount: number; highRiskCount: number; breakdown: GenericRow[] }> {
  const schema = tenantSchema(tenantId);
  const rows = (await safeQuery(
    `SELECT risk_tier, data_access_level, COUNT(*) AS cnt
     FROM "${schema}".vendor_fourth_party_risk
     WHERE vendor_id = $1 AND is_active = TRUE AND deleted_at IS NULL GROUP BY risk_tier, data_access_level`,
    [vendorId]
  )).rows;
  const sensitiveCount = rows.filter((r: GenericRow) => ['full','sensitive'].includes(r.data_access_level as string)).reduce((s: number, r: GenericRow) => s + parseInt(String(r.cnt)), 0);
  const highRiskCount = rows.filter((r: GenericRow) => ['high','critical'].includes(r.risk_tier as string)).reduce((s: number, r: GenericRow) => s + parseInt(String(r.cnt)), 0);
  return { vendorId, totalSubVendors: rows.reduce((s: number, r: GenericRow) => s + parseInt(String(r.cnt)), 0), sensitiveCount, highRiskCount, breakdown: rows };
}

export async function checkVendorSLABreaches(tenantId: string, vendorId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT b.*, d.metric_name, d.metric_code
    FROM "${schema}".vendor_sla_breach_log b
    JOIN "${schema}".vendor_sla_definitions d ON d.sla_def_id = b.sla_def_id
    WHERE b.remediation_status NOT IN ('resolved','accepted')`;
  const params: unknown[] = [];
  if (vendorId) { params.push(vendorId); sql += ` AND b.vendor_id = $1`; }
  sql += ` ORDER BY b.created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function recordSLAMetric(tenantId: string, data: {
  sla_def_id: string; vendor_id: string; period_start: string; period_end: string;
  actual_value: number; recorded_by?: string; source?: string;
}): Promise<GenericRow | undefined> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.vendor_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function getConcentrationRisk(tenantId: string, dimension?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".vendor_concentration_analysis WHERE 1=1`;
  const params: unknown[] = [];
  if (dimension) { params.push(dimension); sql += ` AND dimension = $1`; }
  sql += ` ORDER BY analysis_date DESC, risk_level DESC`;
  return (await safeQuery(sql, params)).rows;
}

/**
 * Assess concentration risk across multiple dimensions.
 * Calculates vendor concentration by service category, geography, data access, etc.
 * Stores results in vendor_concentration_analysis and publishes events for high-risk concentrations.
 */
export async function assessConcentrationRisk(tenantId: string): Promise<{
  analyzed: number;
  highRisk: number;
  criticalRisk: number;
}> {
  const schema = tenantSchema(tenantId);
  const today = new Date().toISOString().slice(0, 10);
  
  // Clear existing analysis for today (idempotent)
  await safeQuery(
    `DELETE FROM "${schema}".vendor_concentration_analysis WHERE analysis_date = $1`,
    [today]
  );

  let analyzed = 0;
  let highRisk = 0;
  let criticalRisk = 0;

  // Dimension 1: Service Category
  const serviceCategoryRes = await safeQuery(
    `SELECT category, COUNT(*)::int AS vendor_count,
       SUM(COALESCE(contract_value, 0))::numeric AS total_spend
     FROM "${schema}".vendors
     WHERE deleted_at IS NULL AND status = 'active'
     GROUP BY category
     HAVING COUNT(*) >= 3 OR SUM(COALESCE(contract_value, 0)) > 0`
  );

  for (const row of serviceCategoryRes.rows) {
    const totalVendors = getFirstRow((await safeQuery(
      `SELECT COUNT(*)::int FROM "${schema}".vendors WHERE deleted_at IS NULL AND status = 'active'`
    )))?.count || 1;
    const vendorPct = (row.vendor_count / totalVendors) * 100;
    const concentrationScore = vendorPct > 50 ? 100 : vendorPct * 2;
    const riskLevel = concentrationScore >= 80 ? 'critical' : concentrationScore >= 60 ? 'high' : concentrationScore >= 40 ? 'medium' : 'low';
    
    const affectedVendors = (await safeQuery(
      `SELECT vendor_id, name FROM "${schema}".vendors WHERE category = $1 AND deleted_at IS NULL AND status = 'active' LIMIT 20`,
      [row.category]
    )).rows.map((v: GenericRow) => ({ vendorId: v.vendor_id, name: v.name }));

    await safeQuery(
      `INSERT INTO "${schema}".vendor_concentration_analysis
       (analysis_date, dimension, dimension_value, vendor_count, total_spend, spend_pct, risk_level, concentration_score, affected_vendors)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [today, 'service_category', row.category || 'uncategorized', row.vendor_count, row.total_spend || 0,
       vendorPct, riskLevel, concentrationScore, JSON.stringify(affectedVendors)]
    );
    analyzed++;
    if (riskLevel === 'high') highRisk++;
    if (riskLevel === 'critical') criticalRisk++;

    if (riskLevel === 'high' || riskLevel === 'critical') {
      await swallow(EC.EVENT_BUS, eventBus.publish(({
              eventType: 'vendor.concentration_high',
              tenantId,
              sourceService: 'vendor-advanced',
              entityType: 'vendor_concentration',
              entityId: row.category || 'uncategorized',
              severity: riskLevel === 'critical' ? 'critical' : 'warning',
              payload: {
                dimension: 'service_category',
                dimensionValue: row.category || 'uncategorized',
                concentrationPct: vendorPct,
                vendorCount: row.vendor_count,
                affectedVendors: affectedVendors.map((v: GenericRow) => v.vendorId),
              },
            } as any)), { tenantId, operation: 'eventBus:vendor.concentration_high' });
    }
  }

  // Dimension 2: Geography (from vendor_fourth_party_risk)
  const geographyRes = await safeQuery(
    `SELECT geographic_location, COUNT(DISTINCT vendor_id)::int AS vendor_count
     FROM "${schema}".vendor_fourth_party_risk
     WHERE deleted_at IS NULL AND is_active = TRUE AND geographic_location IS NOT NULL
     GROUP BY geographic_location
     HAVING COUNT(DISTINCT vendor_id) >= 3`
  );

  for (const row of geographyRes.rows) {
    const totalVendorsWithGeo = getFirstRow((await safeQuery(
      `SELECT COUNT(DISTINCT vendor_id)::int FROM "${schema}".vendor_fourth_party_risk
       WHERE deleted_at IS NULL AND is_active = TRUE AND geographic_location IS NOT NULL`
    )))?.count || 1;
    const vendorPct = (row.vendor_count / totalVendorsWithGeo) * 100;
    const concentrationScore = vendorPct > 50 ? 100 : vendorPct * 2;
    const riskLevel = concentrationScore >= 80 ? 'critical' : concentrationScore >= 60 ? 'high' : concentrationScore >= 40 ? 'medium' : 'low';
    
    const affectedVendors = (await safeQuery(
      `SELECT DISTINCT v.vendor_id, v.name FROM "${schema}".vendors v
       JOIN "${schema}".vendor_fourth_party_risk fp ON fp.vendor_id = v.vendor_id
       WHERE fp.geographic_location = $1 AND v.deleted_at IS NULL AND fp.deleted_at IS NULL AND fp.is_active = TRUE
       LIMIT 20`,
      [row.geographic_location]
    )).rows.map((v: GenericRow) => ({ vendorId: v.vendor_id, name: v.name }));

    await safeQuery(
      `INSERT INTO "${schema}".vendor_concentration_analysis
       (analysis_date, dimension, dimension_value, vendor_count, risk_level, concentration_score, affected_vendors)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [today, 'geography', row.geographic_location, row.vendor_count, riskLevel, concentrationScore, JSON.stringify(affectedVendors)]
    );
    analyzed++;
    if (riskLevel === 'high') highRisk++;
    if (riskLevel === 'critical') criticalRisk++;

    if (riskLevel === 'high' || riskLevel === 'critical') {
      await swallow(EC.EVENT_BUS, eventBus.publish(({
              eventType: 'vendor.concentration_high',
              tenantId,
              sourceService: 'vendor-advanced',
              entityType: 'vendor_concentration',
              entityId: row.geographic_location,
              severity: riskLevel === 'critical' ? 'critical' : 'warning',
              payload: {
                dimension: 'geography',
                dimensionValue: row.geographic_location,
                concentrationPct: vendorPct,
                vendorCount: row.vendor_count,
                affectedVendors: affectedVendors.map((v: GenericRow) => v.vendorId),
              },
            } as any)), { tenantId, operation: 'eventBus:vendor.concentration_high' });
    }
  }

  // Dimension 3: Data Access Level (high-risk sub-vendors with full/sensitive access)
  const dataAccessRes = await safeQuery(
    `SELECT data_access_level, COUNT(DISTINCT vendor_id)::int AS vendor_count
     FROM "${schema}".vendor_fourth_party_risk
     WHERE deleted_at IS NULL AND is_active = TRUE
       AND data_access_level IN ('full', 'sensitive')
     GROUP BY data_access_level
     HAVING COUNT(DISTINCT vendor_id) >= 2`
  );

  for (const row of dataAccessRes.rows) {
    const totalVendorsWithSubVendors = getFirstRow((await safeQuery(
      `SELECT COUNT(DISTINCT vendor_id)::int FROM "${schema}".vendor_fourth_party_risk
       WHERE deleted_at IS NULL AND is_active = TRUE`
    )))?.count || 1;
    const vendorPct = (row.vendor_count / totalVendorsWithSubVendors) * 100;
    const concentrationScore = vendorPct > 50 ? 100 : vendorPct * 2;
    const riskLevel = concentrationScore >= 80 ? 'critical' : concentrationScore >= 60 ? 'high' : concentrationScore >= 40 ? 'medium' : 'low';
    
    const affectedVendors = (await safeQuery(
      `SELECT DISTINCT v.vendor_id, v.name FROM "${schema}".vendors v
       JOIN "${schema}".vendor_fourth_party_risk fp ON fp.vendor_id = v.vendor_id
       WHERE fp.data_access_level = $1 AND v.deleted_at IS NULL AND fp.deleted_at IS NULL AND fp.is_active = TRUE
       LIMIT 20`,
      [row.data_access_level]
    )).rows.map((v: GenericRow) => ({ vendorId: v.vendor_id, name: v.name }));

    await safeQuery(
      `INSERT INTO "${schema}".vendor_concentration_analysis
       (analysis_date, dimension, dimension_value, vendor_count, risk_level, concentration_score, affected_vendors)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [today, 'data_access', row.data_access_level, row.vendor_count, riskLevel, concentrationScore, JSON.stringify(affectedVendors)]
    );
    analyzed++;
    if (riskLevel === 'high') highRisk++;
    if (riskLevel === 'critical') criticalRisk++;

    if (riskLevel === 'high' || riskLevel === 'critical') {
      await swallow(EC.EVENT_BUS, eventBus.publish(({
              eventType: 'vendor.concentration_high',
              tenantId,
              sourceService: 'vendor-advanced',
              entityType: 'vendor_concentration',
              entityId: row.data_access_level,
              severity: riskLevel === 'critical' ? 'critical' : 'warning',
              payload: {
                dimension: 'data_access',
                dimensionValue: row.data_access_level,
                concentrationPct: vendorPct,
                vendorCount: row.vendor_count,
                affectedVendors: affectedVendors.map((v: GenericRow) => v.vendorId),
              },
            } as any)), { tenantId, operation: 'eventBus:vendor.concentration_high' });
    }
  }

  // Record observation if critical risks found
  if (criticalRisk > 0) {
    await recordObservation({
      tenantId,
      entityType: 'vendor',
      entityId: 'concentration_analysis',
      observationType: 'anomaly',
      severity: 'critical',
      title: `Vendor concentration risk: ${criticalRisk} critical dimension(s) identified`,
      description: `Concentration risk assessment identified ${criticalRisk} critical and ${highRisk} high-risk concentration dimensions. Single-point-of-failure risks detected.`,
      evidenceJson: { analyzed, highRisk, criticalRisk, analysisDate: today },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  return { analyzed, highRisk, criticalRisk };
}

/**
 * Link vendors that share the same sub-vendor (fourth-party).
 * Creates entity links with 'related_to' relationship type.
 * Returns count of links created.
 */
export async function linkVendorsBySharedSubVendor(tenantId: string): Promise<{
  linksCreated: number;
  vendorPairs: Array<{ vendor1Id: string; vendor2Id: string; sharedSubVendorName: string }>;
}> {
  const schema = tenantSchema(tenantId);
  
  // Find vendors that share sub-vendors (by sub_vendor_id or sub_vendor_name)
  const sharedSubVendorsRes = await safeQuery(
    `SELECT 
       fp1.vendor_id AS vendor1_id,
       fp2.vendor_id AS vendor2_id,
       COALESCE(fp1.sub_vendor_id::text, fp1.sub_vendor_name) AS shared_sub_vendor_key,
       fp1.sub_vendor_name
     FROM "${schema}".vendor_fourth_party_risk fp1
     JOIN "${schema}".vendor_fourth_party_risk fp2
       ON fp1.vendor_id < fp2.vendor_id
       AND (
         (fp1.sub_vendor_id IS NOT NULL AND fp2.sub_vendor_id IS NOT NULL AND fp1.sub_vendor_id = fp2.sub_vendor_id)
         OR (fp1.sub_vendor_id IS NULL AND fp2.sub_vendor_id IS NULL AND fp1.sub_vendor_name = fp2.sub_vendor_name)
       )
     WHERE fp1.deleted_at IS NULL AND fp1.is_active = TRUE
       AND fp2.deleted_at IS NULL AND fp2.is_active = TRUE
     GROUP BY fp1.vendor_id, fp2.vendor_id, COALESCE(fp1.sub_vendor_id::text, fp1.sub_vendor_name), fp1.sub_vendor_name`
  );

  const vendorPairs: Array<{ vendor1Id: string; vendor2Id: string; sharedSubVendorName: string }> = [];
  let linksCreated = 0;

  for (const row of sharedSubVendorsRes.rows) {
    // Check if link already exists (bidirectional check)
    const existingLink = await safeQuery(
      `SELECT link_id FROM "${schema}".entity_links
       WHERE ((source_type = 'vendor' AND source_id = $1 AND target_type = 'vendor' AND target_id = $2)
          OR (source_type = 'vendor' AND source_id = $2 AND target_type = 'vendor' AND target_id = $1))
         AND relationship_type = 'related_to'
       LIMIT 1`,
      [row.vendor1_id, row.vendor2_id]
    );

    if (existingLink.rows.length === 0) {
      // Create bidirectional link
      try {
        await createLink(tenantId, 'system', {
          sourceType: 'vendor',
          sourceId: row.vendor1_id,
          targetType: 'vendor',
          targetId: row.vendor2_id,
          relationshipType: 'related_to',
          metadata: {
            reason: 'shared_sub_vendor',
            sharedSubVendorName: row.sub_vendor_name,
            sharedSubVendorKey: row.shared_sub_vendor_key,
          },
        });
        linksCreated++;
        vendorPairs.push({
          vendor1Id: row.vendor1_id,
          vendor2Id: row.vendor2_id,
          sharedSubVendorName: row.sub_vendor_name,
        });
      } catch (err: unknown) {
        // Non-fatal — link may already exist or entity may not exist
        logger.warn(`[VendorAdvanced] Failed to create link: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  // Record observation if links were created
  if (linksCreated > 0) {
    await recordObservation({
      tenantId,
      entityType: 'vendor',
      entityId: 'multi_vendor_linking',
      observationType: 'pattern',
      severity: 'info',
      title: `Multi-vendor linking: ${linksCreated} vendor relationship(s) created`,
      description: `Linked ${linksCreated} vendor pair(s) that share sub-vendors. This enables cascade risk assessment across vendor relationships.`,
      evidenceJson: { linksCreated, vendorPairs },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  return { linksCreated, vendorPairs };
}

export async function initiateOffboarding(tenantId: string, data: {
  vendor_id: string; reason: string; initiated_by: string; target_completion?: string; transition_plan?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);

  const offboardingRow = await withTransaction(tenantId, async (client) => {
    const r = await safeQueryWithClient(
      `INSERT INTO "${schema}".vendor_offboarding (vendor_id, reason, initiated_by, target_completion, transition_plan)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [data.vendor_id, data.reason, data.initiated_by, data.target_completion || null, data.transition_plan || null], client
    );
    await safeQueryWithClient(`UPDATE "${schema}".vendors SET offboarding_status = 'initiated', updated_at = NOW() WHERE vendor_id = $1`, [data.vendor_id], client);
    return getFirstRow(r);
  });

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'vendor.offboarding_initiated', tenantId, sourceService: 'vendor-advanced',
      entityType: 'vendor_offboarding', entityId: offboardingRow?.offboarding_id, severity: 'warning',
      payload: { vendorId: data.vendor_id, reason: data.reason },
    } as any)), { tenantId, operation: 'eventBus:vendor.offboarding_initiated' });
  return offboardingRow;
}

export async function getOffboardingChecklist(tenantId: string, offboardingId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".vendor_offboarding_checklist WHERE offboarding_id = $1 ORDER BY step_number`, [offboardingId]
  )).rows;
}

export async function updateOffboardingStep(tenantId: string, checklistId: string, data: {
  status: string; completed_by?: string; notes?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const completedAt = data.status === 'completed' ? 'NOW()' : 'NULL';
  return getFirstRow((await safeQuery(
    `UPDATE "${schema}".vendor_offboarding_checklist
     SET status = $1, completed_by = $2, notes = COALESCE($3, notes), completed_at = ${completedAt}, updated_at = NOW()
     WHERE checklist_id = $4 RETURNING *`,
    [data.status, data.completed_by || null, data.notes || null, checklistId]
  )));
}

export async function getVendorMonitoringSignals(tenantId: string, vendorId?: string, unacknowledgedOnly?: boolean): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".vendor_monitoring_signals WHERE 1=1`;
  const params: unknown[] = [];
  if (vendorId) { params.push(vendorId); sql += ` AND vendor_id = $${params.length}`; }
  if (unacknowledgedOnly) { sql += ` AND acknowledged = FALSE`; }
  sql += ` ORDER BY detected_at DESC LIMIT 200`;
  return (await safeQuery(sql, params)).rows;
}

export async function recordMonitoringSignal(tenantId: string, data: {
  vendor_id: string; signal_type: string; severity: string; title: string;
  description?: string; source?: string; source_name?: string;
}): Promise<GenericRow | undefined> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".vendor_monitoring_signals (vendor_id, signal_type, severity, title, description, source, source_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.vendor_id, data.signal_type, data.severity, data.title,
     data.description || null, data.source || 'manual', data.source_name || null]
  );
  if (data.severity === 'high' || data.severity === 'critical') {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'vendor.monitoring_signal', tenantId, sourceService: 'vendor-advanced',
          entityType: 'vendor', entityId: data.vendor_id, severity: data.severity as 'info' | 'warning' | 'critical',
          payload: { signalType: data.signal_type, title: data.title },
        } as any)), { tenantId, operation: 'eventBus:vendor.monitoring_signal' });
  }
  return getFirstRow(r);
}

export async function autoTierVendors(tenantId: string): Promise<{ updated: number }> {
  const schema = tenantSchema(tenantId);
  const vendors = (await safeQuery(
    `SELECT v.vendor_id, v.risk_score, v.contract_value,
       (SELECT COUNT(*) FROM "${schema}".vendor_fourth_party_risk fp WHERE fp.vendor_id = v.vendor_id AND fp.is_active = TRUE AND fp.deleted_at IS NULL) AS fp_count,
       (SELECT COUNT(*) FROM "${schema}".vendor_sla_breach_log b WHERE b.vendor_id = v.vendor_id AND b.remediation_status NOT IN ('resolved','accepted')) AS open_breaches
     FROM "${schema}".vendors v WHERE v.deleted_at IS NULL`
  )).rows;

  return withTransaction(tenantId, async (client) => {
    let updated = 0;
    for (const v of vendors) {
      const score = (v.risk_score || 0) + (v.fp_count > 3 ? 2 : 0) + (v.open_breaches > 0 ? 2 : 0);
      const tier = score >= 8 ? 'critical' : score >= 5 ? 'high' : score >= 3 ? 'medium' : 'low';
      await safeQueryWithClient(`UPDATE "${schema}".vendors SET risk_tier = $1, updated_at = NOW() WHERE vendor_id = $2`, [tier, v.vendor_id], client);
      updated++;
    }
    return { updated };
  });
}

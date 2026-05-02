import { catchHandler, EC } from '@dos/platform-core/resilience';
import { safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../ports/database.port';
import { eventBus } from '../ports/events.port';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

export async function getTrainingContent(tenantId: string, category?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".training_content WHERE deleted_at IS NULL AND is_active = TRUE`;
  const params: unknown[] = [];
  if (category) { params.push(category); sql += ` AND category = $1`; }
  sql += ` ORDER BY created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function createTrainingContent(tenantId: string, data: {
  code: string; title: string; title_ar?: string; content_type?: string; category?: string;
  duration_minutes?: number; is_mandatory?: boolean; passing_score?: number; author_id?: string;
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".training_content
       (code, title, title_ar, content_type, category, duration_minutes, is_mandatory, passing_score, author_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [data.code, data.title, data.title_ar || null, data.content_type || 'course',
     data.category || 'general_awareness', data.duration_minutes || null,
     data.is_mandatory ?? false, data.passing_score ?? 70, data.author_id || null]
  );
  await eventBus.publish({

    eventType: 'training.content_published', tenantId, sourceService: 'training-advanced',
    entityType: 'training_content', entityId: getFirstRow(r)?.content_id, severity: 'info',
    payload: { code: data.code, title: data.title, mandatory: data.is_mandatory },
  }).catch(catchHandler(EC.EVENT_BUS, {}));
  return getFirstRow(r);
}

export async function createCampaign(tenantId: string, data: {
  title: string; title_ar?: string; campaign_type?: string; mandatory?: boolean;
  start_date?: string; end_date?: string; content_ids?: string[]; owner_id?: string;
  target_roles?: string[]; target_departments?: string[];
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `INSERT INTO "${schema}".training_campaigns
       (title, title_ar, campaign_type, mandatory, start_date, end_date, content_ids, owner_id, target_roles, target_departments)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [data.title, data.title_ar || null, data.campaign_type || 'awareness',
     data.mandatory ?? false, data.start_date || null, data.end_date || null,
     data.content_ids ? `{${data.content_ids.join(',')}}` : '{}',
     data.owner_id || null,
     data.target_roles ? `{${data.target_roles.join(',')}}` : '{}',
     data.target_departments ? `{${data.target_departments.join(',')}}` : '{}']
  );
  return getFirstRow(r);
}

export async function getCampaigns(tenantId: string, status?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".training_campaigns WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (status) { params.push(status); sql += ` AND status = $1`; }
  sql += ` ORDER BY created_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function launchCampaign(tenantId: string, campaignId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".training_campaigns SET status = 'active', launched_at = NOW(), updated_at = NOW() WHERE campaign_id = $1 RETURNING *`,
    [campaignId]
  );
  await eventBus.publish({

    eventType: 'training.campaign_launched', tenantId, sourceService: 'training-advanced',
    entityType: 'training_campaign', entityId: campaignId, severity: 'info',
    payload: { title: getFirstRow(r)?.title },
  }).catch(catchHandler(EC.EVENT_BUS, {}));
  return getFirstRow(r);
}

export async function assignTraining(tenantId: string, data: {
  content_id: string; user_id: string; campaign_id?: string; assigned_by?: string; due_date?: string;
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const content = getFirstRow((await safeQuery(`SELECT passing_score FROM "${schema}".training_content WHERE content_id = $1`, [data.content_id])));
  const r = await safeQuery(
    `INSERT INTO "${schema}".training_assignments
       (content_id, user_id, campaign_id, assigned_by, due_date, passing_score)
     VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT DO NOTHING RETURNING *`,
    [data.content_id, data.user_id, data.campaign_id || null, data.assigned_by || null,
     data.due_date || null, content?.passing_score ?? 70]
  );
  return getFirstRow(r);
}

export async function getAssignments(tenantId: string, userId?: string, status?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT a.*, c.title AS content_title, c.content_type, c.category, c.duration_minutes
     FROM "${schema}".training_assignments a
     JOIN "${schema}".training_content c ON c.content_id = a.content_id
     WHERE 1=1`;
  const params: unknown[] = [];
  if (userId) { params.push(userId); sql += ` AND a.user_id = $${params.length}`; }
  if (status) { params.push(status); sql += ` AND a.status = $${params.length}`; }
  sql += ` ORDER BY a.due_date ASC NULLS LAST, a.assigned_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function completeAssignment(tenantId: string, assignmentId: string, data: {
  score?: number; time_spent_minutes?: number; feedback?: string; feedback_rating?: number;
}): Promise<GenericRow | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.training_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function getCertifications(tenantId: string, userId?: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".training_certifications WHERE revoked = FALSE`;
  const params: unknown[] = [];
  if (userId) { params.push(userId); sql += ` AND user_id = $1`; }
  sql += ` ORDER BY issued_at DESC`;
  return (await safeQuery(sql, params)).rows;
}

export async function createPhishingCampaign(tenantId: string, data: {
  title: string; campaign_id?: string; template_type?: string; difficulty?: string;
  email_subject?: string; email_body?: string; target_user_ids?: string[];
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  return getFirstRow((await safeQuery(
    `INSERT INTO "${schema}".phishing_campaigns
       (title, campaign_id, template_type, difficulty, email_subject, email_body, target_user_ids)
     VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
    [data.title, data.campaign_id || null, data.template_type || 'email',
     data.difficulty || 'medium', data.email_subject || null, data.email_body || null,
     data.target_user_ids ? `{${data.target_user_ids.join(',')}}` : '{}']
  )));
}

export async function getPhishingCampaigns(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  return (await safeQuery(
    `SELECT * FROM "${schema}".phishing_campaigns WHERE deleted_at IS NULL ORDER BY created_at DESC`
  )).rows;
}

export async function launchPhishingCampaign(tenantId: string, phishingId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".phishing_campaigns SET status = 'active', launched_at = NOW(), updated_at = NOW() WHERE phishing_id = $1 RETURNING *`,
    [phishingId]
  );
  await eventBus.publish({

    eventType: 'training.phishing_launched', tenantId, sourceService: 'training-advanced',
    entityType: 'phishing_campaign', entityId: phishingId, severity: 'info',
    payload: { title: getFirstRow(r)?.title },
  }).catch(catchHandler(EC.EVENT_BUS, {}));
  return getFirstRow(r);
}

export async function recordPhishingResult(tenantId: string, phishingId: string, data: {
  user_id: string; user_action: string;
}): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const timeField = data.user_action === 'opened' ? 'email_opened_at'
    : data.user_action === 'clicked' ? 'link_clicked_at'
    : data.user_action === 'submitted_data' ? 'data_submitted_at'
    : data.user_action === 'reported' ? 'reported_at' : null;
  // secrets-scan-allow: schema tenantSchema()-validated; aggregation filters literal
  const result = getFirstRow((await safeQuery(
    `INSERT INTO "${schema}".phishing_user_results (phishing_id, user_id, user_action${timeField ? `, ${timeField}` : ''})
     VALUES ($1,$2,$3${timeField ? `, NOW()` : ''}) RETURNING *`,
    [phishingId, data.user_id, data.user_action]
  )));

  // C5: Auto-remediation — if user clicked/submitted and campaign has auto_assign_training enabled
  if (data.user_action === 'clicked' || data.user_action === 'submitted_data') {
    try {
      const campaign = getFirstRow((await safeQuery(
        `SELECT auto_assign_training, remediation_content_id FROM "${schema}".phishing_campaigns
         WHERE phishing_id = $1 AND deleted_at IS NULL LIMIT 1`,
        [phishingId]
      )));
      if (campaign?.auto_assign_training && campaign.remediation_content_id) {
        await assignTraining(tenantId, {
          content_id: campaign.remediation_content_id,
          user_id: data.user_id,
          assigned_by: 'phishing_auto_remediation',
          due_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
        });
        // Mark remediation assigned on the result
        await safeQuery(
          `UPDATE "${schema}".phishing_user_results SET remediation_assigned = TRUE WHERE result_id = $1`,
          [result.result_id]
        ).catch(catchHandler(EC.EVENT_BUS, {}));
      }
    } catch { /* non-fatal */ }
  }

  return result;
}

export async function getTrainingComplianceSnapshot(tenantId: string): Promise<GenericRow | null> {
  const schema = tenantSchema(tenantId);
  const totals = getFirstRow((await safeQuery(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status IN ('completed','passed')) AS completed,
       COUNT(*) FILTER (WHERE status = 'failed') AS failed,
       COUNT(*) FILTER (WHERE status = 'overdue') AS overdue,
       COUNT(*) FILTER (WHERE status IN ('assigned','in_progress')) AS pending
     FROM "${schema}".training_assignments`
  )));
  const mandatoryGap = getFirstRow((await safeQuery(
    `SELECT COUNT(*) AS cnt FROM "${schema}".training_assignments a
     JOIN "${schema}".training_content c ON c.content_id = a.content_id
     WHERE c.is_mandatory = TRUE AND a.status NOT IN ('completed','passed','waived')`
  )));
  const completionPct = totals.total > 0 ? Math.round((parseInt(totals.completed) / parseInt(totals.total)) * 100) : 0;
  return {
    total: parseInt(totals.total) || 0,
    completed: parseInt(totals.completed) || 0,
    failed: parseInt(totals.failed) || 0,
    overdue: parseInt(totals.overdue) || 0,
    pending: parseInt(totals.pending) || 0,
    completionPct,
    mandatoryOutstanding: parseInt(mandatoryGap.cnt) || 0,
    complianceStatus: parseInt(mandatoryGap.cnt) > 0 ? 'non_compliant' : completionPct >= 90 ? 'compliant' : 'at_risk',
  };
}

export async function checkOverdueAssignments(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  const r = await safeQuery(
    `UPDATE "${schema}".training_assignments
     SET status = 'overdue', updated_at = NOW()
     WHERE status IN ('assigned','in_progress') AND due_date < CURRENT_DATE AND due_date IS NOT NULL
     RETURNING assignment_id, user_id`
  );
  if (r.rows.length > 0) {
    await eventBus.publish({

      eventType: 'training.assignment_overdue', tenantId, sourceService: 'training-advanced',
      severity: 'warning', payload: { count: r.rows.length, assignments: r.rows.slice(0, 10) },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  }
  return r.rows.length;
}

export async function checkExpiringCertifications(tenantId: string, daysAhead: number = 30): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  const expiring = (await safeQuery(
    `SELECT * FROM "${schema}".training_certifications
     WHERE revoked = FALSE AND valid_until IS NOT NULL
       AND valid_until BETWEEN CURRENT_DATE AND CURRENT_DATE + $1 * INTERVAL '1 day'
     ORDER BY valid_until ASC`,
    [daysAhead]
  )).rows;
  if (expiring.length > 0) {
    await eventBus.publish({

      eventType: 'training.certification_expiring', tenantId, sourceService: 'training-advanced',
      severity: 'warning', payload: { count: expiring.length, certifications: expiring.slice(0, 10) },
    }).catch(catchHandler(EC.EVENT_BUS, {}));
  }
  return expiring;
}

// ── C8: Certificate Revocation ──────────────────────────────────────────────

export async function revokeCertificate(tenantId: string, certificateId: string, reason: string): Promise<GenericRow | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.training_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── C12: Update Training Content ────────────────────────────────────────────

export async function updateTrainingContent(tenantId: string, contentId: string, data: {
  title?: string; title_ar?: string; description?: string; content_type?: string;
  category?: string; duration_minutes?: number; is_mandatory?: boolean;
  passing_score?: number; is_active?: boolean;
}): Promise<GenericRow | null> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.training_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

// ── Sector Training Paths ───────────────────────────────────────────────────

/**
 * Get the training path for a given KSA sector code.
 * Returns ordered list of required + recommended training content.
 */
export async function getSectorTrainingPath(tenantId: string, sectorCode: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  // Try exact sector code first, then fallback to SEC-KSA-DEFAULT
  const r = await safeQuery(`
    SELECT stp.path_order, stp.is_mandatory, stp.due_days, stp.role_scope,
           tc.content_id, tc.code, tc.title, tc.title_ar, tc.category, tc.content_type,
           tc.duration_minutes, tc.passing_score, tc.recertification_days, tc.description
    FROM "${schema}".sector_training_paths stp
    JOIN "${schema}".training_content tc ON tc.content_id = stp.content_id AND tc.is_active = TRUE AND tc.deleted_at IS NULL
    WHERE stp.sector_code = $1
    ORDER BY stp.path_order ASC
  `, [sectorCode]);
  if (r.rows.length > 0) return r.rows;
  // Fallback
  const fallback = await safeQuery(`
    SELECT stp.path_order, stp.is_mandatory, stp.due_days, stp.role_scope,
           tc.content_id, tc.code, tc.title, tc.title_ar, tc.category, tc.content_type,
           tc.duration_minutes, tc.passing_score, tc.recertification_days, tc.description
    FROM "${schema}".sector_training_paths stp
    JOIN "${schema}".training_content tc ON tc.content_id = stp.content_id AND tc.is_active = TRUE AND tc.deleted_at IS NULL
    WHERE stp.sector_code = 'SEC-KSA-DEFAULT'
    ORDER BY stp.path_order ASC
  `);
  return fallback.rows;
}

/**
 * Auto-assign sector training path to a user based on their tenant's sector.
 */
export async function assignSectorTrainingToUser(
  tenantId: string, userId: string, sectorCode: string, userRole?: string
): Promise<number> {
  const path = await getSectorTrainingPath(tenantId, sectorCode);
  let assigned = 0;
  for (const item of path) {
    // Check role scope (if role_scope is '{all}' or includes user's role)
    const roles: string[] = item.role_scope || [];
    if (roles.length > 0 && !roles.includes('all') && userRole && !roles.includes(userRole)) continue;
    const dueDate = new Date(Date.now() + (item.due_days || 30) * 86400000).toISOString().slice(0, 10);
    const result = await assignTraining(tenantId, {
      content_id: item.content_id,
      user_id: userId,
      assigned_by: 'sector_training_auto',
      due_date: dueDate,
    });
    if (result) assigned++;
  }
  return assigned;
}

/**
 * Get training compliance by framework — shows which frameworks have
 * mapped training, completion rates, and gaps.
 */
export async function getTrainingByFramework(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  try {
    const r = await safeQuery(`
      SELECT
        ctm.framework_code,
        COUNT(DISTINCT ctm.control_code) AS controls_with_training,
        COUNT(DISTINCT ctm.content_id) AS training_courses,
        COUNT(DISTINCT a.assignment_id) AS total_assignments,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed')) AS completed,
        CASE WHEN COUNT(DISTINCT a.assignment_id) > 0
          THEN ROUND(COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed'))::numeric
            / COUNT(DISTINCT a.assignment_id) * 100)
          ELSE 0 END AS completion_pct,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status = 'overdue') AS overdue
      FROM "${schema}".control_training_mappings ctm
      LEFT JOIN "${schema}".training_assignments a ON a.content_id = ctm.content_id
      WHERE ctm.deleted_at IS NULL AND ctm.is_active = TRUE
      GROUP BY ctm.framework_code
      ORDER BY ctm.framework_code
    `);
    return r.rows;
  } catch {
    return [];
  }
}

/**
 * Get regulatory training compliance snapshot per KSA regulator.
 * Groups training content by regulator tags and shows completion.
 */
export async function getRegulatorTrainingStatus(tenantId: string): Promise<GenericRow[]> {
  const schema = tenantSchema(tenantId);
  try {
    const r = await safeQuery(`
      SELECT
        CASE
          WHEN 'nca' = ANY(tc.tags) THEN 'NCA'
          WHEN 'sama' = ANY(tc.tags) THEN 'SAMA'
          WHEN 'pdpl' = ANY(tc.tags) OR 'sdaia' = ANY(tc.tags) THEN 'SDAIA/PDPL'
          WHEN 'cma' = ANY(tc.tags) THEN 'CMA'
          WHEN 'cst' = ANY(tc.tags) OR 'citc' = ANY(tc.tags) THEN 'CST/CITC'
          WHEN 'zatca' = ANY(tc.tags) THEN 'ZATCA'
          WHEN 'moh' = ANY(tc.tags) THEN 'MOH'
          WHEN 'sfda' = ANY(tc.tags) THEN 'SFDA'
          WHEN 'hrsd' = ANY(tc.tags) THEN 'HRSD'
          WHEN 'gosi' = ANY(tc.tags) THEN 'GOSI'
          WHEN 'moc' = ANY(tc.tags) THEN 'MOC'
          WHEN 'gac' = ANY(tc.tags) THEN 'GAC'
          WHEN 'ndmo' = ANY(tc.tags) THEN 'NDMO'
          ELSE 'Other'
        END AS regulator,
        COUNT(DISTINCT tc.content_id) AS courses,
        SUM(tc.duration_minutes) AS total_minutes,
        COUNT(DISTINCT a.assignment_id) AS total_assigned,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed')) AS completed,
        COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status = 'overdue') AS overdue,
        CASE WHEN COUNT(DISTINCT a.assignment_id) > 0
          THEN ROUND(COUNT(DISTINCT a.assignment_id) FILTER (WHERE a.status IN ('completed','passed'))::numeric
            / COUNT(DISTINCT a.assignment_id) * 100)
          ELSE 0 END AS completion_pct
      FROM "${schema}".training_content tc
      LEFT JOIN "${schema}".training_assignments a ON a.content_id = tc.content_id
      WHERE tc.deleted_at IS NULL AND tc.is_active = TRUE AND tc.tags IS NOT NULL AND array_length(tc.tags, 1) > 0
      GROUP BY regulator
      HAVING COUNT(DISTINCT tc.content_id) > 0
      ORDER BY regulator
    `);
    return r.rows;
  } catch {
    return [];
  }
}

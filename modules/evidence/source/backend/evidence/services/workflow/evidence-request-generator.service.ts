// ============================================
// Shahin — Evidence Request Generator
// Runs daily. Creates evidence requests from
// evidence_schedules and routes them to teams
// via RACI-based process orchestration.
// ============================================

import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { createProcessTask } from '../../ports/lifecycle.port';
import { resolveFoundationOwnership as _resolveFoundationOwnership } from '../core/evidence-lifecycle.service';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';

export interface EvidenceGenResult {
  requestsCreated: number;
  tasksCreated: number;
}

/**
 * Generate evidence requests for controls with overdue evidence collection schedules.
 */
export async function generateEvidenceRequests(tenantId: string): Promise<EvidenceGenResult> {
  const schema = tenantSchema(tenantId);
  let requestsCreated = 0;
  let tasksCreated = 0;

  // Introspect evidence_schedules columns to handle schema drift (Issue #29)
  const colCheckRes = await safeQuery(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'evidence_schedules'`,
    [schema],
  );
  const schedCols = new Set(colCheckRes.rows.map((r: GenericRow) => r.column_name as string));

  const enabledCol   = schedCols.has('enabled')          ? 'es.enabled = true'   : schedCols.has('is_active') ? 'es.is_active = true' : 'TRUE';
  const cronCol      = schedCols.has('cron_expression')  ? 'es.cron_expression'  : schedCols.has('frequency')  ? 'es.frequency'        : 'NULL';
  const lastCol      = schedCols.has('last_reminded_at') ? 'es.last_reminded_at' : schedCols.has('last_run_at') ? 'es.last_run_at'     : 'NULL';

  // Introspect controls table for title column
  const ctrlColRes = await safeQuery(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema = $1 AND table_name = 'controls'`,
    [schema],
  );
  const ctrlCols = new Set(ctrlColRes.rows.map((r: GenericRow) => r.column_name as string));
  const ctrlTitleExpr = ctrlCols.has('title') ? 'c.title' : ctrlCols.has('control_title') ? 'c.control_title' : ctrlCols.has('name') ? 'c.name' : 'NULL';

  // Verify evidence_schedules table exists at all
  const tableCheck = await safeQuery(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'evidence_schedules'`,
    [schema],
  );
  if (tableCheck.rows.length === 0) {
    return { requestsCreated: 0, tasksCreated: 0 };
  }

  // Find the AUDIT team for requesting evidence
  const auditTeamRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT team_id FROM "${schema}".teams WHERE team_code = 'AUDIT' AND ${schedCols.has('active') ? 'active = true' : 'TRUE'} LIMIT 1`,
  ), { tenantId: tenantId, operation: 'query teams' });
  const auditTeamId = getFirstRow(auditTeamRes)?.team_id ?? null;

  // Build the due-schedules query using dynamically resolved column expressions
  const dueSchedules = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT es.schedule_id,
            es.control_id,
            ${cronCol} AS cron_expression,
            ${lastCol} AS last_reminded_at,
            ${ctrlTitleExpr} AS control_title
     ,c.department_id, c.business_unit_id
     FROM "${schema}".evidence_schedules es
     LEFT JOIN "${schema}".controls c ON c.control_id = es.control_id
     WHERE ${enabledCol}
       AND (
         ${lastCol} IS NULL
         OR (${cronCol} LIKE '0 * * * *'   AND ${lastCol} < NOW() - INTERVAL '1 day')
         OR (${cronCol} LIKE '0 0 * * 1'   AND ${lastCol} < NOW() - INTERVAL '7 days')
         OR (${cronCol} LIKE '0 0 1 * *'   AND ${lastCol} < NOW() - INTERVAL '30 days')
         OR (${cronCol} LIKE '0 0 1 */3 *' AND ${lastCol} < NOW() - INTERVAL '90 days')
         OR (${cronCol} LIKE '0 0 1 1 *'   AND ${lastCol} < NOW() - INTERVAL '365 days')
         OR (${lastCol} < NOW() - INTERVAL '30 days')
       )`,
  ), { tenantId: tenantId, operation: 'fallback query' });

  // Map cron patterns to human-readable frequency and SLA hours
  const cronToFrequency = (cron: string): { frequency: string; slaHours: number } => {
    if (cron?.includes('* * * *') && !cron.startsWith('0 0'))  return { frequency: 'daily', slaHours: 8 };
    if (cron?.includes('* * 1'))   return { frequency: 'weekly', slaHours: 48 };
    if (cron?.includes('*/3'))     return { frequency: 'quarterly', slaHours: 336 };
    if (cron?.includes('1 1 *'))   return { frequency: 'annually', slaHours: 720 };
    if (cron?.includes('1 * *'))   return { frequency: 'monthly', slaHours: 168 };
    return { frequency: 'monthly', slaHours: 168 }; // default
  };

  for (const sched of dueSchedules.rows) {
    const { frequency, slaHours: dueHours } = cronToFrequency((sched as any).cron_expression);
    const dueDate = new Date(Date.now() + dueHours * 3600_000);

    // Insert evidence request
    try {
      await safeQuery(
        `INSERT INTO "${schema}".evidence_requests
           (control_id, requesting_team_id, due_date, status, evidence_type, description, department_id, business_unit_id)
         VALUES ($1, $2, $3, 'pending', 'scheduled', $4, $5, $6)
         ON CONFLICT (control_id, requesting_team_id) DO UPDATE SET
           due_date = EXCLUDED.due_date, status = EXCLUDED.status, evidence_type = EXCLUDED.evidence_type, description = EXCLUDED.description
         WHERE (evidence_requests.due_date, evidence_requests.status) IS DISTINCT FROM (EXCLUDED.due_date, EXCLUDED.status)`,
        [
          sched.control_id,
          auditTeamId,
          dueDate.toISOString(),
          `Scheduled evidence collection for: ${sched.control_title || sched.control_id}`,
          sched.department_id || null,
          sched.business_unit_id || null,
        ],
      );
      requestsCreated++;
    } catch {
      // evidence_requests table may have different columns — skip
      continue;
    }

    // Create orchestrated process task
    try {
      await createProcessTask(tenantId, {
        title: `Evidence collection: ${sched.control_title || sched.control_id}`,
        description: `Collect evidence for control ${sched.control_id} (${frequency} schedule)`,
        taskType: 'evidence_request',
        priority: frequency === 'daily' ? 'high' : 'medium',
        entityType: 'evidence',
        entityId: sched.schedule_id,
        controlId: sched.control_id,
        dueInHours: dueHours,
        triggerSource: 'evidence-request-generator',
        triggerData: { scheduleId: sched.schedule_id, frequency },
      });
      tasksCreated++;
    } catch {
      // process_tasks may not exist — non-fatal
    }

    // Update last_reminded_at
    await safeQuery(
      `UPDATE "${schema}".evidence_schedules SET last_reminded_at = NOW() WHERE schedule_id = $1`,
      [sched.schedule_id],
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  // Gap 4: Evidence expiry renewal — detect evidence nearing expiry and create renewal requests
  try {
    const expiringEvidence = await safeQuery(
      `SELECT e.evidence_id, e.control_id, e.title, e.expiry_date,
              c.title AS control_title
       FROM "${schema}".evidence e
       LEFT JOIN "${schema}".controls c ON c.control_id = e.control_id
       WHERE e.expiry_date IS NOT NULL
         AND e.expiry_date BETWEEN NOW() AND NOW() + INTERVAL '14 days'
         AND e.status NOT IN ('expired', 'superseded')`,
    );

    for (const ev of expiringEvidence.rows) {
      try {
        await createProcessTask(tenantId, {
          title: `Evidence renewal: ${ev.title || ev.evidence_id}`,
          description: `Evidence for control ${ev.control_title || ev.control_id} expires on ${ev.expiry_date}. Collect updated evidence.`,
          taskType: 'evidence_request',
          priority: 'high',
          entityType: 'evidence',
          entityId: ev.evidence_id,
          controlId: ev.control_id,
          dueInHours: 168,
          triggerSource: 'evidence-expiry-renewal',
          triggerData: { evidenceId: ev.evidence_id, expiryDate: ev.expiry_date },
        });
        tasksCreated++;
      } catch { /* non-fatal */ }
    }
  } catch { /* evidence expiry check non-fatal */ }

  return { requestsCreated, tasksCreated };
}

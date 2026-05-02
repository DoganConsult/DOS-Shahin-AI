// ============================================
// Shahin — Audit Reminders Service
// Upcoming deadline detection and reminder generation
// Tables: audits, findings, remediation_plans,
//         audit_schedules, notification_queue
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';

// ── Get upcoming deadlines ───────────────────────────────────────────

export async function getUpcomingDeadlines(tenantId: string, daysAhead: number = 7) {
  const s = tenantSchema(tenantId);

  const [auditDeadlines, findingDeadlines, capaDeadlines] = await Promise.all([
    // Audits ending soon
    safeQuery(
      `SELECT audit_id, title, planned_end, status, 'audit_ending' AS deadline_type
       FROM "${s}".audits
       WHERE deleted_at IS NULL
         AND status IN ('planned','in_progress')
         AND planned_end IS NOT NULL
         AND planned_end <= NOW() + ($1 || ' days')::interval
       ORDER BY planned_end ASC`,
      [daysAhead]
    ),
    // Findings with SLA approaching (using audit_finding_slas if available)
    safeQuery(
      `SELECT f.finding_id, f.title, f.severity, f.created_at, f.status,
         'finding_sla' AS deadline_type,
         EXTRACT(DAY FROM NOW() - f.created_at)::int AS days_open
       FROM "${s}".findings f
       WHERE f.deleted_at IS NULL
         AND f.status = 'open'
         AND f.created_at <= NOW() - INTERVAL '21 days'
       ORDER BY f.created_at ASC`
    ),
    // CAPA target dates approaching
    safeQuery(
      `SELECT rp.plan_id, rp.title, rp.target_date, rp.status, rp.owner_id,
         'capa_target' AS deadline_type,
         f.title AS finding_title
       FROM "${s}".remediation_plans rp
       LEFT JOIN "${s}".findings f ON f.finding_id = rp.finding_id
       WHERE rp.deleted_at IS NULL
         AND rp.status NOT IN ('completed','closed')
         AND rp.target_date IS NOT NULL
         AND rp.target_date <= NOW() + ($1 || ' days')::interval
       ORDER BY rp.target_date ASC`,
      [daysAhead]
    ),
  ]);

  return {
    auditDeadlines: auditDeadlines.rows,
    findingDeadlines: findingDeadlines.rows,
    capaDeadlines: capaDeadlines.rows,
    totalUpcoming: auditDeadlines.rows.length + findingDeadlines.rows.length + capaDeadlines.rows.length,
  };
}

// ── Generate reminders (insert into notification_queue) ──────────────

export async function generateReminders(tenantId: string) {
  const s = tenantSchema(tenantId);
  let remindersCreated = 0;

  // Overdue audits (past planned_end, still active)
  const overdueAudits = await safeQuery(
    `SELECT audit_id, title, planned_end, lead_auditor_id
     FROM "${s}".audits
     WHERE deleted_at IS NULL
       AND status IN ('planned','in_progress')
       AND planned_end IS NOT NULL
       AND planned_end < NOW()
       AND lead_auditor_id IS NOT NULL`
  );

  for (const audit of overdueAudits.rows) {
    const notifId = uuid();
    await safeQuery(
      `INSERT INTO "${s}".notification_queue
         (notification_id, recipient_id, notification_type, subject, body, created_at)
       VALUES ($1,$2,$3,$4,$5, NOW())`,
      [notifId, audit.lead_auditor_id, 'audit_reminder',
       `Overdue Audit: ${audit.title}`,
       `Audit "${audit.title}" was planned to end on ${audit.planned_end} but is still in progress. Please review and update.`]
    );
    remindersCreated++;
  }

  // Overdue CAPA plans (past target_date)
  const overdueCapa = await safeQuery(
    `SELECT rp.plan_id, rp.title, rp.target_date, rp.owner_id,
       f.title AS finding_title
     FROM "${s}".remediation_plans rp
     LEFT JOIN "${s}".findings f ON f.finding_id = rp.finding_id
     WHERE rp.deleted_at IS NULL
       AND rp.status NOT IN ('completed','closed')
       AND rp.target_date IS NOT NULL
       AND rp.target_date < NOW()
       AND rp.owner_id IS NOT NULL`
  );

  for (const capa of overdueCapa.rows) {
    const notifId = uuid();
    await safeQuery(
      `INSERT INTO "${s}".notification_queue
         (notification_id, recipient_id, notification_type, subject, body, created_at)
       VALUES ($1,$2,$3,$4,$5, NOW())`,
      [notifId, capa.owner_id, 'audit_reminder',
       `Overdue CAPA: ${capa.title}`,
       `Remediation plan "${capa.title}" for finding "${capa.finding_title || 'N/A'}" was due on ${capa.target_date}. Please take action.`]
    );
    remindersCreated++;
  }

  // Long-open findings (open > 30 days with no remediation plan)
  const staleFindings = await safeQuery(
    `SELECT f.finding_id, f.title, f.severity, f.created_at,
       a.lead_auditor_id AS recipient
     FROM "${s}".findings f
     LEFT JOIN "${s}".audits a ON a.audit_id::text = f.source_id
     LEFT JOIN "${s}".remediation_plans rp ON rp.finding_id = f.finding_id AND rp.deleted_at IS NULL
     WHERE f.deleted_at IS NULL
       AND f.status = 'open'
       AND f.created_at < NOW() - INTERVAL '30 days'
       AND rp.plan_id IS NULL
       AND a.lead_auditor_id IS NOT NULL`
  );

  for (const finding of staleFindings.rows) {
    const notifId = uuid();
    await safeQuery(
      `INSERT INTO "${s}".notification_queue
         (notification_id, recipient_id, notification_type, subject, body, created_at)
       VALUES ($1,$2,$3,$4,$5, NOW())`,
      [notifId, finding.recipient, 'audit_reminder',
       `Unaddressed Finding: ${finding.title}`,
       `Finding "${finding.title}" (${finding.severity}) has been open for over 30 days with no remediation plan. Please create a CAPA plan.`]
    );
    remindersCreated++;
  }

  return { remindersCreated };
}

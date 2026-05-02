/**
 * Compliance Calendar — date-range events from findings, assessments,
 * controls, and obligations.
 *
 * Split from compliance-audit-export.service.ts for modularity.
 *
 * 2026-05-02 cross-module migration: the `findings` query is routed through
 * `getFindingsPort().listInDateRange()` per Patch 06 §2.5. The other three
 * queries hit compliance-owned tables and remain safeQuery (tenant-scoped via
 * `ctx(tenantId)`); they will move to `withTenantClient` in a follow-up
 * tquery sprint.
 */

import { safeQuery } from '../../../ports/database.port';
import { getFindingsPort } from '../../../ports/findings.port';
import { ctx } from "../../misc/compliance.utils.js";
import type { GenericRow as _GenericRow } from '@dos/types';

// ═══════════════════════════════════════════════════════════════════
// 14. COMPLIANCE CALENDAR
// ═══════════════════════════════════════════════════════════════════

export async function getComplianceCalendar(tenantId: string, from: string, to: string) {
  const { schema } = ctx(tenantId);
  const events: unknown[] = [];

  const [findingsList, assessRes, ctrlRes, oblRes] = await Promise.all([
    // Cross-module: route findings through the audit-module port (Patch 06 §2.5).
    getFindingsPort().listInDateRange({ tenantId, fromDate: from, toDate: to }),
    safeQuery(
      `SELECT assessment_id, title, created_at, status
       FROM "${schema}".assessments
       WHERE deleted_at IS NULL AND created_at >= $1::date AND created_at <= $2::date
       ORDER BY created_at`, [from, to]),
    safeQuery(
      `SELECT control_id, title, last_tested_at, test_status
       FROM "${schema}".controls
       WHERE deleted_at IS NULL AND last_tested_at IS NOT NULL
         AND last_tested_at >= $1::date AND last_tested_at <= $2::date
       ORDER BY last_tested_at`, [from, to]),
    safeQuery(
      `SELECT ist.node_id, ist.title_en, ist.priority
       FROM instrument_structure ist
       WHERE ist.level = 4 AND ist.updated_at >= $1::date AND ist.updated_at <= $2::date
       LIMIT 50`, [from, to]),
  ]);

  for (const g of findingsList) {
    events.push({
      entityId: g.findingId,
      title: g.title,
      date: g.dueDate,
      type: 'gap_due',
      severity: g.severity || 'medium',
      status: g.status,
      route: '/compliance/gaps',
    });
  }

  for (const a of assessRes.rows) {
    events.push({
      entityId: a.assessment_id,
      title: a.title || 'Assessment',
      date: a.created_at,
      type: 'assessment',
      severity: 'medium',
      status: a.status,
      route: '/compliance/assessments',
    });
  }

  for (const c of ctrlRes.rows) {
    events.push({
      entityId: c.control_id,
      title: c.title,
      date: c.last_tested_at,
      type: 'control_test',
      severity: c.test_status === 'failed' ? 'high' : 'low',
      status: c.test_status,
      route: '/compliance/controls',
    });
  }

  for (const o of oblRes.rows) {
    events.push({
      entityId: o.node_id,
      title: o.title_en,
      date: o.updated_at,
      type: 'obligation',
      severity: o.priority || 'medium',
      route: '/compliance/obligations',
    });
  }

  return events;
}

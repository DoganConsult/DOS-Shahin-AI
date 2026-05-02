// ============================================
// Compliance Drift Detection Engine
// Monitors compliance state for configuration
// drift, stale controls, and policy deviations.
// ============================================

import { v4 as uuid } from 'uuid';
import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus, emitEvent } from '../../../ports/events.port';
import type { GenericRow as _GenericRow } from '@dos/types';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';
import { catchHandler, EC } from '@dos/platform-core/resilience';

interface DriftRule {
  rule_id: string;
  rule_code: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  detection_query: string;
  expected_state: string;
  description: string;
  is_active: boolean;
  check_interval_minutes: number;
}

export async function registerDriftRule(tenantId: string, rule: {
  ruleCode: string;
  category: string;
  severity: string;
  detectionQuery: string;
  expectedState: string;
  description: string;
  checkIntervalMinutes?: number;
}): Promise<{ ruleId: string }> {
  const schema = tenantSchema(tenantId);
  const ruleId = uuid();
  await safeQuery(
    `INSERT INTO "${schema}".compliance_drift_rules
     (rule_id, rule_code, category, severity, detection_query, expected_state, description, is_active, check_interval_minutes, created_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE, $8, NOW())`,
    [ruleId, rule.ruleCode, rule.category, rule.severity, rule.detectionQuery, rule.expectedState, rule.description, rule.checkIntervalMinutes ?? 60],
  );
  return { ruleId };
}

export async function listDriftRules(tenantId: string, filters?: { category?: string; severity?: string; isActive?: boolean }): Promise<DriftRule[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['deleted_at IS NULL'];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.category) { conditions.push(`category = $${idx++}`); params.push(filters.category); }
  if (filters?.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
  if (filters?.isActive !== undefined) { conditions.push(`is_active = $${idx++}`); params.push(filters.isActive); }
  const res = await safeQuery(`SELECT * FROM "${schema}".compliance_drift_rules WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`, params);
  return res.rows;
}

export async function runDriftScan(tenantId: string, category?: string): Promise<{ eventsDetected: number; results: unknown[] }> {
  const schema = tenantSchema(tenantId);
  const rules = await listDriftRules(tenantId, { isActive: true, category });
  const results: unknown[] = [];

  for (const rule of rules) {
    try {
      const safeDetection = rule.detection_query.replace(/__SCHEMA__/g, `"${schema}"`);
      const res = await safeQuery(safeDetection);
      const drifted = res.rows.length > 0;
      if (drifted) {
        const eventId = uuid();
        await safeQuery(
          `INSERT INTO "${schema}".compliance_drift_events
           (event_id, rule_id, rule_code, severity, status, detected_items, detected_at)
           VALUES ($1, $2, $3, $4, 'detected', $5, NOW())`,
          [eventId, rule.rule_id, rule.rule_code, rule.severity, JSON.stringify(res.rows.slice(0, 50))],
        );
        results.push({ ruleCode: rule.rule_code, severity: rule.severity, eventId, driftedCount: res.rows.length });
        eventBus.publish(({
                  eventType: 'compliance.gap_detected',
                  tenantId,
                  sourceService: 'ComplianceDriftEngine',
                  severity: rule.severity as string,
                  payload: { ruleCode: rule.rule_code, eventId, driftedCount: res.rows.length },
                } as any));
        // Emit drift_detected GRC event alongside the gap_detected eventBus event
        emitEvent(({ tenantId, userId: SYSTEM_JOB_ACTOR, module: 'compliance', event: 'drift_detected', entityType: 'compliance_drift_event', entityId: eventId, data: { ruleCode: rule.rule_code, severity: rule.severity, driftedCount: res.rows.length } } as any)).catch(catchHandler(EC.EVENT_BUS));
      }
    } catch { /* rule query may fail for missing tables */ }
  }

  return { eventsDetected: results.length, results };
}

export async function getDriftDashboard(tenantId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const [bySeverity, byCategory, byStatus, recent] = await Promise.all([
    safeQuery(`SELECT severity, COUNT(*)::int AS count FROM "${schema}".compliance_drift_events WHERE status != 'resolved' GROUP BY severity`),
    safeQuery(`SELECT r.category, COUNT(*)::int AS count FROM "${schema}".compliance_drift_events e JOIN "${schema}".compliance_drift_rules r ON e.rule_id = r.rule_id WHERE e.status != 'resolved' GROUP BY r.category`),
    safeQuery(`SELECT status, COUNT(*)::int AS count FROM "${schema}".compliance_drift_events GROUP BY status`),
    safeQuery(`SELECT event_id, rule_code, severity, status, detected_at FROM "${schema}".compliance_drift_events ORDER BY detected_at DESC LIMIT 20`),
  ]);
  return { bySeverity: bySeverity.rows, byCategory: byCategory.rows, byStatus: byStatus.rows, recentEvents: recent.rows };
}

export async function listDriftEvents(tenantId: string, filters?: { status?: string; severity?: string; ruleId?: string }): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const conditions = ['1=1'];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters?.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
  if (filters?.ruleId) { conditions.push(`rule_id = $${idx++}`); params.push(filters.ruleId); }
  const res = await safeQuery(
    `SELECT event_id, rule_id, rule_code, severity, status, detected_at, acknowledged_at, resolved_at
     FROM "${schema}".compliance_drift_events WHERE ${conditions.join(' AND ')} ORDER BY detected_at DESC LIMIT 100`,
    params,
  );
  return res.rows;
}

export async function acknowledgeDrift(tenantId: string, eventId: string, userId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".compliance_drift_events SET status = 'acknowledged', acknowledged_at = NOW(), acknowledged_by = $2 WHERE event_id = $1 AND status = 'detected'`,
    [eventId, userId],
  );
}

export async function resolveDrift(tenantId: string, eventId: string, userId: string): Promise<void> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".compliance_drift_events SET status = 'resolved', resolved_at = NOW(), resolved_by = $2 WHERE event_id = $1`,
    [eventId, userId],
  );
}

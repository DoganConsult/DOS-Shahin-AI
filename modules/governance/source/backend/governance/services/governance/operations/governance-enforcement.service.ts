// ============================================
// Shahin-Ai — Governance Enforcement Service
// Rule-based enforcement engine that scans for
// governance violations and logs findings.
// ============================================

import { v4 as uuid } from "uuid";
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import type { GenericRow } from '@dos/types';

export interface EnforcementResult {
  rule_code: string;
  entity_type: string;
  entity_id: string;
  severity: "info" | "warning" | "violation";
  message: string;
}

// === INDIVIDUAL RULE CHECKS ===

async function checkCommitteesWithoutCharters(schema: string): Promise<EnforcementResult[]> {
  const result = await safeQuery(
    `SELECT t.team_id AS committee_id, t.name_en AS name
     FROM "${schema}".teams t
     WHERE t.committee_type IS NOT NULL AND t.active = TRUE AND t.deleted_at IS NULL
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".governance_charters ch
         WHERE ch.committee_id = t.team_id AND ch.status = 'active' AND ch.deleted_at IS NULL
       )`
  );
  return result.rows.map((r: GenericRow) => ({
    rule_code: "COMMITTEE_NO_CHARTER",
    entity_type: "committee",
    entity_id: r.committee_id,
    severity: "warning" as const,
    message: `Committee "${r.name}" has no active charter`,
  }));
}

async function checkMeetingsWithoutMinutes(schema: string): Promise<EnforcementResult[]> {
  const result = await safeQuery(
    `SELECT m.meeting_id, m.title
     FROM "${schema}".governance_meetings m
     WHERE m.deleted_at IS NULL AND m.status = 'completed'
       AND (m.minutes IS NULL OR m.minutes = '')
       AND m.scheduled_at >= NOW() - INTERVAL '90 days'`
  );
  return result.rows.map((r: GenericRow) => ({
    rule_code: "MEETING_NO_MINUTES",
    entity_type: "meeting",
    entity_id: r.meeting_id,
    severity: "warning" as const,
    message: `Completed meeting "${r.title}" has no minutes`,
  }));
}

async function checkDecisionsWithoutRationale(schema: string): Promise<EnforcementResult[]> {
  const result = await safeQuery(
    `SELECT d.decision_id, d.decision_text
     FROM "${schema}".governance_decisions d
     WHERE d.deleted_at IS NULL
       AND (d.decision_text IS NULL OR LENGTH(d.decision_text) < 10)
       AND d.created_at >= NOW() - INTERVAL '90 days'`
  );
  return result.rows.map((r: GenericRow) => ({
    rule_code: "DECISION_NO_RATIONALE",
    entity_type: "decision",
    entity_id: r.decision_id,
    severity: "violation" as const,
    message: `Decision ${r.decision_id} lacks adequate rationale text`,
  }));
}

async function checkOverduePolicyReviews(schema: string): Promise<EnforcementResult[]> {
  const result = await safeQuery(
    `SELECT p.policy_id, p.title
     FROM "${schema}".policies p
     WHERE p.deleted_at IS NULL AND p.next_review_date IS NOT NULL
       AND p.next_review_date < CURRENT_DATE
       AND p.status NOT IN ('draft','archived')`
  );
  return result.rows.map((r: GenericRow) => ({
    rule_code: "POLICY_REVIEW_OVERDUE",
    entity_type: "policy",
    entity_id: r.policy_id,
    severity: "violation" as const,
    message: `Policy "${r.title}" is overdue for review`,
  }));
}

async function checkExpiredMandates(schema: string): Promise<EnforcementResult[]> {
  const result = await safeQuery(
    `SELECT m.mandate_id, m.title_en
     FROM "${schema}".governance_mandates m
     WHERE m.deleted_at IS NULL AND m.expiry_date IS NOT NULL
       AND m.expiry_date < CURRENT_DATE
       AND m.status NOT IN ('expired','archived')`
  );
  return result.rows.map((r: GenericRow) => ({
    rule_code: "MANDATE_EXPIRED",
    entity_type: "mandate",
    entity_id: r.mandate_id,
    severity: "violation" as const,
    message: `Mandate "${r.title_en}" has expired but status not updated`,
  }));
}

async function checkExpiredDelegations(schema: string): Promise<EnforcementResult[]> {
  const result = await safeQuery(
    `SELECT d.delegation_id, d.authority_type
     FROM "${schema}".delegated_authorities d
     WHERE d.deleted_at IS NULL AND d.valid_to IS NOT NULL
       AND d.valid_to < CURRENT_DATE
       AND d.status NOT IN ('expired','revoked')`
  );
  return result.rows.map((r: GenericRow) => ({
    rule_code: "DELEGATION_EXPIRED",
    entity_type: "delegation",
    entity_id: r.delegation_id,
    severity: "warning" as const,
    message: `Delegation ${r.delegation_id} (${r.authority_type}) has expired`,
  }));
}

async function checkOverdueActions(schema: string): Promise<EnforcementResult[]> {
  const result = await safeQuery(
    `SELECT a.action_item_id, a.title
     FROM "${schema}".governance_action_items a
     WHERE a.deleted_at IS NULL AND a.due_date IS NOT NULL
       AND a.due_date < CURRENT_DATE
       AND a.status NOT IN ('completed','closed','cancelled','verified')`
  );
  return result.rows.map((r: GenericRow) => ({
    rule_code: "ACTION_OVERDUE",
    entity_type: "action",
    entity_id: r.action_item_id,
    severity: "warning" as const,
    message: `Governance action "${r.title}" is overdue`,
  }));
}

async function checkExceptionsWithoutCompControls(schema: string): Promise<EnforcementResult[]> {
  const result = await safeQuery(
    `SELECT e.exception_id, COALESCE(e.title, 'Exception ' || e.exception_id) AS title
     FROM "${schema}".exceptions e
     WHERE e.deleted_at IS NULL AND e.status = 'approved'
       AND NOT EXISTS (
         SELECT 1 FROM "${schema}".governance_compensating_controls cc
         WHERE cc.exception_id = e.exception_id AND cc.deleted_at IS NULL
       )`
  );
  return result.rows.map((r: GenericRow) => ({
    rule_code: "EXCEPTION_NO_COMP_CTRL",
    entity_type: "exception",
    entity_id: r.exception_id,
    severity: "warning" as const,
    message: `Approved exception "${r.title}" has no compensating controls`,
  }));
}

async function checkExpiredCharters(schema: string): Promise<EnforcementResult[]> {
  const result = await safeQuery(
    `SELECT c.charter_id, c.title_en
     FROM "${schema}".governance_charters c
     WHERE c.deleted_at IS NULL AND c.expiry_date IS NOT NULL
       AND c.expiry_date < CURRENT_DATE
       AND c.status NOT IN ('expired','archived')`
  );
  return result.rows.map((r: GenericRow) => ({
    rule_code: "CHARTER_EXPIRED",
    entity_type: "charter",
    entity_id: r.charter_id,
    severity: "violation" as const,
    message: `Charter "${r.title_en}" has expired but status not updated`,
  }));
}

// === MAIN ENFORCEMENT SCAN ===

export async function runEnforcementScan(tenantId: string): Promise<EnforcementResult[]> {
  const schema = tenantSchema(tenantId);
  const allResults: EnforcementResult[] = [];

  const checks = [
    checkCommitteesWithoutCharters,
    checkMeetingsWithoutMinutes,
    checkDecisionsWithoutRationale,
    checkOverduePolicyReviews,
    checkExpiredMandates,
    checkExpiredDelegations,
    checkOverdueActions,
    checkExceptionsWithoutCompControls,
    checkExpiredCharters,
  ];

  for (const check of checks) {
    try {
      const results = await check(schema);
      allResults.push(...results);
    } catch {
      // Individual check failure is non-fatal — table may not exist yet
    }
  }

  // Persist new violations (upsert by rule_code + entity_id)
  for (const r of allResults) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".governance_enforcement_log
           (log_id, tenant_id, rule_code, entity_type, entity_id, severity, message)
         VALUES ($1, $2, $3, $4, $5::uuid, $6, $7)
         ON CONFLICT DO NOTHING`,
        [uuid(), tenantId, r.rule_code, r.entity_type, r.entity_id, r.severity, r.message]
      );
    } catch {
      // best-effort logging
    }
  }

  // Emit governance events for detected violations
  for (const r of allResults) {
    try {
      const eventTypeMap: Record<string, string> = {
        MANDATE_EXPIRED: 'governance.mandate_expired',
        DELEGATION_EXPIRED: 'governance.delegation_expired',
        POLICY_REVIEW_OVERDUE: 'governance.policy_review_overdue',
        ACTION_OVERDUE: 'governance.action_overdue',
        CHARTER_EXPIRED: 'governance.charter_expired',
        COMMITTEE_NO_CHARTER: 'governance.enforcement_violation',
        MEETING_NO_MINUTES: 'governance.enforcement_violation',
        DECISION_NO_RATIONALE: 'governance.enforcement_violation',
        EXCEPTION_NO_COMP_CTRL: 'governance.enforcement_violation',
      };
      const eventType = eventTypeMap[r.rule_code] || 'governance.enforcement_violation';
      await eventBus.publish(({
              eventType: eventType as string,
              tenantId,
              sourceService: 'governance-enforcement',
              entityType: r.entity_type,
              entityId: r.entity_id,
              severity: r.severity === 'violation' ? 'critical' : 'warning',
              payload: { rule_code: r.rule_code, message: r.message },
            } as any));
    } catch { /* best-effort event emission */ }
  }

  return allResults;
}

// === QUERY & RESOLUTION ===

export async function getViolations(tenantId: string, filters?: {
  severity?: string; entity_type?: string; resolved?: boolean;
}): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  let sql = `SELECT * FROM "${schema}".governance_enforcement_log WHERE tenant_id = $1`;
  const params: unknown[] = [tenantId];

  if (filters?.severity) { params.push(filters.severity); sql += ` AND severity = $${params.length}`; }
  if (filters?.entity_type) { params.push(filters.entity_type); sql += ` AND entity_type = $${params.length}`; }
  if (filters?.resolved === true) sql += ` AND resolved_at IS NOT NULL`;
  if (filters?.resolved === false) sql += ` AND resolved_at IS NULL`;

  sql += ` ORDER BY created_at DESC LIMIT 500`;
  const result = await safeQuery(sql, params);
  return result.rows;
}

export async function resolveViolation(tenantId: string, logId: string, resolvedBy: string): Promise<unknown> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.governance_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getViolationSummary(tenantId: string): Promise<{
  total: number; violations: number; warnings: number; info: number; unresolved: number;
}> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE severity = 'violation')::int AS violations,
       COUNT(*) FILTER (WHERE severity = 'warning')::int AS warnings,
       COUNT(*) FILTER (WHERE severity = 'info')::int AS info,
       COUNT(*) FILTER (WHERE resolved_at IS NULL)::int AS unresolved
     FROM "${schema}".governance_enforcement_log
     WHERE tenant_id = $1`,
    [tenantId]
  );
  return result.rows[0] || { total: 0, violations: 0, warnings: 0, info: 0, unresolved: 0 };
}

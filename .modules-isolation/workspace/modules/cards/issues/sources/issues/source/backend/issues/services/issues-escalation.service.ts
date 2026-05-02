// ============================================
// Issues — Escalation Service
// Escalation chain, triggers, alerts, history
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { emitIssuesEvent } from './issues-event.service';
import { getFirstRow as _getFirstRow } from '@dos/db';
import { ISSUES_TIMEOUTS } from '../data/issues-constants';
import { SYSTEM_JOB_ACTOR } from '../ports/platform.port';

// === Types ===

export type EscalationLevel = 'L1' | 'L2' | 'L3';

export interface EscalationChainEntry {
  level: EscalationLevel;
  assignedTo: string;
  escalatedAt: string;
  reason: string;
  resolvedAt?: string;
}

export interface EscalationRecord {
  issueId: string;
  currentLevel: EscalationLevel;
  chain: EscalationChainEntry[];
  alertsSent: ManagementAlert[];
}

export interface ManagementAlert {
  issueId: string;
  level: EscalationLevel;
  severity: string;
  reason: string;
  assignedTo: string;
  generatedAt: string;
}

// === Pure Functions ===

export function nextEscalationLevel(current: EscalationLevel): EscalationLevel | null {
  const chain: EscalationLevel[] = ['L1', 'L2', 'L3'];
  const idx = chain.indexOf(current);
  return idx < chain.length - 1 ? chain[idx + 1] : null;
}

export function shouldEscalateByAge(createdAt: Date, now: Date, thresholdHours: number): boolean {
  const elapsedHours = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return elapsedHours >= thresholdHours;
}

export function buildManagementAlert(
  issueId: string,
  level: EscalationLevel,
  severity: string,
  reason: string,
  assignedTo: string
): ManagementAlert {
  return { issueId, level, severity, reason, assignedTo, generatedAt: new Date().toISOString() };
}

// === DB-backed Functions ===

export async function escalateIssue(
  tenantId: string,
  issueId: string,
  toLevel: EscalationLevel,
  assignedTo: string,
  reason: string,
  triggeredBy: string
): Promise<EscalationChainEntry> {
      await safeQuery("UPDATE __TENANT_SCHEMA__.issues_items SET updated_at = NOW()" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return {} as any;
}

export async function getEscalationHistory(tenantId: string, issueId: string): Promise<EscalationChainEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT metadata->'escalation_chain' AS chain FROM "${schema}".issues WHERE issue_id = $1 AND deleted_at IS NULL`,
    [issueId]
  );
  if (result.rows.length === 0) return [];
  const chain = result.rows[0].chain;
  return Array.isArray(chain) ? chain : [];
}

export async function runEscalationJob(tenantId: string): Promise<{ processed: number; escalated: number }> {
  const schema = tenantSchema(tenantId);
  const thresholdHours = ISSUES_TIMEOUTS.ESCALATION_AFTER_HOURS;
  const cutoff = new Date(Date.now() - thresholdHours * 60 * 60 * 1000).toISOString();

  const result = await safeQuery(
    `SELECT issue_id, severity, assigned_to, metadata, created_at
     FROM "${schema}".issues
     WHERE status IN ('open','triaged','investigating','in_progress')
       AND created_at < $1
       AND deleted_at IS NULL`,
    [cutoff]
  );

  let escalated = 0;

  for (const row of result.rows) {
    const meta = typeof row.metadata === 'object' && row.metadata ? row.metadata : {};

    const currentLevel: EscalationLevel = (meta as Record<string, unknown>).escalation_level ?? 'L1';
    const nextLevel = nextEscalationLevel(currentLevel);
    if (!nextLevel) continue;

    try {
      await escalateIssue(tenantId, row.issue_id, nextLevel, row.assigned_to ?? SYSTEM_JOB_ACTOR, 'auto_sla_breach', 'system');
      escalated++;
    } catch {
      // best-effort per issue
    }
  }

  return { processed: result.rows.length, escalated };
}

export async function generateManagementAlerts(tenantId: string): Promise<ManagementAlert[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT issue_id, severity, assigned_to, metadata
     FROM "${schema}".issues
     WHERE status IN ('open','triaged','investigating','in_progress')
       AND (metadata->>'escalation_level') IN ('L2','L3')
       AND deleted_at IS NULL
     ORDER BY created_at ASC`,
    []
  );

  return result.rows.map(r => {
    const meta = typeof r.metadata === 'object' && r.metadata ? r.metadata as Record<string, unknown> : {};
    return buildManagementAlert(
      r.issue_id,
      (meta.escalation_level as EscalationLevel) ?? 'L2',
      r.severity,
      'Pending escalated issue requires management attention',
      r.assigned_to ?? 'unassigned'
    );
  });
}

export async function resolveEscalation(
  tenantId: string,
  issueId: string,
  userId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".issues
     SET metadata = jsonb_set(COALESCE(metadata,'{}'), '{escalation_resolved_at}', $1::jsonb),
         updated_at = NOW(), updated_by = $2
     WHERE issue_id = $3`,
    [JSON.stringify(new Date().toISOString()), userId, issueId]
  );

  await recordAudit({
    tenantId,
    userId,
    module: 'issues',
    action: 'update',
    entityType: 'issue',
    entityId: issueId,
    afterState: { escalation_resolved: true },
  });
}

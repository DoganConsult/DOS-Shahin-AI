// Governance-OS case creators — manufactures case rows in
// dos.governance_os_cases when one of six trigger paths fires:
//   • initiative-run             → "did this initiative move the needle?"
//   • recommendation              → "did the user accept/dismiss?"
//   • escalation                  → "did the escalation reach the right authority?"
//   • task                        → "did the assignee close the task on time?"
//   • milestone-evaluation        → "was the milestone achieved by the target?"
//   • digest-interaction          → "did the digest get acted on?"
//
// Each `createCaseFrom*` writes a case header + opens an observation
// window after which governance-os-case-outcome.service evaluates the
// outcome and updates dos.governance_os_case_effectiveness.

import { safeQuery } from '@dos/db';
import { randomUUID } from 'node:crypto';

export type CaseType =
  | 'initiative-run'
  | 'recommendation'
  | 'escalation'
  | 'task'
  | 'milestone-evaluation'
  | 'digest-interaction'
  | string;

/**
 * Per-case-type observation window in milliseconds. After this duration
 * the outcome evaluator runs against the case and writes effectiveness.
 */
export const OBSERVATION_WINDOWS: Record<string, number> = {
  'initiative-run':         14 * 24 * 60 * 60 * 1000, // 14 days
  'recommendation':          7 * 24 * 60 * 60 * 1000, // 7 days
  'escalation':              3 * 24 * 60 * 60 * 1000, // 3 days
  'task':                    1 * 24 * 60 * 60 * 1000, // 24 hours
  'milestone-evaluation':   30 * 24 * 60 * 60 * 1000, // 30 days
  'digest-interaction':      2 * 24 * 60 * 60 * 1000, // 2 days
};

export interface CaseHeader {
  caseId: string;
  tenantId: string;
  caseType: CaseType;
  entityType?: string;
  entityId?: string;
  context: Record<string, unknown>;
  observationDueAt: string;
  createdAt: string;
}

async function insertCase(
  tenantId: string,
  caseType: CaseType,
  entity: { entityType?: string; entityId?: string },
  context: Record<string, unknown>,
): Promise<CaseHeader> {
  const caseId = randomUUID();
  const windowMs = OBSERVATION_WINDOWS[caseType] ?? 7 * 24 * 60 * 60 * 1000;
  const observationDueAt = new Date(Date.now() + windowMs).toISOString();
  try {
    await safeQuery(
      `INSERT INTO dos.governance_os_cases
         (case_id, tenant_id, case_type, entity_type, entity_id,
          context, observation_due_at, created_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, NOW())`,
      [
        caseId, tenantId, caseType,
        entity.entityType ?? null,
        entity.entityId ?? null,
        JSON.stringify(context ?? {}),
        observationDueAt,
      ],
    );
  } catch { /* table absent — id still returned for caller audit */ }
  return {
    caseId,
    tenantId,
    caseType,
    entityType: entity.entityType,
    entityId: entity.entityId,
    context: context ?? {},
    observationDueAt,
    createdAt: new Date().toISOString(),
  };
}

export async function createCaseFromInitiativeRun(
  tenantId: string,
  initiativeId: string,
  context: Record<string, unknown> = {},
): Promise<CaseHeader> {
  return insertCase(tenantId, 'initiative-run', { entityType: 'initiative', entityId: initiativeId }, context);
}

export async function createCaseFromRecommendation(
  tenantId: string,
  recommendationId: string,
  context: Record<string, unknown> = {},
): Promise<CaseHeader> {
  return insertCase(tenantId, 'recommendation', { entityType: 'recommendation', entityId: recommendationId }, context);
}

export async function createCaseFromEscalation(
  tenantId: string,
  escalationId: string,
  context: Record<string, unknown> = {},
): Promise<CaseHeader> {
  return insertCase(tenantId, 'escalation', { entityType: 'escalation', entityId: escalationId }, context);
}

export async function createCaseFromTask(
  tenantId: string,
  taskId: string,
  context: Record<string, unknown> = {},
): Promise<CaseHeader> {
  return insertCase(tenantId, 'task', { entityType: 'task', entityId: taskId }, context);
}

export async function createCaseFromMilestoneEvaluation(
  tenantId: string,
  milestoneId: string,
  context: Record<string, unknown> = {},
): Promise<CaseHeader> {
  return insertCase(tenantId, 'milestone-evaluation', { entityType: 'milestone', entityId: milestoneId }, context);
}

export async function createCaseFromDigestInteraction(
  tenantId: string,
  digestId: string,
  context: Record<string, unknown> = {},
): Promise<CaseHeader> {
  return insertCase(tenantId, 'digest-interaction', { entityType: 'digest', entityId: digestId }, context);
}

/**
 * Resolve the surrounding context for a case at outcome-evaluation time.
 * Pulls the case row + any related observability events. Outcome
 * evaluators consume this when scoring effectiveness.
 */
export async function gatherContextForCase(
  tenantId: string,
  caseId: string,
): Promise<{ caseRow: Record<string, unknown> | null; events: Record<string, unknown>[] }> {
  let caseRow: Record<string, unknown> | null = null;
  let events: Record<string, unknown>[] = [];
  try {
    const r = await safeQuery(
      `SELECT case_id, tenant_id, case_type, entity_type, entity_id,
              context, observation_due_at, created_at
         FROM dos.governance_os_cases
        WHERE tenant_id = $1 AND case_id = $2
        LIMIT 1`,
      [tenantId, caseId],
    );
    caseRow = (r.rows[0] as Record<string, unknown> | undefined) ?? null;
  } catch { /* table absent */ }
  try {
    const r = await safeQuery(
      `SELECT event_id, action, entity_type, entity_id, payload, created_at
         FROM dos.audit_trail
        WHERE tenant_id = $1
          AND entity_id = (SELECT entity_id FROM dos.governance_os_cases WHERE case_id = $2 AND tenant_id = $1 LIMIT 1)
        ORDER BY created_at ASC`,
      [tenantId, caseId],
    );
    events = (r.rows as Record<string, unknown>[]) ?? [];
  } catch { /* audit table missing — no events */ }
  return { caseRow, events };
}

// ============================================================
// Cooperative Workflow #9 — Audit Prep Checklist Co-Builder
// A05 analyzes framework requirements, cross-references evidence
// and control tests, generates checklist with gap indicators.
// Audit team reviews, adds items, marks ready. A05 auto-generates
// evidence package for ready items.
// ============================================================

import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import { eventBus } from '../../../ports/events.port';
import { recordAudit } from '../core/audit-trail.service';
import type { AuditPrepChecklist, AuditPrepItem } from '@dos/types';
import { randomUUID } from 'crypto';
import { getFirstRow } from '@dos/db';
import type { GenericRow as _GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

// ── Generate Checklist ─────────────────────────────────────────────────────

export async function generateChecklist(tenantId: string, input: {
  frameworkId: string; auditTeamLeadId: string;
}): Promise<AuditPrepChecklist> {
  const schema = tenantSchema(tenantId);

  // Get controls for this framework
  const controlsRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT control_id, title, control_ref FROM "${schema}".controls
     WHERE framework_id = $1 ORDER BY control_ref`, [input.frameworkId],
  ), { tenantId: tenantId, operation: 'query controls' });

  const items: AuditPrepItem[] = [];

  for (const ctrl of controlsRes.rows) {
    // Check evidence status
    const evidRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, approved: 0, last_updated: null }]), safeQuery(
      `SELECT COUNT(*) AS total,
              COUNT(*) FILTER (WHERE status = 'approved') AS approved,
              MAX(updated_at) AS last_updated
       FROM "${schema}".evidence WHERE control_id = $1`, [ctrl.control_id],
    ), { tenantId: tenantId, operation: 'query evidence' });

    const ev = getFirstRow(evidRes)!;
    const total = Number(ev.total || 0);
    const approved = Number(ev.approved || 0);
    const lastUpdated = ev.last_updated;

    let evidenceStatus: AuditPrepItem['evidenceStatus'] = 'missing';
    if (total > 0 && approved === total) {
      // Check staleness (> 90 days)
      const isStale = lastUpdated && (Date.now() - new Date(lastUpdated).getTime()) > 90 * 86400000;
      evidenceStatus = isStale ? 'stale' : 'present';
    } else if (total > 0) {
      evidenceStatus = 'partial';
    }

    // Check test results
    const testRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT result FROM "${schema}".control_tests
       WHERE control_id = $1 ORDER BY tested_at DESC LIMIT 1`, [ctrl.control_id],
    ), { tenantId: tenantId, operation: 'query control_tests' });

    const testResult = getFirstRow(testRes)?.result as AuditPrepItem['testResult'] | undefined;

    items.push({
      itemId: randomUUID(),
      controlRef: (ctrl.control_ref as string) || (ctrl.control_id as string),
      controlTitle: ctrl.title as string,
      evidenceStatus,
      testResult: testResult || 'not_tested',
      agentNotes: buildAgentNotes(evidenceStatus, testResult),
      addedBy: 'agent',
      markedReady: evidenceStatus === 'present' && testResult === 'pass',
    });
  }

  const gapCount = items.filter(i => i.evidenceStatus !== 'present' || i.testResult === 'fail').length;
  const readyCount = items.filter(i => i.markedReady).length;

  const res = await safeQuery(
    `INSERT INTO "${schema}".audit_prep_checklists
       (framework_id, audit_team_lead_id, items, gap_count, ready_count)
     VALUES ($1, $2, $3, $4, $5) RETURNING checklist_id, created_at, updated_at`,
    [input.frameworkId, input.auditTeamLeadId, JSON.stringify(items), gapCount, readyCount],
  );

  await eventBus.publish(({
      tenantId, eventType: 'audit_prep.generated', severity: 'info',
      entityId: getFirstRow(res)?.checklist_id,
      payload: { frameworkId: input.frameworkId, totalItems: items.length, gapCount, readyCount },
    } as any));

  return getChecklist(tenantId, getFirstRow(res)?.checklist_id);
}

// ── Add Human Item ─────────────────────────────────────────────────────────

export async function addHumanItem(tenantId: string, checklistId: string, item: {
  controlRef: string; controlTitle: string; humanNotes: string; userId: string;
}): Promise<AuditPrepChecklist> {
  const schema = tenantSchema(tenantId);
  const checklist = await getRawChecklist(schema, checklistId);

  const items: AuditPrepItem[] = checklist.items;
  items.push({
    itemId: randomUUID(),
    controlRef: item.controlRef,
    controlTitle: item.controlTitle,
    evidenceStatus: 'missing',
    agentNotes: '',
    humanNotes: item.humanNotes,
    addedBy: 'human',
    markedReady: false,
  });

  const gapCount = items.filter(i => !i.markedReady).length;
  await safeQuery(
    `UPDATE "${schema}".audit_prep_checklists SET items = $1, gap_count = $2, updated_at = NOW() WHERE checklist_id = $3`,
    [JSON.stringify(items), gapCount, checklistId],
  );

  return getChecklist(tenantId, checklistId);
}

// ── Mark Item Ready ────────────────────────────────────────────────────────

export async function markItemReady(tenantId: string, checklistId: string, itemId: string, _userId: string): Promise<AuditPrepChecklist> {
  const schema = tenantSchema(tenantId);
  const checklist = await getRawChecklist(schema, checklistId);

  const items: AuditPrepItem[] = checklist.items;
  const item = items.find(i => i.itemId === itemId);
  if (item) item.markedReady = true;

  const readyCount = items.filter(i => i.markedReady).length;
  const gapCount = items.filter(i => !i.markedReady).length;

  await safeQuery(
    `UPDATE "${schema}".audit_prep_checklists
     SET items = $1, ready_count = $2, gap_count = $3, updated_at = NOW()
     WHERE checklist_id = $4`,
    [JSON.stringify(items), readyCount, gapCount, checklistId],
  );

  return getChecklist(tenantId, checklistId);
}

// ── Update Checklist Status ────────────────────────────────────────────────

export async function updateChecklistStatus(tenantId: string, checklistId: string, status: string, userId: string): Promise<AuditPrepChecklist> {
  const schema = tenantSchema(tenantId);

  await safeQuery(
    `UPDATE "${schema}".audit_prep_checklists SET status = $1, updated_at = NOW() WHERE checklist_id = $2`,
    [status, checklistId],
  );

  await recordAudit({
    tenantId, userId, module: 'cooperative-workflows',
    action: 'update', entityType: 'audit_prep_checklist', entityId: checklistId,
    afterState: { status },
  });

  return getChecklist(tenantId, checklistId);
}

// ── Query ──────────────────────────────────────────────────────────────────

export async function getChecklist(tenantId: string, checklistId: string): Promise<AuditPrepChecklist> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.audit_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

export async function listChecklists(tenantId: string): Promise<AuditPrepChecklist[]> {
  const schema = tenantSchema(tenantId);
  const res = await safeQuery(`SELECT * FROM "${schema}".audit_prep_checklists ORDER BY updated_at DESC LIMIT 50`);
  return res.rows.map(mapChecklist);
}

// ── Helpers ────────────────────────────────────────────────────────────────

function buildAgentNotes(evidenceStatus: string, testResult?: string): string {
  const parts: string[] = [];
  if (evidenceStatus === 'missing') parts.push('⚠ No evidence uploaded');
  if (evidenceStatus === 'stale') parts.push('⚠ Evidence is older than 90 days');
  if (evidenceStatus === 'partial') parts.push('⚠ Some evidence pending approval');
  if (testResult === 'fail') parts.push('⚠ Latest control test failed');
  if (testResult === 'not_tested') parts.push('ℹ Control has not been tested');
  if (evidenceStatus === 'present' && testResult === 'pass') parts.push('✓ Ready for audit');
  return parts.join('. ');
}

async function getRawChecklist(schema: string, checklistId: string): Promise<Record<string, any>> {
  const res = await safeQuery(`SELECT * FROM "${schema}".audit_prep_checklists WHERE checklist_id = $1`, [checklistId]);
  if (!res.rows.length) throw new Error('Checklist not found');
  const r = getFirstRow(res)!;
  r.items = typeof r.items === 'string' ? JSON.parse(r.items) : r.items || [];
  return r;
}

function mapChecklist( r: Record<string, any>): AuditPrepChecklist {
  return {
    checklistId: r.checklist_id as string, frameworkId: r.framework_id as string, agentId: r.agent_id as string,
    auditTeamLeadId: r.audit_team_lead_id as string,
    items: typeof r.items === 'string' ? JSON.parse(r.items) : r.items || [],
    status: (r.status as 'in_progress' | 'draft' | 'ready' | 'submitted') || 'draft', gapCount: Number(r.gap_count), readyCount: Number(r.ready_count),
    createdAt: r.created_at?.toISOString?.() || String(r.created_at),
    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

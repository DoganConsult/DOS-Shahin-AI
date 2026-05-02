// ============================================
// Shahin — Action Tracking Service
// Progress tracking, completion verification,
// blocker reporting, dependency chain tracking,
// progress percentage
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// === Types ===

export interface ActionProgress {
  itemId: string;
  title: string;
  status: string;
  percentageComplete: number;
  hasEvidence: boolean;
  blockerCount: number;
  dependencyCount: number;
  dependenciesResolved: boolean;
  lastUpdated: string | null;
}

export interface ActionBlocker {
  blockerId: string;
  itemId: string;
  description: string;
  reportedBy: string;
  resolvedBy: string | null;
  status: 'open' | 'resolved';
  createdAt: string;
  resolvedAt: string | null;
}

export interface ActionDependency {
  dependencyId: string;
  itemId: string;
  dependsOnItemId: string;
  dependsOnTitle: string;
  dependsOnStatus: string;
  resolved: boolean;
  createdAt: string;
}

export interface CompletionEvidence {
  evidenceId: string;
  itemId: string;
  description: string;
  fileReference: string | null;
  submittedBy: string;
  createdAt: string;
}

// === Pure Functions ===

export function computeActionProgress(
  status: string,
  hasEvidence: boolean,
  dependenciesResolved: boolean
): number {
  if (status === 'completed') return 100;
  if (status === 'pending') return 0;
  if (status === 'cancelled') return 0;
  let pct = 30;
  if (dependenciesResolved) pct += 20;
  if (hasEvidence) pct += 25;
  if (status === 'overdue') return Math.max(0, pct - 10);
  return pct;
}

export function areDependenciesResolved(dependencies: ActionDependency[]): boolean {
  return dependencies.every(d => d.resolved);
}

// === Mappers ===

function mapBlocker( r: Record<string, unknown>): ActionBlocker {
  return {

    blockerId: r.blocker_id,

    itemId: r.item_id,

    description: r.description,

    reportedBy: r.reported_by,

    resolvedBy: r.resolved_by || null,

    status: r.status,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    resolvedAt: r.resolved_at?.toISOString?.() || r.resolved_at || null,
  };
}

function mapDependency( r: Record<string, unknown>): ActionDependency {
  return {

    dependencyId: r.dependency_id,

    itemId: r.item_id,

    dependsOnItemId: r.depends_on_item_id,

    dependsOnTitle: r.depends_on_title || r.depends_on_item_id,

    dependsOnStatus: r.depends_on_status || 'unknown',
    resolved: r.depends_on_status === 'completed',

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

// === Progress ===

export async function getActionProgress(
  tenantId: string,
  itemId: string
): Promise<ActionProgress> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".action_items WHERE item_id = $1`,
    [itemId]
  );
  return (result?.rows?.[0] ?? {}) as unknown as ActionProgress;
}

// === Blockers ===

export async function reportBlocker(
  tenantId: string,
  itemId: string,
  description: string,
  reportedBy: string
): Promise<ActionBlocker> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".action_blockers
       (blocker_id, item_id, description, reported_by, status)
     VALUES ($1,$2,$3,$4,'open') RETURNING *`,
    [uuid(), itemId, description, reportedBy]
  );
  return mapBlocker(getFirstRow(result));
}

export async function resolveBlocker(
  tenantId: string,
  blockerId: string,
  resolvedBy: string
): Promise<ActionBlocker> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".action_blockers
     SET status = 'resolved', resolved_by = $2, resolved_at = NOW()
     WHERE blocker_id = $1 RETURNING *`,
    [blockerId, resolvedBy]
  );
  return mapBlocker(getFirstRow(result));
}

export async function getBlockers(
  tenantId: string,
  itemId: string
): Promise<ActionBlocker[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".action_blockers WHERE item_id = $1 ORDER BY created_at DESC`,
      [itemId]
    );
    return result.rows.map(mapBlocker);
  } catch { return []; }
}

// === Dependencies ===

export async function addDependency(
  tenantId: string,
  itemId: string,
  dependsOnItemId: string
): Promise<ActionDependency> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".action_dependencies (dependency_id, item_id, depends_on_item_id)
     VALUES ($1,$2,$3)
     ON CONFLICT (item_id, depends_on_item_id) DO NOTHING
     RETURNING *`,
    [uuid(), itemId, dependsOnItemId]
  );
  if (result.rows.length === 0) {
    const existing = await safeQuery(
      `SELECT ad.*, ai.status AS depends_on_status, ai.title AS depends_on_title
       FROM "${schema}".action_dependencies ad
       JOIN "${schema}".action_items ai ON ai.item_id = ad.depends_on_item_id
       WHERE ad.item_id = $1 AND ad.depends_on_item_id = $2`,
      [itemId, dependsOnItemId]
    );
    return mapDependency(getFirstRow(existing));
  }
  const r = getFirstRow(result)!;
  return { dependencyId: r.dependency_id, itemId: r.item_id, dependsOnItemId: r.depends_on_item_id, dependsOnTitle: r.depends_on_item_id, dependsOnStatus: 'unknown', resolved: false, createdAt: r.created_at?.toISOString?.() || r.created_at };
}

export async function getDependencyChain(
  tenantId: string,
  itemId: string
): Promise<ActionDependency[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT ad.*, ai.status AS depends_on_status, ai.title AS depends_on_title
       FROM "${schema}".action_dependencies ad
       JOIN "${schema}".action_items ai ON ai.item_id = ad.depends_on_item_id
       WHERE ad.item_id = $1`,
      [itemId]
    );
    return result.rows.map(mapDependency);
  } catch { return []; }
}

// === Evidence ===

export async function addCompletionEvidence(
  tenantId: string,
  data: { itemId: string; description: string; fileReference?: string; submittedBy: string }
): Promise<CompletionEvidence> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".action_evidence
       (evidence_id, item_id, description, file_reference, submitted_by)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [uuid(), data.itemId, data.description, data.fileReference || null, data.submittedBy]
  );
  const r = getFirstRow(result)!;
  return {
    evidenceId: r.evidence_id,
    itemId: r.item_id,
    description: r.description,
    fileReference: r.file_reference || null,
    submittedBy: r.submitted_by,
    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function getCompletionEvidence(
  tenantId: string,
  itemId: string
): Promise<CompletionEvidence[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".action_evidence WHERE item_id = $1 ORDER BY created_at ASC`,
      [itemId]
    );
    return result.rows.map((r: Record<string, unknown>) => ({
      evidenceId: typeof r.evidence_id === 'string' ? r.evidence_id : '',
      itemId: typeof r.item_id === 'string' ? r.item_id : '',
      description: typeof r.description === 'string' ? r.description : '',
      fileReference: typeof r.file_reference === 'string' ? r.file_reference : null,
      submittedBy: typeof r.submitted_by === 'string' ? r.submitted_by : '',
      createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at ?? ''),
    }));
  } catch { return []; }
}

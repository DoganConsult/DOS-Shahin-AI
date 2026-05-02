// ============================================================================
// Next-Best-Action Service — AI OS R2
// Aggregates actionable items from 4 sources into a unified priority queue:
//   1. Open process_tasks assigned to user
//   2. Pending AI recommendations
//   3. Active AI alerts (unacknowledged)
//   4. Overdue evidence tasks
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { readModuleOperatingStates, isModuleOn } from '../../../ai/services/copilot/context-reader.service';

// ── Types ──────────────────────────────────────────────────────────────────

export interface NextBestAction {
  id: string;
  type: 'process_task' | 'ai_recommendation' | 'ai_alert' | 'evidence_overdue';
  title: string;
  description: string | null;
  priority: 'critical' | 'high' | 'medium' | 'low';
  entityType: string | null;
  entityId: string | null;
  route: string;
  source: string;
  dueDate: string | null;
}

const PRIORITY_RANK: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };

/** Derive a frontend route from entity type/id */
function entityRoute(entityType?: string | null, _entityId?: string | null): string {
  if (!entityType) return '/workspace-home';
  const routes: Record<string, string> = {
    risk: '/risk/register', control: '/compliance/controls', evidence: '/evidence/overview',
    policy: '/governance/policies', finding: '/audit/findings', incident: '/incidents',
    vendor: '/vendor-hub', framework: '/compliance/frameworks',
  };
  return routes[entityType] || `/workspace-home`;
}

// ── Core ───────────────────────────────────────────────────────────────────

export async function getNextBestActions(
  tenantId: string,
  userId: string,
  role: string,
  limit = 10,
): Promise<NextBestAction[]> {
  const schema = tenantSchema(tenantId);
  const actions: NextBestAction[] = [];

  // Source 1: Open process tasks assigned to user, sorted by SLA proximity
  try {
    const taskRes = await safeQuery(
      `SELECT task_id, title, description, priority, entity_type, entity_id, due_date, status
       FROM "${schema}".process_tasks
       WHERE tenant_id = $1
         AND (assigned_user_id = $2 OR assigned_user_id IS NULL)
         AND status IN ('pending','in_progress')
       ORDER BY
         CASE WHEN due_date IS NOT NULL AND due_date < NOW() THEN 0 ELSE 1 END,
         due_date ASC NULLS LAST
       LIMIT $3`,
      [tenantId, userId, limit],
    );
    for (const row of taskRes.rows) {
      actions.push({
        id: row.task_id,
        type: 'process_task',
        title: row.title,
        description: row.description,
        priority: row.priority || 'medium',
        entityType: row.entity_type,
        entityId: row.entity_id,
        route: entityRoute(row.entity_type, row.entity_id),
        source: 'Process Orchestration',
        dueDate: row.due_date,
      });
    }
  } catch { /* process_tasks may not exist for tenant */ }

  // Source 2: Pending AI recommendations
  try {
    const recRes = await safeQuery(
      `SELECT decision_id, explanation, outcome, entity_type, entity_id, agent_id, created_at
       FROM "${schema}".decision_record
       WHERE tenant_id = $1
         AND decision_type = 'recommendation'
         AND outcome->>'status' = 'pending'
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, limit],
    );
    for (const row of recRes.rows) {
      const outcome = typeof row.outcome === 'string' ? JSON.parse(row.outcome) : row.outcome || {};
      actions.push({
        id: row.decision_id,
        type: 'ai_recommendation',
        title: outcome.title || `AI Recommendation from ${row.agent_id}`,
        description: row.explanation,
        priority: outcome.priority || 'medium',
        entityType: row.entity_type,
        entityId: row.entity_id,
        route: entityRoute(row.entity_type, row.entity_id),
        source: `Agent ${row.agent_id || 'AI'}`,
        dueDate: null,
      });
    }
  } catch { /* decision_record may not exist */ }

  // Source 3: Active AI alerts (unacknowledged)
  try {
    const alertRes = await safeQuery(
      `SELECT alert_id, title, description, severity, alert_type, entity_type, entity_id, created_at
       FROM "${schema}".ai_alerts
       WHERE tenant_id = $1 AND status = 'open'
       ORDER BY
         CASE severity WHEN 'critical' THEN 0 WHEN 'warning' THEN 1 ELSE 2 END,
         created_at DESC
       LIMIT $2`,
      [tenantId, limit],
    );
    for (const row of alertRes.rows) {
      actions.push({
        id: row.alert_id,
        type: 'ai_alert',
        title: row.title,
        description: row.description,
        priority: row.severity === 'critical' ? 'critical' : row.severity === 'warning' ? 'high' : 'medium',
        entityType: row.entity_type,
        entityId: row.entity_id,
        route: entityRoute(row.entity_type, row.entity_id),
        source: `Alert: ${row.alert_type}`,
        dueDate: null,
      });
    }
  } catch { /* ai_alerts may not exist yet */ }

  // Source 4: Overdue evidence tasks
  try {
    const evRes = await safeQuery(
      `SELECT task_id, control_id, evidence_requirement_id, due_date, status
       FROM "${schema}".evidence_tasks
       WHERE tenant_id = $1 AND status IN ('pending','overdue')
         AND due_date IS NOT NULL AND due_date < NOW()
       ORDER BY due_date ASC
       LIMIT $2`,
      [tenantId, limit],
    );
    for (const row of evRes.rows) {
      actions.push({
        id: row.task_id,
        type: 'evidence_overdue',
        title: `Overdue evidence for control ${row.control_id}`,
        description: `Evidence requirement ${row.evidence_requirement_id} is past due`,
        priority: 'high',
        entityType: 'evidence',
        entityId: row.task_id,
        route: '/evidence/requests',
        source: 'Evidence Lifecycle',
        dueDate: row.due_date,
      });
    }
  } catch { /* evidence_tasks may not exist */ }

  // Deduplicate by id
  const seen = new Set<string>();
  const unique = actions.filter((a) => {
    if (seen.has(a.id)) return false;
    seen.add(a.id);
    return true;
  });

  const ENTITY_MODULE_MAP: Record<string, string> = {
    risk: 'risk', control: 'compliance', evidence: 'evidence',
    policy: 'governance', finding: 'audit', vendor: 'vendor_governance',
    framework: 'compliance', incident: 'governance',
  };
  const modStates = await readModuleOperatingStates(tenantId);
  const filtered = modStates.length > 0
    ? unique.filter(a => {
        if (!a.entityType) return true;
        const mod = ENTITY_MODULE_MAP[a.entityType];
        return !mod || isModuleOn(modStates, mod);
      })
    : unique;

  filtered.sort((a, b) => {
    const pa = PRIORITY_RANK[a.priority] ?? 3;
    const pb = PRIORITY_RANK[b.priority] ?? 3;
    if (pa !== pb) return pa - pb;
    if (a.dueDate && b.dueDate) return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });

  return filtered.slice(0, limit);
}

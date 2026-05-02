// ============================================
// Shahin — Remediation Plan Service
// Plan creation, milestones, templates,
// approval workflow, cost estimation, versioning
// ============================================

import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow } from '@dos/db';
import { v4 as uuid } from 'uuid';

// === Types ===

export interface RemediationPlan {
  planId: string;
  title: string;
  description: string;
  findingId: string | null;
  taskId: string | null;
  ownerId: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'rejected';
  version: number;
  estimatedCost: number | null;
  currency: string;
  startDate: string | null;
  targetDate: string | null;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PlanMilestone {
  milestoneId: string;
  planId: string;
  title: string;
  description: string;
  dueDate: string | null;
  assignedTo: string | null;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  sortOrder: number;
  createdAt: string;
}

export interface PlanTemplate {
  templateId: string;
  name: string;
  category: string;
  milestones: { title: string; description: string; offsetDays: number }[];
  estimatedDays: number;
  createdAt: string;
}

// === Pure Functions ===

export function estimatePlanCost(
  milestoneCount: number,
  durationDays: number,
  hourlyRate: number,
  hoursPerDay: number = 8
): number {
  return Math.round(milestoneCount * durationDays * hourlyRate * hoursPerDay * 0.1);
}

export function buildMilestonesFromTemplate(
  planId: string,
  template: PlanTemplate,
  startDate: Date
): Omit<PlanMilestone, 'milestoneId' | 'createdAt'>[] {
  return template.milestones.map((m, idx) => {
    const due = new Date(startDate);
    due.setDate(due.getDate() + m.offsetDays);
    return {
      planId,
      title: m.title,
      description: m.description,
      dueDate: due.toISOString().split('T')[0],
      assignedTo: null,
      status: 'pending' as const,
      sortOrder: idx + 1,
    };
  });
}

// === CRUD ===

function mapPlan( r: Record<string, unknown>): RemediationPlan {
  return {

    planId: r.plan_id,

    title: r.title,

    description: r.description || '',

    findingId: r.finding_id || null,

    taskId: r.task_id || null,

    ownerId: r.owner_id,

    status: r.status,

    version: r.version || 1,
    estimatedCost: r.estimated_cost ? parseFloat((r as any).estimated_cost) : null,

    currency: r.currency || 'USD',

    startDate: r.start_date?.toISOString?.().split('T')[0] || r.start_date || null,

    targetDate: r.target_date?.toISOString?.().split('T')[0] || r.target_date || null,

    approvedBy: r.approved_by || null,

    approvedAt: r.approved_at?.toISOString?.() || r.approved_at || null,

    createdAt: r.created_at?.toISOString?.() || r.created_at,

    updatedAt: r.updated_at?.toISOString?.() || r.updated_at,
  };
}

function mapMilestone( r: Record<string, unknown>): PlanMilestone {
  return {

    milestoneId: r.milestone_id,

    planId: r.plan_id,

    title: r.title,

    description: r.description || '',

    dueDate: r.due_date?.toISOString?.().split('T')[0] || r.due_date || null,

    assignedTo: r.assigned_to || null,

    status: r.status,

    sortOrder: r.sort_order || 0,

    createdAt: r.created_at?.toISOString?.() || r.created_at,
  };
}

export async function createRemediationPlan(
  tenantId: string,
  data: {
    title: string;
    description?: string;
    findingId?: string;
    taskId?: string;
    ownerId: string;
    estimatedCost?: number;
    currency?: string;
    startDate?: string;
    targetDate?: string;
  }
): Promise<RemediationPlan> {
  const schema = tenantSchema(tenantId);
  const planId = uuid();
  const result = await safeQuery(
    `INSERT INTO "${schema}".remediation_plans
       (plan_id, title, description, finding_id, task_id, owner_id,
        status, version, estimated_cost, currency, start_date, target_date)
     VALUES ($1,$2,$3,$4,$5,$6,'draft',1,$7,$8,$9,$10)
     RETURNING *`,
    [
      planId, data.title, data.description || '',
      data.findingId || null, data.taskId || null,
      data.ownerId, data.estimatedCost || null,
      data.currency || 'USD', data.startDate || null, data.targetDate || null,
    ]
  );
  return mapPlan(getFirstRow(result));
}

export async function getRemediationPlans(
  tenantId: string,
  filters?: { ownerId?: string; status?: string; findingId?: string }
): Promise<RemediationPlan[]> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (filters?.ownerId) { conditions.push(`owner_id = $${idx++}`); params.push(filters.ownerId); }
  if (filters?.status) { conditions.push(`status = $${idx++}`); params.push(filters.status); }
  if (filters?.findingId) { conditions.push(`finding_id = $${idx++}`); params.push(filters.findingId); }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_plans ${where} ORDER BY created_at DESC`,
    params
  );
  return result.rows.map(mapPlan);
}

export async function getRemediationPlanById(
  tenantId: string,
  planId: string
): Promise<RemediationPlan | null> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_plans WHERE plan_id = $1`,
    [planId]
  );
  const row = getFirstRow(result)!;
  return row ? mapPlan(row) : null;
}

export async function updateRemediationPlan(
  tenantId: string,
  planId: string,
  updates: Partial<{
    title: string; description: string; status: string;
    estimatedCost: number; startDate: string; targetDate: string;
  }>
): Promise<RemediationPlan> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_plans
     SET title = COALESCE($2, title),
         description = COALESCE($3, description),
         status = COALESCE($4, status),
         estimated_cost = COALESCE($5, estimated_cost),
         start_date = COALESCE($6, start_date),
         target_date = COALESCE($7, target_date),
         updated_at = NOW()
     WHERE plan_id = $1
     RETURNING *`,
    [
      planId,
      updates.title ?? null,
      updates.description ?? null,
      updates.status ?? null,
      updates.estimatedCost ?? null,
      updates.startDate ?? null,
      updates.targetDate ?? null,
    ],
  );
  return mapPlan(getFirstRow(result));
}

export async function approvePlan(
  tenantId: string,
  planId: string,
  approverId: string,
  approved: boolean,
  reason?: string
): Promise<RemediationPlan> {
  const schema = tenantSchema(tenantId);
  const status = approved ? 'approved' : 'rejected';
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_plans
     SET status = $2,
         approved_by = $3,
         approved_at = NOW(),
         updated_at = NOW()
     WHERE plan_id = $1
     RETURNING *`,
    [planId, status, approverId],
  );
  void reason;
  return mapPlan(getFirstRow(result));
}

export async function versionPlan(
  tenantId: string,
  planId: string
): Promise<RemediationPlan> {
  const schema = tenantSchema(tenantId);
  const current = await safeQuery(
    `SELECT * FROM "${schema}".remediation_plans WHERE plan_id = $1 LIMIT 1`,
    [planId],
  );
  const row = getFirstRow(current) as any;
  if (!row) throw new Error('Plan not found');
  const nextVersion = (row.version != null ? Number(row.version) : 1) + 1;
  const updated = await safeQuery(
    `UPDATE "${schema}".remediation_plans SET version = $2, updated_at = NOW() WHERE plan_id = $1 RETURNING *`,
    [planId, nextVersion],
  );
  return mapPlan(getFirstRow(updated));
}

// === Milestones ===

export async function addMilestone(
  tenantId: string,
  data: { planId: string; title: string; description?: string; dueDate?: string; assignedTo?: string; sortOrder?: number }
): Promise<PlanMilestone> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".remediation_milestones
       (milestone_id, plan_id, title, description, due_date, assigned_to, status, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,'pending',$7) RETURNING *`,
    [uuid(), data.planId, data.title, data.description || '', data.dueDate || null, data.assignedTo || null, data.sortOrder ?? 0]
  );
  return mapMilestone(getFirstRow(result));
}

export async function getMilestones(tenantId: string, planId: string): Promise<PlanMilestone[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".remediation_milestones WHERE plan_id = $1 ORDER BY sort_order ASC, created_at ASC`,
    [planId]
  );
  return result.rows.map(mapMilestone);
}

export async function updateMilestoneStatus(
  tenantId: string,
  milestoneId: string,
  status: PlanMilestone['status']
): Promise<PlanMilestone> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".remediation_milestones
     SET status = $2, updated_at = NOW()
     WHERE milestone_id = $1
     RETURNING *`,
    [milestoneId, status],
  );
  return mapMilestone(getFirstRow(result));
}

export async function getPlanTemplates(tenantId: string): Promise<PlanTemplate[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT * FROM "${schema}".remediation_plan_templates ORDER BY name ASC`
    );
    return result.rows.map(r => ({
      templateId: r.template_id,
      name: r.name,
      category: r.category || 'general',
      milestones: r.milestones || [],
      estimatedDays: r.estimated_days || 30,
      createdAt: r.created_at?.toISOString?.() || r.created_at,
    }));
  } catch { return []; }
}

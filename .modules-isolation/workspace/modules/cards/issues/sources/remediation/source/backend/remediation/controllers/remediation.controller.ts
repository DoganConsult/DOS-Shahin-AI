// ============================================
// Remediation Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports ---
import {
  createRemediationTask, getRemediationTasks, getRemediationTaskById,
  updateRemediationTask, deleteRemediationTask, checkOverdueTasks,
} from '../services/remediation.service';
import { runRemediationCycle } from '../services/autonomous-remediation.service';

// ── REMEDIATION TASK CRUD ──────────────────────────────

export async function listPlans(req: AuthenticatedRequest, res: Response): Promise<void> {
  const user = req.user!;
  const scopeUser = user ? { userId: user.userId, role: user.role } : undefined;
  const result = await getRemediationTasks(req.tenantId!, scopeUser);
  res.json(ok(result, req));
}

export async function getPlanById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const task = await getRemediationTaskById(req.tenantId!, req.params.id);
  if (!task) throw new NotFoundError('remediation_task', req.params.id);
  res.json(ok(task, req));
}

export async function createPlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const task = await createRemediationTask(req.tenantId!, {
    ...req.body,
    created_by: userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'remediation_task', entityId: task?.task_id, afterState: task });
  res.status(201).json(ok(task, req));
}

export async function updatePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const before = await getRemediationTaskById(req.tenantId!, id);
  if (!before) throw new NotFoundError('remediation_task', id);
  const updated = await updateRemediationTask(req.tenantId!, id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'remediation_task', entityId: id, beforeState: before, afterState: updated });
  res.json(ok(updated, req));
}

export async function deletePlan(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const deleted = await deleteRemediationTask(req.tenantId!, id);
  if (!deleted) throw new NotFoundError('remediation_task', id);
  setAuditData(res as any, { action: 'delete', entityType: 'remediation_task', entityId: id });
  res.json(action('Remediation task deleted', req));
}

// ── OVERDUE DETECTION ──────────────────────────────────

export async function checkOverdue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const count = await checkOverdueTasks(req.tenantId!);
  res.json(ok({ overdueCount: count }, req));
}

// ── AUTONOMOUS REMEDIATION ─────────────────────────────

export async function runAutonomousCycle(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await runRemediationCycle(req.tenantId!);
  setAuditData(res as any, { action: 'create', entityType: 'remediation_cycle', afterState: result.summary });
  res.json(ok(result, req));
}

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

import {
  getWorkflowTemplates, getWorkflowTemplatesFromDB, seedWorkflowTemplates,
  instantiateTemplate, startModuleWorkflow,
} from '../services/templates/workflow-templates.service';
import {
  startWorkflowExecution, advanceStep, completeStep, cancelExecution, getInstanceStatus,
} from '../ports/lifecycle.port';
import {
  createApprovalStep, resolveApproval, checkPreconditions as _checkPreconditions,
} from '../services/core/workflow-approvals.service';
import {
  getKanbanBoard, createTask,
} from '../services/tasks/task-board.service';
import {
  saveWorkflowConditions, getWorkflowConditions,
  createDelegationRule, getDelegationRules, deleteDelegationRule,
  resolveApprover, simulateWorkflow,
  createRoutingRule, getRoutingRules, resolveApprovalRoute,
  createParallelApproval, recordParallelVote, getWorkflowAnalytics,
} from '../services/ops/workflow-advanced.service';
import {
  getMyTasks as _getMyTasks, claimTask, getTeamQueue, releaseTask,
} from '../services/ops/workflow-queue.service';

export async function listTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = getWorkflowTemplates();
  res.json(ok(result, req));
}

export async function listDbTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getWorkflowTemplatesFromDB(req.tenantId!);
  res.json(ok(result, req));
}

export async function seedTemplates(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const count = await seedWorkflowTemplates(req.tenantId!, userId);
  setAuditData(res as any, { action: 'create', entityType: 'workflow_template_seed' });
  res.status(201).json(ok({ seeded: count }, req));
}

export async function instantiate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await instantiateTemplate(req.tenantId!, req.body.templateCode, req.body, userId);

  setAuditData(res as any, { action: 'create', entityType: 'workflow_instance', entityId: result?.workflow_id, afterState: result });
  res.status(201).json(ok(result, req));
}

export async function startModule(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await startModuleWorkflow(req.tenantId!, req.body.moduleCode, req.body.entityId, userId);
  setAuditData(res as any, { action: 'create', entityType: 'module_workflow' });
  res.status(201).json(ok(result, req));
}

export async function startExecution(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await startWorkflowExecution(req.tenantId!, req.params.id, req.body || {}, userId);
  setAuditData(res as any, { action: 'update', entityType: 'workflow_execution', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function advance(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;

  const result = await advanceStep(req.tenantId, req.params.id, (req as any).body.fromStepId, req.body, userId);
  setAuditData(res as any, { action: 'update', entityType: 'workflow_step', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function complete(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;

  const result = await completeStep(req.tenantId, req.params.id, (req as any).body.stepId, req.body.result || {}, userId);
  setAuditData(res as any, { action: 'update', entityType: 'workflow_step_complete', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function cancel(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;

  const result = await cancelExecution(req.tenantId, req.params.id, req.body.reason || '', (userId as any));
  setAuditData(res as any, { action: 'update', entityType: 'workflow_cancel', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function instanceStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getInstanceStatus(req.tenantId!, req.params.id);
  if (!result) throw new NotFoundError('workflow_instance', req.params.id);
  res.json(ok(result, req));
}

export async function createApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await createApprovalStep(req.tenantId!, req.body.executionId, req.body.approverId, req.body.slaHours ?? 24, req.body.escalationChain);
  setAuditData(res as any, { action: 'create', entityType: 'workflow_approval' });
  res.status(201).json(ok(result, req));
}

export async function resolve(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await resolveApproval(req.tenantId!, req.params.id, req.body.decision, req.body.notes);
  setAuditData(res as any, { action: 'update', entityType: 'workflow_approval', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function kanbanBoard(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getKanbanBoard(req.tenantId!);
  res.json(ok(result, req));
}

export async function createTaskHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createTask(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'workflow_task' });
  res.status(201).json(ok(result, req));
}

export async function conditions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getWorkflowConditions(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

export async function saveConditions(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await saveWorkflowConditions(req.tenantId!, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'workflow_conditions', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function delegationRules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getDelegationRules(req.tenantId!);
  res.json(ok(result, req));
}

export async function createDelegation(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createDelegationRule(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'delegation_rule' });
  res.status(201).json(ok(result, req));
}

export async function removeDelegation(req: AuthenticatedRequest, res: Response): Promise<void> {
  await deleteDelegationRule(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'delegation_rule', entityId: req.params.id });
  res.json(action('Delegation rule deleted', req));
}

export async function resolveApproverHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await resolveApprover(req.tenantId!, req.body.originalApprover);
  res.json(ok(result, req));
}

export async function simulate(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await simulateWorkflow(req.tenantId!, req.body.workflowId, req.body.testData || {});
  res.json(ok(result, req));
}

export async function routingRules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getRoutingRules(req.tenantId!);
  res.json(ok(result, req));
}

export async function createRouting(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createRoutingRule(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'routing_rule' });
  res.status(201).json(ok(result, req));
}

export async function resolveRoute(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await resolveApprovalRoute(req.tenantId!, req.body.entityType, req.body.context || {});
  res.json(ok(result, req));
}

export async function createParallelApprovalHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await createParallelApproval(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'parallel_approval' });
  res.status(201).json(ok(result, req));
}

export async function parallelVote(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await recordParallelVote(req.tenantId!, req.params.id, userId, req.body.decision, req.body.notes);
  setAuditData(res as any, { action: 'update', entityType: 'parallel_vote', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function analytics(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await getWorkflowAnalytics(req.tenantId!);
  res.json(ok(result, req));
}

export async function queue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const roleCode = (req.query.role as string) || req.user!.userId!;
  const result = await getTeamQueue(req.tenantId!, roleCode);
  res.json(ok(result, req));
}

export async function claimWork(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await claimTask(req.tenantId!, req.params.id, userId);
  setAuditData(res as any, { action: 'update', entityType: 'work_item', entityId: req.params.id });
  res.json(ok(result, req));
}

export async function releaseWork(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await releaseTask(req.tenantId!, req.params.id);
  res.json(ok(result, req));
}

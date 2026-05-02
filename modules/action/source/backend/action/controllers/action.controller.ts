// ============================================
// Action Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action as _action, NotFoundError } from '@dos/module-sdk';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports ---
import {

  getActionItems, createActionItem as createActionItemService,

  updateActionItem as updateActionItemService,

  getDailyDigest, getConsolidatedActionCenter,

  escalateOverdueItems,
} from '../services/action-item.service';
import { dispatchAction } from '../services/action-executor.service';

// ── ACTION ITEM CRUD ───────────────────────────────────

export async function listActionItems(req: AuthenticatedRequest, res: Response): Promise<void> {
  const filters: Record<string, string> = {};
  if (req.query.assignedTo) filters.assignedTo = req.query.assignedTo as string;
  if (req.query.status) filters.status = req.query.status as string;
  if (req.query.sourceType) filters.sourceType = req.query.sourceType as string;
  const result = await getActionItems(req.tenantId!, filters);
  res.json(ok(result, req));
}

export async function getActionItemById(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const result = await getActionItems(req.tenantId!);
  const item = result.items.find((i: any) => i.actionId === id);
  if (!item) throw new NotFoundError('action_item', id);
  res.json(ok(item, req));
}

export async function createActionItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  const item = await createActionItemService(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'action_item', entityId: item?.actionId, afterState: item });
  res.status(201).json(ok(item, req));
}

export async function updateActionItem(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { id } = req.params;
  const updated = await updateActionItemService(req.tenantId!, id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'action_item', entityId: id, afterState: updated });
  res.json(ok(updated, req));
}

// ── DAILY DIGEST ───────────────────────────────────────

export async function dailyDigest(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? (req.query.userId as string);
  if (!userId) throw new NotFoundError('user', 'unknown');
  const result = await getDailyDigest(req.tenantId!, userId);
  res.json(ok(result, req));
}

// ── CONSOLIDATED ACTION CENTER ─────────────────────────

export async function consolidatedCenter(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.query.userId as string | undefined;
  const result = await getConsolidatedActionCenter(req.tenantId!, userId);
  res.json(ok(result, req));
}

// ── ESCALATION ─────────────────────────────────────────

export async function escalateOverdue(req: AuthenticatedRequest, res: Response): Promise<void> {
  const count = await escalateOverdueItems(req.tenantId!);
  setAuditData(res as any, { action: 'update', entityType: 'action_item_escalation' });
  res.json(ok({ escalatedCount: count }, req));
}

// ── DISPATCH ACTION ────────────────────────────────────

export async function dispatch(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user!.userId!;
  const result = await dispatchAction({
    ...req.body,
    tenantId: req.tenantId!,
    actor: userId,
  });
  setAuditData(res as any, { action: 'create', entityType: 'dispatched_action', entityId: result?.actionId });
  res.status(201).json(ok(result, req));
}

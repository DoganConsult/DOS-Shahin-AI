// ============================================
// Notification Module — Controller Layer
// Thin HTTP orchestrator: extracts request data,
// calls services, formats responses, sets audit context.
// ============================================

import type { Response } from 'express';
import type { AuthenticatedRequest } from '@dos/types';
import { ok, action } from '@dos/module-sdk';
import { NotFoundError as _NotFoundError } from '../../../errors/index';
import { setAuditData } from '../ports/middleware.port';

// --- Service imports ---
import {
  createNotification, getNotifications, markAsRead,
  markAllAsRead, deleteNotification,
  dispatchRiskScoreChangeNotifications, dispatchPolicyApprovalNotifications,
  dispatchDeadlineNotifications, dispatchEventNotifications,
} from '../services/notification.service';
import {
  loadNotificationRules, checkUserPreference,
  resolveNotificationsFromRules, resolveRecipients,
} from '../services/notification-rule-engine';
import {
  checkDeadlineNotifications,
} from '../services/notification-deadline-checks';

// ── NOTIFICATIONS CRUD ────────────────────────────────

export async function listNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? '';
  const result = await getNotifications(req.tenantId!, userId);
  res.json(ok(result, req));
}

export async function createNotificationHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user!.userId!;
  const result = await createNotification(req.tenantId!, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'notification', entityId: result?.notification_id, afterState: result });
  res.status(201).json(ok(result, req));
}

export async function markRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user?.userId ?? '';
  await markAsRead(req.tenantId!, req.params.id);
  res.json(action('Notification marked as read', req));
}

export async function markAllRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? '';
  await markAllAsRead(req.tenantId!, userId);
  res.json(action('All notifications marked as read', req));
}

export async function deleteNotificationHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const _userId = req.user?.userId ?? '';
  await deleteNotification(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'delete', entityType: 'notification', entityId: req.params.id });
  res.json(action('Notification deleted', req));
}

// ── DISPATCH (EVENT-DRIVEN) ───────────────────────────

export async function dispatchRiskScore(req: AuthenticatedRequest, res: Response): Promise<void> {
  await dispatchRiskScoreChangeNotifications(req.tenantId!, req.body.ownerId, req.body.oldScore, req.body.newScore, req.body.context);
  res.json(action('Risk score change notifications dispatched', req));
}

export async function dispatchPolicyApproval(req: AuthenticatedRequest, res: Response): Promise<void> {
  await dispatchPolicyApprovalNotifications(req.tenantId!, req.body.approverId, req.body.policyTitle, req.body.context);
  res.json(action('Policy approval notifications dispatched', req));
}

export async function dispatchDeadline(req: AuthenticatedRequest, res: Response): Promise<void> {
  await dispatchDeadlineNotifications(req.tenantId!, req.body.assigneeId, req.body.daysUntilDeadline, req.body.context);
  res.json(action('Deadline notifications dispatched', req));
}

export async function dispatchEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
  await dispatchEventNotifications(req.tenantId!, req.body.eventType, req.body.context);
  res.json(action('Event notifications dispatched', req));
}

// ── RULE ENGINE ───────────────────────────────────────

export async function listRules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await loadNotificationRules(req.tenantId!);
  res.json(ok(result, req));
}

export async function checkPreference(req: AuthenticatedRequest, res: Response): Promise<void> {
  const userId = req.user?.userId ?? '';
  const result = await checkUserPreference(req.tenantId!, userId, req.body.notificationType, req.body.module);
  res.json(ok(result, req));
}

export async function resolveFromRules(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await resolveNotificationsFromRules(req.tenantId!, req.body.eventType, req.body.context);
  res.json(ok(result, req));
}

export async function resolveRecipientsHandler(req: AuthenticatedRequest, res: Response): Promise<void> {
  const result = await resolveRecipients(req.tenantId!, req.tenantId!, req.body.strategy, req.body.value, req.body.context);
  res.json(ok(result, req));
}

// ── DEADLINE CHECKS ───────────────────────────────────

export async function runDeadlineChecks(req: AuthenticatedRequest, res: Response): Promise<void> {
  await checkDeadlineNotifications(req.tenantId!);
  res.json(action('Deadline checks completed', req));
}

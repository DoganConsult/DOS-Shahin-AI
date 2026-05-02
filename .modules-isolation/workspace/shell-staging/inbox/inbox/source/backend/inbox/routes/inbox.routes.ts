import { Router, Request, Response } from 'express';
import { z } from "zod";
import { authenticate, requirePermission } from '../ports/auth.port';
import { ok, action } from '@dos/module-sdk';
import { auditMiddleware, asyncHandler, requireOwnership, validate, setAuditData } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import {

  listMessages, getMessageById, createMessage, updateMessage, deleteMessage,
} from '../controllers/inbox.controller';

const genericPayloadSchema = z.record(z.unknown());
import * as inboxQuery from '../repositories/inbox-query.repo';
import { emitMessageRead, emitMessageActioned, emitBulkRead, emitBulkArchived } from '../services/inbox-event.service';
import { getPriorityQueue } from '../services/inbox-priority.service';
import { generateDigest, getDigestPreference, upsertDigestPreference } from '../services/inbox-digest.service';
import { executeInboxWorkflowAction } from '../services/inbox-dauth-workflow.service';
import { executeTriageAction, getTriageQueue, getTriageHistory } from '../services/InboxTriageService';
import { updateInboxState, getStateHistory, getStateStatistics } from '../services/InboxStateService';
import {
  createMessageBody, updateMessageBody, listMessagesQuery,
  updatePreferencesBody, bulkReadBody, bulkArchiveBody, bulkDeleteBody,
} from '../schemas/inbox.schemas';
const router = Router();
router.use(authenticate);
router.use(auditMiddleware('inbox'));

router.get('/', requirePermission('inbox.item.read'), validate({ query: listMessagesQuery }), asyncHandler(listMessages));

router.get('/search', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await inboxQuery.searchEntities(req.tenantId!, {
    query: req.query.q as string,
    status: req.query.status as string,
    channel: req.query.channel as string,
    priority: req.query.priority as string,
    recipientId: (req.query.recipientId as string) || req.user?.userId,
    relatedModule: req.query.relatedModule as string,
    actionRequired: req.query.actionRequired === 'true',
    unreadOnly: req.query.unreadOnly === 'true',
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
    sortBy: req.query.sortBy as string,
    sortDir: req.query.sortDir as 'ASC' | 'DESC',
  });
  res.json(ok(result, req));
}));

router.get('/unread-count', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const userId = req.user!.userId!;
  const result = await safeQuery(
    `SELECT COUNT(*)::int AS count FROM "${schema}".inbox_messages
     WHERE deleted_at IS NULL AND status = 'unread' AND recipient_id = $1`, [userId],
  );
  res.json(ok({ unread: result.rows[0]?.count || 0 }, req));
}));

router.get('/priority-queue', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || '';
  const queue = await getPriorityQueue(req.tenantId!, userId);
  res.json(ok({ items: queue, total: queue.length }, req));
}));

router.get('/thread/:threadId', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".inbox_messages
     WHERE thread_id = $1 AND deleted_at IS NULL
     ORDER BY created_at ASC`, [req.params.threadId],
  );
  res.json(ok({ messages: result.rows, total: result.rows.length }, req));
}));

router.get('/digest/preferences', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || '';
  const pref = await getDigestPreference(req.tenantId!, userId);
  res.json(ok(pref || { frequency: 'daily', sendAt: '08:00', includeRead: false, groupByModule: true }, req));
}));

router.put('/digest/preferences', requirePermission('inbox.item.write'), validate({ body: updatePreferencesBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || '';
  const pref = await upsertDigestPreference(req.tenantId!, userId, req.body);
  res.json(ok(pref, req));
}));

router.get('/digest/preview', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.userId || '';
  const period = (req.query.period as string) === 'weekly' ? 'weekly' : 'daily';
  const digest = await generateDigest(req.tenantId!, userId, period);
  res.json(ok(digest, req));
}));

router.get('/triage/queue', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const triageQueue = await getTriageQueue(req.tenantId!, req.query.status as string, Number(req.query.limit) || 50);
  res.json(ok(triageQueue, req));
}));

router.get('/triage/history', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const history = await getTriageHistory(req.tenantId!, req.query.itemId as string, Number(req.query.limit) || 50);
  res.json(ok(history, req));
}));

router.post('/triage', requirePermission('inbox.item.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await executeTriageAction({
    itemId: req.body.itemId,
    tenantId: req.tenantId!,
    userId,
    triageAction: req.body.triageAction,
    triageReason: req.body.reason,
    assignedTo: req.body.assignedTo,
    priority: req.body.priority,
    dueDate: req.body.dueDate,
    metadata: req.body.metadata,
  });
  setAuditData(res as any, { action: 'triage', entityType: 'inbox_item', entityId: req.body.itemId });
  res.json(ok(result, req));
}));

router.get('/state/statistics', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.query.userId as string || req.user?.userId;
  const stats = await getStateStatistics(req.tenantId!, userId);
  res.json(ok(stats, req));
}));

router.get('/state/history/:itemId', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const history = await getStateHistory(req.tenantId!, req.params.itemId, Number(req.query.limit) || 50);
  res.json(ok(history, req));
}));

router.post('/state/update', requirePermission('inbox.item.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await updateInboxState({
    itemId: req.body.itemId,
    tenantId: req.tenantId!,
    userId,
    status: req.body.status,
    priority: req.body.priority,
    assignedTo: req.body.assignedTo,
    dueDate: req.body.dueDate,
    metadata: req.body.metadata,
    reason: req.body.reason,
  });
  setAuditData(res as any, { action: 'state_update', entityType: 'inbox_item', entityId: req.body.itemId });
  res.json(ok(result, req));
}));

router.post('/workflow/transition', requirePermission('inbox.item.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const result = await executeInboxWorkflowAction({
    itemId: req.body.itemId,
    tenantId: req.tenantId!,
    userId,
    action: req.body.action,
    reason: req.body.reason,
    metadata: req.body.metadata,
  });
  setAuditData(res as any, { action: 'workflow_transition', entityType: 'inbox_item', entityId: req.body.itemId });
  res.json(ok(result, req));
}));

router.get('/:id', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getMessageById));
router.post('/', requirePermission('inbox.item.write'), validate({ body: createMessageBody }), asyncHandler(createMessage));
router.put('/:id', requirePermission('inbox.item.write'), requireOwnership('message'), validate({ body: updateMessageBody }), asyncHandler(updateMessage));
router.delete('/:id', requirePermission('inbox.item.delete'), requireOwnership('message'), validate({ body: genericPayloadSchema }), asyncHandler(deleteMessage));

router.post('/:id/read', requirePermission('inbox.item.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const userId = req.user!.userId!;
  await safeQuery(
    `UPDATE "${schema}".inbox_messages SET status = 'read', read_at = NOW(), "read" = true, updated_at = NOW() WHERE message_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  emitMessageRead(req.tenantId!, req.params.id, userId, userId);
  setAuditData(res as any, { action: 'read', entityType: 'inbox_message', entityId: req.params.id });
  res.json(action('Message marked as read', req));
}));

router.post('/:id/unread', requirePermission('inbox.item.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(
    `UPDATE "${schema}".inbox_messages SET status = 'unread', read_at = NULL, "read" = false, updated_at = NOW() WHERE message_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  res.json(action('Message marked as unread', req));
}));

router.post('/:id/action', requirePermission('inbox.item.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const userId = req.user!.userId!;
  await safeQuery(
    `UPDATE "${schema}".inbox_messages SET status = 'actioned', actioned_at = NOW(), updated_at = NOW() WHERE message_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  emitMessageActioned(req.tenantId!, req.params.id, userId, userId);
  setAuditData(res as any, { action: 'actioned', entityType: 'inbox_message', entityId: req.params.id });
  res.json(action('Message marked as actioned', req));
}));

router.post('/:id/star', requirePermission('inbox.item.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(`UPDATE "${schema}".inbox_messages SET starred = true, updated_at = NOW() WHERE message_id = $1`, [req.params.id]);
  res.json(action('Message starred', req));
}));

router.delete('/:id/star', requirePermission('inbox.item.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(`UPDATE "${schema}".inbox_messages SET starred = false, updated_at = NOW() WHERE message_id = $1`, [req.params.id]);
  res.json(action('Message unstarred', req));
}));

router.post('/:id/archive', requirePermission('inbox.item.write'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  await safeQuery(
    `UPDATE "${schema}".inbox_messages SET status = 'archived', updated_at = NOW() WHERE message_id = $1 AND deleted_at IS NULL`,
    [req.params.id],
  );
  setAuditData(res as any, { action: 'archive', entityType: 'inbox_message', entityId: req.params.id });
  res.json(action('Message archived', req));
}));

router.post('/bulk/read', requirePermission('inbox.item.bulk'), validate({ body: bulkReadBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const ids: string[] = req.body.ids || [];
  if (ids.length === 0) { res.json(action('No messages specified', req)); return; }
  const result = await safeQuery(
    `UPDATE "${schema}".inbox_messages SET status = 'read', read_at = NOW(), "read" = true, updated_at = NOW()
     WHERE message_id = ANY($1::uuid[]) AND deleted_at IS NULL AND status = 'unread'`, [ids],
  );
  const count = result.rowCount ?? 0;
  emitBulkRead(req.tenantId!, count, req.user!.userId!);
  res.json(action(`Marked ${count} messages as read`, req));
}));

router.post('/bulk/archive', requirePermission('inbox.item.bulk'), validate({ body: bulkArchiveBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const ids: string[] = req.body.ids || [];
  if (ids.length === 0) { res.json(action('No messages specified', req)); return; }
  const result = await safeQuery(
    `UPDATE "${schema}".inbox_messages SET status = 'archived', updated_at = NOW()
     WHERE message_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [ids],
  );
  const count = result.rowCount ?? 0;
  emitBulkArchived(req.tenantId!, count, req.user!.userId!);
  res.json(action(`Archived ${count} messages`, req));
}));

router.post('/bulk/delete', requirePermission('inbox.item.bulk'), validate({ body: bulkDeleteBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId!);
  const ids: string[] = req.body.ids || [];
  if (ids.length === 0) { res.json(action('No messages specified', req)); return; }
  const result = await safeQuery(
    `UPDATE "${schema}".inbox_messages SET deleted_at = NOW(), updated_at = NOW()
     WHERE message_id = ANY($1::uuid[]) AND deleted_at IS NULL`, [ids],
  );
  const count = result.rowCount ?? 0;
  res.json(action(`Deleted ${count} messages`, req));
}));

router.get('/dashboard', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const [stats, kpis, channelBreakdown, priorityDist, actionByModule] = await Promise.all([
    inboxQuery.getDashboardStats(req.tenantId!),
    inboxQuery.getKpiMetrics(req.tenantId!),
    inboxQuery.getChannelBreakdown(req.tenantId!),
    inboxQuery.getPriorityDistribution(req.tenantId!),
    inboxQuery.getActionRequiredByModule(req.tenantId!),
  ]);
  res.json(ok({ stats, kpis, channelBreakdown, priorityDist, actionByModule }, req));
}));

router.get('/trends', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const aging = await inboxQuery.getAgingReport(req.tenantId!);
  const readRate = await inboxQuery.getReadRateMetrics(req.tenantId!);
  const responseTime = await inboxQuery.getResponseTimeMetrics(req.tenantId!);
  const threadDepth = await inboxQuery.getThreadDepthStats(req.tenantId!);
  res.json(ok({ aging, readRate, responseTime, threadDepth }, req));
}));

router.get('/cross-module/:linkedModule', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await inboxQuery.getCrossModuleView(req.tenantId!, req.params.linkedModule);
  res.json(ok({ items: data, total: data.length }, req));
}));

router.get('/export', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await inboxQuery.getExportData(req.tenantId!, req.query as Record<string, string>);
  res.json(ok({ rows: data, total: data.length, exportedAt: new Date().toISOString() }, req));
}));

router.get('/sla-breaches', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const breaches = await inboxQuery.getSlaBreach(req.tenantId!);
  res.json(ok({ breaches, total: breaches.length }, req));
}));

router.get('/expiring', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const hours = Number(req.query.hours) || 24;
  const expiring = await inboxQuery.getExpiringMessages(req.tenantId!, hours);
  res.json(ok({ messages: expiring, total: expiring.length }, req));
}));

router.get('/unread-by-recipient', requirePermission('inbox.item.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 20;
  const data = await inboxQuery.getUnreadByRecipient(req.tenantId!, limit);
  res.json(ok({ recipients: data }, req));
}));

export default router;


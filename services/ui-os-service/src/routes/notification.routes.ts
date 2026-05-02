import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';
import { UiOsNotificationManager } from '../managers/ui-os-notification.manager.js';
import {
  NotificationCreateSchema, NotificationPreferenceSchema,
  InboxViewSchema, InboxRuleSchema, InboxSnoozeSchema, InboxAssignmentSchema,
} from '../schemas/notification.schemas.js';
import { requireFga } from '../middleware/openfga.js';

const UUID = /^[0-9a-fA-F-]{36}$/;
function ctx(req: Request, res: Response) {
  const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
  const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
  if (!tenantId || !userId) { res.status(400).json({ error: 'missing_identity' }); return null; }
  return { tenantId, userId };
}
function fail(res: Response, code: string, e: unknown) {
  const m = (e as Error).message;
  if (m.includes('duplicate key')) { res.status(409).json({ error: 'conflict' }); return; }
  if (m.includes('violates foreign key')) { res.status(400).json({ error: 'fk_violation', message: m }); return; }
  res.status(500).json({ error: code, message: m });
}

export function createNotificationRouter(pool: DbPool): Router {
  const router = Router();
  const m = new UiOsNotificationManager(pool);
  const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
  const fgaEditor = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'editor', object: `ui_os_tenant:${req.principal.tenantId}` } : null });

  // Inbox feed (notifications)
  router.get('/notifications/inbox', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ items: await m.listInbox(c.tenantId, c.userId, {
      unreadOnly: req.query.unread === 'true' ? true : null as any,
      category: (req.query.category as string | undefined) ?? null,
      limit: parseInt(String(req.query.limit ?? 100), 10),
    }) }); } catch (e) { fail(res, 'inbox_list_failed', e); }
  });
  router.get('/notifications/unread-count', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ count: await m.unreadCount(c.tenantId, c.userId) }); } catch (e) { fail(res, 'unread_count_failed', e); }
  });
  router.post('/notifications', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = NotificationCreateSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(201).json(await m.createNotification(c.tenantId, p.data)); } catch (e) { fail(res, 'notification_create_failed', e); }
  });
  router.post('/notifications/:notificationId/read', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.notificationId)) { res.status(400).json({ error: 'invalid_notification_id' }); return; }
    try { res.json(await m.markRead(c.tenantId, c.userId, req.params.notificationId)); } catch (e) { fail(res, 'mark_read_failed', e); }
  });
  router.post('/notifications/:notificationId/dismiss', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.notificationId)) { res.status(400).json({ error: 'invalid_notification_id' }); return; }
    try { res.json(await m.markDismissed(c.tenantId, c.userId, req.params.notificationId)); } catch (e) { fail(res, 'mark_dismissed_failed', e); }
  });

  // Notification preferences
  router.get('/notifications/preferences', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ preferences: await m.listPreferences(c.tenantId, c.userId) }); } catch (e) { fail(res, 'prefs_list_failed', e); }
  });
  router.put('/notifications/preferences', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = NotificationPreferenceSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertPreference(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'pref_upsert_failed', e); }
  });

  // Inbox views
  router.get('/inbox/views', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ views: await m.listViews(c.tenantId, c.userId) }); } catch (e) { fail(res, 'views_list_failed', e); }
  });
  router.put('/inbox/views', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = InboxViewSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertView(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'view_upsert_failed', e); }
  });
  router.delete('/inbox/views/:viewId', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.viewId)) { res.status(400).json({ error: 'invalid_view_id' }); return; }
    try {
      const ok = await m.deleteView(c.tenantId, c.userId, req.params.viewId);
      if (!ok) { res.status(404).json({ error: 'view_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'view_delete_failed', e); }
  });

  // Inbox rules
  router.get('/inbox/rules', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const scope = (req.query.scope as string | undefined) === 'tenant' ? null : c.userId;
    try { res.json({ rules: await m.listRules(c.tenantId, scope) }); } catch (e) { fail(res, 'rules_list_failed', e); }
  });
  router.put('/inbox/rules', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = InboxRuleSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertRule(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'rule_upsert_failed', e); }
  });
  router.delete('/inbox/rules/:ruleId', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.ruleId)) { res.status(400).json({ error: 'invalid_rule_id' }); return; }
    try {
      const ok = await m.deleteRule(c.tenantId, req.params.ruleId);
      if (!ok) { res.status(404).json({ error: 'rule_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'rule_delete_failed', e); }
  });

  // Inbox snoozes
  router.get('/inbox/snoozes', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ snoozes: await m.listSnoozes(c.tenantId, c.userId) }); } catch (e) { fail(res, 'snoozes_list_failed', e); }
  });
  router.put('/inbox/snoozes', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = InboxSnoozeSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertSnooze(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'snooze_upsert_failed', e); }
  });
  router.delete('/inbox/snoozes/:snoozeId', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.snoozeId)) { res.status(400).json({ error: 'invalid_snooze_id' }); return; }
    try {
      const ok = await m.deleteSnooze(c.tenantId, c.userId, req.params.snoozeId);
      if (!ok) { res.status(404).json({ error: 'snooze_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'snooze_delete_failed', e); }
  });

  // Inbox assignments
  router.get('/inbox/assignments', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ assignments: await m.listAssignments(c.tenantId, c.userId) }); } catch (e) { fail(res, 'assignments_list_failed', e); }
  });
  router.post('/inbox/assignments', fgaEditor, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = InboxAssignmentSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(201).json(await m.createAssignment(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'assignment_create_failed', e); }
  });
  router.post('/inbox/assignments/:assignmentId/acknowledge', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.assignmentId)) { res.status(400).json({ error: 'invalid_assignment_id' }); return; }
    try {
      const out = await m.acknowledgeAssignment(c.tenantId, c.userId, req.params.assignmentId);
      if (!out) { res.status(404).json({ error: 'assignment_not_found' }); return; }
      res.json(out);
    } catch (e) { fail(res, 'ack_failed', e); }
  });

  return router;
}

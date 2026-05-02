/**
 * Submission-Packets REST router (W54) — sub-router on `/api/compliance`.
 *
 *   GET    /submission-packets             list (regulatorCode, frameworkCode, status, search)
 *   GET    /submission-packets/:id         single
 *   POST   /submission-packets             create
 *   PATCH  /submission-packets/:id/status  status transition (auto-stamps submitted_at/by + accepted_at)
 *   DELETE /submission-packets/:id         remove
 */
import { Router, type Router as ExpressRouter, type Request, type Response } from 'express';
import type { DbClient } from '../../db/runner';
import {
  listSubmissionPackets, getSubmissionPacket,
  createSubmissionPacket, updateSubmissionPacketStatus, deleteSubmissionPacket,
  type PacketStatus,
} from '../../application/submission-packets/submission-packets.service';
import { getAuditPort } from '../../ports/audit.port';
import { incCounter } from '../../application/observability/metrics';

export interface SubmissionPacketsRouterContext {
  tenantId: string;
  userId: string;
  tenantSchema: string;
  hasPermission?: (key: string) => boolean | Promise<boolean>;
}

export interface SubmissionPacketsRouterDeps {
  client: DbClient;
  resolveContext: (req: Request) => SubmissionPacketsRouterContext | Promise<SubmissionPacketsRouterContext>;
}

const fail = (res: Response, status: number, code: string, message: string) =>
  res.status(status).json({ error: { code, message } });

const requirePerm = async (
  ctx: SubmissionPacketsRouterContext, key: string, res: Response,
): Promise<boolean> => {
  if (!ctx.hasPermission) return true;
  const ok = await ctx.hasPermission(key);
  if (!ok) { fail(res, 403, 'forbidden', `missing permission: ${key}`); return false; }
  return true;
};

export function createSubmissionPacketsRouter(deps: SubmissionPacketsRouterDeps): ExpressRouter {
  const router = Router();

  router.use((req, _res, next) => {
    incCounter('compliance_submission_packets_requests_total', 1, { method: req.method });
    next();
  });

  router.get('/submission-packets', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'submission_packet.packet.read', res))) return;
    try {
      const out = await listSubmissionPackets(deps.client, {
        tenantSchema: ctx.tenantSchema,
        regulatorCode: typeof req.query.regulatorCode === 'string' ? req.query.regulatorCode : undefined,
        frameworkCode: typeof req.query.frameworkCode === 'string' ? req.query.frameworkCode : undefined,
        status: typeof req.query.status === 'string' ? req.query.status as PacketStatus : undefined,
        search: typeof req.query.search === 'string' ? req.query.search : undefined,
        limit: req.query.limit ? Number(req.query.limit) : undefined,
        offset: req.query.offset ? Number(req.query.offset) : undefined,
      });
      res.json({ data: out.rows, meta: { total: out.total } });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'list_failed', String(err.message));
    }
  });

  router.get('/submission-packets/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'submission_packet.packet.read', res))) return;
    try {
      const row = await getSubmissionPacket(deps.client, {
        tenantSchema: ctx.tenantSchema, packetId: req.params.id,
      });
      if (!row) return fail(res, 404, 'not_found', `packet ${req.params.id} not found`);
      res.json({ data: row });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'get_failed', String(err.message));
    }
  });

  router.post('/submission-packets', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'submission_packet.packet.write', res))) return;
    try {
      const created = await createSubmissionPacket(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        regulatorCode: typeof req.body?.regulatorCode === 'string' ? req.body.regulatorCode : '',
        frameworkCode: typeof req.body?.frameworkCode === 'string' ? req.body.frameworkCode : '',
        title: typeof req.body?.title === 'string' ? req.body.title : '',
        summary: typeof req.body?.summary === 'string' ? req.body.summary : undefined,
        periodStart: typeof req.body?.periodStart === 'string' ? req.body.periodStart : undefined,
        periodEnd: typeof req.body?.periodEnd === 'string' ? req.body.periodEnd : undefined,
        status: typeof req.body?.status === 'string' ? req.body.status as PacketStatus : undefined,
      });
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'submission_packet.create',
          resourceType: 'submission_packet', resourceId: created.packetId,
          after: {
            regulatorCode: created.regulatorCode, frameworkCode: created.frameworkCode,
            status: created.status,
          },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(201).json({ data: created });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_input') return fail(res, 400, 'bad_input', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'create_failed', String(err.message));
    }
  });

  router.patch('/submission-packets/:id/status', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'submission_packet.packet.write', res))) return;
    try {
      const before = await getSubmissionPacket(deps.client, {
        tenantSchema: ctx.tenantSchema, packetId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `packet ${req.params.id} not found`);
      const updated = await updateSubmissionPacketStatus(deps.client, {
        tenantSchema: ctx.tenantSchema, actorId: ctx.userId,
        packetId: req.params.id,
        status: typeof req.body?.status === 'string' ? req.body.status as PacketStatus : '' as PacketStatus,
        rejectionReason: typeof req.body?.rejectionReason === 'string' ? req.body.rejectionReason : undefined,
      });
      if (!updated) return fail(res, 404, 'not_found', `packet ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'submission_packet.status',
          resourceType: 'submission_packet', resourceId: updated.packetId,
          before: { status: before.status }, after: { status: updated.status },
        });
      } catch { /* audit unbound is acceptable */ }
      res.json({ data: updated });
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      if (err.code === 'bad_status') return fail(res, 400, 'bad_status', err.message);
      return fail(res, 500, 'status_failed', String(err.message));
    }
  });

  router.delete('/submission-packets/:id', async (req, res) => {
    let ctx; try { ctx = await deps.resolveContext(req); }
    catch (e) { return fail(res, 401, 'no_context', String((e as Error).message)); }
    if (!(await requirePerm(ctx, 'submission_packet.packet.write', res))) return;
    try {
      const before = await getSubmissionPacket(deps.client, {
        tenantSchema: ctx.tenantSchema, packetId: req.params.id,
      });
      if (!before) return fail(res, 404, 'not_found', `packet ${req.params.id} not found`);
      const removed = await deleteSubmissionPacket(deps.client, {
        tenantSchema: ctx.tenantSchema, packetId: req.params.id,
      });
      if (!removed) return fail(res, 404, 'not_found', `packet ${req.params.id} not found`);
      try {
        await getAuditPort().write({
          tenantId: ctx.tenantId, actorId: ctx.userId,
          module: 'compliance', action: 'submission_packet.delete',
          resourceType: 'submission_packet', resourceId: removed.packetId,
          before: { regulatorCode: before.regulatorCode, frameworkCode: before.frameworkCode },
        });
      } catch { /* audit unbound is acceptable */ }
      res.status(204).end();
    } catch (e) {
      const err = e as Error & { code?: string };
      if (err.code === 'bad_schema') return fail(res, 400, 'bad_schema', err.message);
      return fail(res, 500, 'delete_failed', String(err.message));
    }
  });

  return router;
}

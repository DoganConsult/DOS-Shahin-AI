import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../ports/auth.port';
import { asyncHandler, validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import { emitAudit } from '../../ports/soc.port';
import {
  listBoardPacks, getBoardPackById, createBoardPack, updateBoardPack,
  addBoardPackItem, removeBoardPackItem, assembleBoardPack,
  approveBoardPack, publishBoardPack,
} from '../../services/governance/governance-board-packs.service';
import {
  generateBoardReport, renderBoardReportHtml,
} from '../../services/board/board-report-export.service';
import { emitEvent } from '../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { swallow, EC } from '@dos/platform-core/resilience';
import { createBoardPackBody, updateBoardPackBody, addBoardPackItemBody, generateReportBody, createAssembleBody, createAutoAssembleBody, createApproveBody, createPublishBody, exportExportBody } from "../../schemas/governance.schemas";
import { genericGovernanceSchema } from "../../schemas/governance.schemas";

const router = Router();
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await listBoardPacks(req.tenantId);
  res.json({ packs: rows, count: rows.length });
}));

router.get('/:id', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const pack = await getBoardPackById(req.tenantId, req.params.id);
  res.json(pack);
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: createBoardPackBody }), asyncHandler(async (req, res) => {
  const result = await createBoardPack(req.tenantId, {
    ...req.body,
    created_by: req.user?.userId,
  });

  setAuditData(res as any, { action: 'create', entityType: 'governance_board_pack', entityId: result?.pack_id, afterState: result });

  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_board_pack', entityId: result?.pack_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_board_pack.created' });
  res.status(201).json(result);
}));

router.put('/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateBoardPackBody }), asyncHandler(async (req, res) => {
  const result = await updateBoardPack(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: 'update', entityType: 'governance_board_pack', entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_board_pack', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_board_pack.updated' });
  res.json(result);
}));

router.post('/:id/assemble', authenticate, requirePermission('governance.record.write'), validate({ body: createAssembleBody }), asyncHandler(async (req, res) => {
  const result = await assembleBoardPack(req.tenantId, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'governance_board_pack', entityId: req.params.id, afterState: { assembled: true } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_board_pack', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_board_pack.updated' });

  res.json({ assembled: true, items: result.items || [], count: result.items?.length || 0 });
}));

router.post('/:id/auto-assemble', authenticate, requirePermission('governance.record.write'), validate({ body: createAutoAssembleBody }), asyncHandler(async (req, res) => {
  const result = await assembleBoardPack(req.tenantId, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'governance_board_pack', entityId: req.params.id, afterState: { assembled: true } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_board_pack', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_board_pack.updated' });

  res.json({ assembled: true, items: result.items || [], count: result.items?.length || 0 });
}));

router.post('/:id/items', authenticate, requirePermission('governance.record.write'), validate({ body: addBoardPackItemBody }), asyncHandler(async (req, res) => {
  const result = await addBoardPackItem(req.tenantId, req.params.id, req.body);

  setAuditData(res as any, { action: 'create', entityType: 'governance_board_pack_item', entityId: result?.item_id, afterState: result });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_board_pack_item', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_board_pack_item.created' });
  res.status(201).json(result);
}));

router.delete('/:id/items/:itemId', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const deleted = await removeBoardPackItem(req.tenantId, req.params.itemId);
  if (!deleted) return res.status(404).json({ error: 'Item not found' });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_board_pack_item', entityId: req.params.itemId });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_board_pack_item', entityId: req.params.itemId || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_board_pack_item.deleted' });
  res.json({ deleted: true });
}));

router.post('/:id/approve', authenticate, requirePermission('governance.record.write'), validate({ body: createApproveBody }), asyncHandler(async (req, res) => {
  const result = await approveBoardPack(req.tenantId, req.params.id, req.user?.userId);
  setAuditData(res as any, { action: 'update', entityType: 'governance_board_pack', entityId: req.params.id, afterState: { status: 'approved' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'approved', entityType: 'governance_board_pack', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_board_pack.approved' });
  res.json(result);
}));

router.post('/:id/publish', authenticate, requirePermission('governance.record.write'), validate({ body: createPublishBody }), asyncHandler(async (req, res) => {
  const result = await publishBoardPack(req.tenantId, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'governance_board_pack', entityId: req.params.id, afterState: { status: 'published' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'published', entityType: 'governance_board_pack', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_board_pack.published' });
  // Mirror to DSOC: publishing a board pack changes governance posture
  // (config_change with medium severity — boards can review).
  void emitAudit({
    tenantId: req.tenantId!,
    category: 'config_change',
    severity: 'medium',
    actor: { type: 'user', id: req.user!.userId! },
    action: 'governance.board_pack.published',
    resource: { type: 'governance_board_pack', id: req.params.id || '' },
    outcome: 'success',
    occurredAt: new Date().toISOString(),
  }).catch(() => { /* swallow — audit must not block publish */ });
  res.json(result);
}));

// ═══ Board Report Export ═══

/** Export a board pack as an HTML report (for PDF conversion) */
router.post('/:id/export', authenticate, requirePermission('governance.record.read'), validate({ body: exportExportBody }), asyncHandler(async (req, res) => {
  const pack = await getBoardPackById(req.tenantId, req.params.id);
  if (!pack) return res.status(404).json({ error: 'Board pack not found' });

  const reportData = await generateBoardReport(req.tenantId, {

    period_start: pack.period_start || new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10),

    period_end: pack.period_end || new Date().toISOString().slice(0, 10),

    pack_type: pack.pack_type,
    userId: req.user!.userId!,
  });

  const html = renderBoardReportHtml(reportData);
  setAuditData(res as any, { action: 'export', entityType: 'governance_board_pack', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'exported', entityType: 'governance_board_pack', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_board_pack.exported' });
  res.json({ report: reportData, html });
}));

// ═══ Ad-hoc Board Report Generation ═══

/** Generate an ad-hoc board report with custom period (not tied to a pack) */
router.post('/report/generate', authenticate, requirePermission('governance.record.manage'), validate({ body: generateReportBody }), asyncHandler(async (req, res) => {
  const { period_start, period_end, pack_type } = req.body;
  const reportData = await generateBoardReport(req.tenantId, {
    period_start,
    period_end,
    pack_type,
    userId: req.user!.userId!,
  });

  const html = renderBoardReportHtml(reportData);
  setAuditData(res as any, { action: 'generate', entityType: 'board_report', entityId: 'adhoc' });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'generated', entityType: 'board_report', entityId: 'adhoc' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.board_report.generated' });
  res.json({ report: reportData, html });
}));

export default router;


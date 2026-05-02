import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
import { Request, Router, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { ok, action } from '@dos/module-sdk';
import { auditMiddleware, asyncHandler, requireOwnership, validate, setAuditData } from '../ports/middleware.port';

const genericPayloadSchema = z.record(z.unknown());

import {
  listPortals,
  getPortalById,
  createPortal,
  updatePortal,
  deletePortal,
} from '../controllers/portals.controller';
import * as portalsQuery from '../repositories/portals-query.repo';
import { provisionPortal, activatePortal, deactivatePortal, updatePortalTheme, mapCustomDomain } from '../services/portals-provisioning.service';
import { issuePortalToken, revokeToken, getAccessLogs } from '../services/portals-access.service';
import { createPage, publishPage, updatePageContent, getPortalPages, getPortalWidgets, addWidget } from '../services/portals-content.service';
import { emitPortalsEvent as _emitPortalsEvent } from '../services/portals-event.service';
import { createPortalBody, updatePortalBody, listPortalsQuery, createProvisionBody, createActivateBody, createDeactivateBody, updateThemeBody, updateDomainBody, createTokensBody, createPagesBody, updateContentBody, createPublishBody, createWidgetsBody, bulkActivateBody, bulkDeactivateBody } from '../schemas/portals.schemas';
const router = Router();
router.use(authenticate);
router.use(auditMiddleware('portals'));

router.get('/', requirePermission('portals.record.read'), validate({ query: listPortalsQuery }), asyncHandler(listPortals));

router.get('/search', requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await portalsQuery.searchEntities(req.tenantId!, {
    query: req.query.q as string,
    status: req.query.status as string,
    portalType: req.query.portalType as string,
    page: Number(req.query.page) || 1,
    pageSize: Number(req.query.pageSize) || 20,
    sortBy: req.query.sortBy as string,
    sortDir: req.query.sortDir as 'ASC' | 'DESC',
  });
  res.json(ok(result, req));
}));

router.get('/dashboard', requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const [stats, kpis, typeBreakdown] = await Promise.all([
    portalsQuery.getDashboardStats(req.tenantId!),
    portalsQuery.getKpiMetrics(req.tenantId!),
    portalsQuery.getPortalTypeBreakdown(req.tenantId!),
  ]);
  res.json(ok({ stats, kpis, typeBreakdown }, req));
}));

router.get('/:id', requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(getPortalById));

router.post('/', requirePermission('portals.record.write'), validate({ body: createPortalBody }), asyncHandler(createPortal));

router.put('/:id', requirePermission('portals.record.write'), requireOwnership('portal'), validate({ body: updatePortalBody }), asyncHandler(updatePortal));

router.delete('/:id', requirePermission('portals.record.delete'), requireOwnership('portal'), validate({ body: genericPayloadSchema }), asyncHandler(deletePortal));

router.post('/provision', requirePermission('portals.record.write'), validate({ body: createProvisionBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const portal = await provisionPortal(req.tenantId!, { ...req.body, createdBy: userId });
  setAuditData(res as any, { action: 'provision', entityType: 'portal', entityId: portal.id });
  res.status(201).json(ok(portal, req));
}));

router.post('/:id/activate', requirePermission('portals.record.approve'), requireOwnership('portal'), validate({ body: createActivateBody }), asyncHandler(async (req: Request, res: Response) => {
  const portal = await activatePortal(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'activate', entityType: 'portal', entityId: req.params.id });
  res.json(ok(portal, req));
}));

router.post('/:id/deactivate', requirePermission('portals.record.approve'), requireOwnership('portal'), validate({ body: createDeactivateBody }), asyncHandler(async (req: Request, res: Response) => {
  const portal = await deactivatePortal(req.tenantId!, req.params.id);
  setAuditData(res as any, { action: 'deactivate', entityType: 'portal', entityId: req.params.id });
  res.json(ok(portal, req));
}));

router.put('/:id/theme', requirePermission('portals.record.write'), requireOwnership('portal'), validate({ body: updateThemeBody }), asyncHandler(async (req: Request, res: Response) => {
  const portal = await updatePortalTheme(req.tenantId!, req.params.id, req.body);
  res.json(ok(portal, req));
}));

router.put('/:id/domain', requirePermission('portals.record.configure'), requireOwnership('portal'), validate({ body: updateDomainBody }), asyncHandler(async (req: Request, res: Response) => {
  const portal = await mapCustomDomain(req.tenantId!, req.params.id, req.body.domain);
  setAuditData(res as any, { action: 'map_domain', entityType: 'portal', entityId: req.params.id });
  res.json(ok(portal, req));
}));

router.post('/:id/tokens', requirePermission('portals.record.write'), requireOwnership('portal'), validate({ body: createTokensBody }), asyncHandler(async (req: Request, res: Response) => {
  const result = await issuePortalToken(req.tenantId!, { portalId: req.params.id, ...req.body });
  setAuditData(res as any, { action: 'issue_token', entityType: 'portal_token', entityId: result.token.tokenId });
  res.status(201).json(ok({ token: result.token, rawToken: result.rawToken }, req));
}));

router.delete('/:id/tokens/:tokenId', requirePermission('portals.record.write'), requireOwnership('portal'), validate({ body: genericPayloadSchema }), asyncHandler(async (req: Request, res: Response) => {
  await revokeToken(req.tenantId!, req.params.tokenId);
  setAuditData(res as any, { action: 'revoke_token', entityType: 'portal_token', entityId: req.params.tokenId });
  res.json(action('Token revoked', req));
}));

router.get('/:id/access-logs', requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const limit = Number(req.query.limit) || 100;
  const logs = await getAccessLogs(req.tenantId!, req.params.id, limit);
  res.json(ok({ logs, total: logs.length }, req));
}));

router.get('/:id/pages', requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const pages = await getPortalPages(req.tenantId!, req.params.id);
  res.json(ok({ pages, total: pages.length }, req));
}));

router.post('/:id/pages', requirePermission('portals.record.write'), requireOwnership('portal'), validate({ body: createPagesBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId!;
  const page = await createPage(req.tenantId!, { portalId: req.params.id, ...req.body, createdBy: userId });
  setAuditData(res as any, { action: 'create_page', entityType: 'portal_page', entityId: page.pageId });
  res.status(201).json(ok(page, req));
}));

router.put('/:id/pages/:pageId/content', requirePermission('portals.record.write'), requireOwnership('portal'), validate({ body: updateContentBody }), asyncHandler(async (req: Request, res: Response) => {
  const page = await updatePageContent(req.tenantId!, req.params.pageId, req.body);
  res.json(ok(page, req));
}));

router.post('/:id/pages/:pageId/publish', requirePermission('portals.record.approve'), requireOwnership('portal'), validate({ body: createPublishBody }), asyncHandler(async (req: Request, res: Response) => {
  const page = await publishPage(req.tenantId!, req.params.pageId);
  setAuditData(res as any, { action: 'publish_page', entityType: 'portal_page', entityId: req.params.pageId });
  res.json(ok(page, req));
}));

router.get('/:id/widgets', requirePermission('portals.record.read'), requireOwnership('portal'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const widgets = await getPortalWidgets(req.tenantId!, req.params.id);
  res.json(ok({ widgets, total: widgets.length }, req));
}));

router.post('/:id/widgets', requirePermission('portals.record.write'), requireOwnership('portal'), validate({ body: createWidgetsBody }), asyncHandler(async (req: Request, res: Response) => {
  const widget = await addWidget(req.tenantId!, { portalId: req.params.id, ...req.body });
  res.status(201).json(ok(widget, req));
}));

router.get('/trends', requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const aging = await portalsQuery.getAgingReport(req.tenantId!);
  const accessStats = await portalsQuery.getAccessStats(req.tenantId!);
  const expiredTokens = await portalsQuery.getExpiredTokens(req.tenantId!);
  res.json(ok({ aging, accessStats, expiredTokens }, req));
}));

router.get('/cross-module/:linkedModule', requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await portalsQuery.getCrossModuleView(req.tenantId!, req.params.linkedModule);
  res.json(ok({ items: data, total: data.length }, req));
}));

router.get('/export', requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const data = await portalsQuery.getExportData(req.tenantId!, req.query as Record<string, string>);
  res.json(ok({ rows: data, total: data.length, exportedAt: new Date().toISOString() }, req));
}));

router.get('/active-sessions', requirePermission('portals.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const sessions = await portalsQuery.getActiveSessions(req.tenantId!);
  res.json(ok({ sessions, total: sessions.length }, req));
}));

router.post('/bulk/activate', requirePermission('portals.record.bulk'), validate({ body: bulkActivateBody }), asyncHandler(async (req: Request, res: Response) => {
  const ids: string[] = req.body.ids || [];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const id of ids) {
    try {
      await activatePortal(req.tenantId!, id);
      results.push({ id, success: true });
    } catch (e: unknown) {

      results.push({ id, success: false, error: e.message });
    }
  }
  res.json(ok({ results, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length }, req));
}));

router.post('/bulk/deactivate', requirePermission('portals.record.bulk'), validate({ body: bulkDeactivateBody }), asyncHandler(async (req: Request, res: Response) => {
  const ids: string[] = req.body.ids || [];
  const results: Array<{ id: string; success: boolean; error?: string }> = [];
  for (const id of ids) {
    try {
      await deactivatePortal(req.tenantId!, id);
      results.push({ id, success: true });
    } catch (e: unknown) {

      results.push({ id, success: false, error: e.message });
    }
  }
  res.json(ok({ results, succeeded: results.filter(r => r.success).length, failed: results.filter(r => !r.success).length }, req));
}));

export default router;


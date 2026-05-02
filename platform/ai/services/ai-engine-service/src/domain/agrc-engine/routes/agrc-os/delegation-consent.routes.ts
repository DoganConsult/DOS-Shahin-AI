// @ts-nocheck
import { Request, Response, Router } from 'express';
import { z as _z } from 'zod';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';
// AGRC-OS — Delegation Rules & PDPL Consent routes
// Covers: delegation rules CRUD, consent grant/revoke/forget/log


import { authenticate, requirePermission } from '../../ports/auth.port';
import { validate, auditMiddleware, setAuditData } from '../../ports/middleware.port';
import { errMsg } from '../../../../i18n/error-messages';
import { emitEvent } from '../../ports/events.port';
import { writeLimiter } from './shared';
import { updateDelegationRulesBody, createGrantBody, createRevokeBody, createForgetBody } from '../../schemas/agrc-engine.schemas';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware('agrc-engine'));

// ════════════════════════════════════════════════════════════════
// Delegation Rules — per-user per-agent action control
// ════════════════════════════════════════════════════════════════

router.get('/delegation-rules/:userId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('delegation.chain.read'), async (req: Request, res: Response) => {
  try {
    const { getDelegationRules } = await import('../../../governance/services/misc/delegation-rules.service');
    const rules = await getDelegationRules(req.tenantId, req.params.userId);
    res.json({ rules, count: rules.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

router.put('/delegation-rules/:userId', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: updateDelegationRulesBody }), async (req: Request, res: Response) => {
  try {
    const { upsertDelegationRule } = await import('../../../governance/services/misc/delegation-rules.service');
    const ruleId = await upsertDelegationRule(req.tenantId, req.params.userId, req.body);
    setAuditData(res as any, { action: 'update', entityType: 'delegation_rule', entityId: ruleId || '' });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ ruleId });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

router.delete('/delegation-rules/:userId/:ruleId', validate({ body: genericPayloadSchema }), authenticate, requirePermission('delegation.chain.manage'), writeLimiter, async (req: Request, res: Response) => {
  try {
    const { deleteDelegationRule } = await import('../../../governance/services/misc/delegation-rules.service');
    const deleted = await deleteDelegationRule(req.tenantId, req.params.ruleId);
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'deleted', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ deleted });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

// ════════════════════════════════════════════════════════════════
// PDPL Consent — grant, revoke, right-to-forget
// ════════════════════════════════════════════════════════════════

router.get('/consent/:userId', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('delegation.chain.read'), async (req: Request, res: Response) => {
  try {

    const { getConsentStatus } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const status = await getConsentStatus(req.tenantId, req.params.userId);
    res.json(status);
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

router.post('/consent/:userId/grant', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: createGrantBody }), async (req: Request, res: Response) => {
  try {

    const { grantConsent } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const purpose = req.body.purpose || 'GRC agent assistance and memory-based learning';
    const ok = await grantConsent(req.tenantId, req.params.userId, purpose, req.user!.userId);
    setAuditData(res as any, { action: 'update', entityType: 'consent', entityId: req.params.userId, afterState: { granted: true, purpose } });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ granted: ok });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

router.post('/consent/:userId/revoke', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: createRevokeBody }), async (req: Request, res: Response) => {
  try {

    const { revokeConsent } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const ok = await revokeConsent(req.tenantId, req.params.userId, req.user!.userId);
    setAuditData(res as any, { action: 'update', entityType: 'consent', entityId: req.params.userId, afterState: { granted: false } });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json({ revoked: ok });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

router.post('/consent/:userId/forget', authenticate, requirePermission('delegation.chain.manage'), writeLimiter, validate({ body: createForgetBody }), async (req: Request, res: Response) => {
  try {

    const { rightToForget } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const result = await rightToForget(req.tenantId, req.params.userId, req.user!.userId);
    setAuditData(res as any, { action: 'delete', entityType: 'user_memory', entityId: req.params.userId, afterState: result });
    emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'agrc_os', entityId: req.params.id || '' } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    res.json(result);
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

router.get('/consent/:userId/log', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('delegation.chain.read'), async (req: Request, res: Response) => {
  try {

    const { getConsentLog } = await import('@dos/platform-core/security/services/pdpl-consent.service');
    const log = await getConsentLog(req.tenantId, req.params.userId);
    res.json({ log, count: log.length });
  } catch (_err: unknown) { res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) }); }
});

export default router;


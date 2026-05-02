import { Request, Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience/resilient-catch';
import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import {
  registerModelProvenance,
  trackDataLineage,
  getProvenanceById,
  getLineageById,
  generateAiBom,
  assessSupplyChainRisk,
  checkDataSovereignty,
  registerProvider,
  listProviders,
  getProviderById,
  updateProviderCompliance,
  createSupplierAgreement,
  listSupplierAgreements,
  getAgreementById,
  updateAgreementStatus,
  checkExpiringAgreements,
  recordModelModification,
  listModelModifications,
  getModificationById,
  getSubstantialModifications,
} from '../../services/ai/risk/ai-supply-chain.service';
import { emitAiGovernanceEvent } from '../../services/ai/operations/ai-governance-event.service';
import { validate, asyncHandler, auditMiddleware, setAuditData, automationMiddleware, moduleStack } from '../../ports/middleware.port';
import { provenanceBody, lineageBody, providerBody, agreementBody, agreementStatusBody, modificationBody, updateComplianceBody } from "../../schemas/ai-governance.schemas";
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai-governance'));
router.use(auditMiddleware('ai-governance'));
router.use(automationMiddleware('ai-governance'));

router.get('/vendors', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const agreements = await listSupplierAgreements(req.tenantId);
  res.json({ success: true, data: agreements, total: agreements.length });
}));

router.post('/agreements', authenticate, requirePermission('ai.governance.write'), validate({ body: agreementBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await createSupplierAgreement(req.tenantId, { ...req.body, created_by: userId });
  setAuditData(res as any, { action: 'create', entityType: 'ai_supplier_agreement', entityId: result.id });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'ai_policy', entityId: result.id, action: 'created', triggeredBy: userId, data: { agreement_type: req.body.agreement_type } });
  res.status(201).json({ success: true, data: result });
}));

router.get('/agreements/:agreementId', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const agreement = await getAgreementById(req.tenantId, req.params.agreementId);
  if (!agreement) { res.status(404).json({ success: false, error: 'Agreement not found' }); return; }
  res.json({ success: true, data: agreement });
}));

router.patch('/agreements/:agreementId/status', authenticate, requirePermission('ai.governance.write'), validate({ body: agreementStatusBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await updateAgreementStatus(req.tenantId, req.params.agreementId, req.body.status);
  setAuditData(res as any, { action: 'status_change', entityType: 'ai_supplier_agreement', entityId: req.params.agreementId, afterState: { status: req.body.status } });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'ai_policy', entityId: req.params.agreementId, action: 'status_changed', triggeredBy: userId, data: { status: req.body.status } });
  res.json({ success: true, data: result });
}));

router.get('/agreements/expiring', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const days = Math.min(365, parseInt(req.query.days as string, 10) || 30);
  const result = await checkExpiringAgreements(req.tenantId, days);
  res.json({ success: true, data: result, total: result.length });
}));

router.get('/providers', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const providers = await listProviders(req.tenantId);
  res.json({ success: true, data: providers, total: providers.length });
}));

router.post('/providers', authenticate, requirePermission('ai.governance.write'), validate({ body: providerBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await registerProvider(req.tenantId, { ...req.body, created_by: userId });
  setAuditData(res as any, { action: 'create', entityType: 'ai_provider', entityId: result.id });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'ai_policy', entityId: result.id, action: 'created', triggeredBy: userId, data: { provider_name: req.body.provider_name } });
  res.status(201).json({ success: true, data: result });
}));

router.get('/providers/:providerId', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const provider = await getProviderById(req.tenantId, req.params.providerId);
  if (!provider) { res.status(404).json({ success: false, error: 'Provider not found' }); return; }
  res.json({ success: true, data: provider });
}));

router.patch('/providers/:providerId/compliance', authenticate, requirePermission('ai.governance.write'), validate({ body: updateComplianceBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await updateProviderCompliance(req.tenantId, req.params.providerId, req.body);
  setAuditData(res as any, { action: 'update_compliance', entityType: 'ai_provider', entityId: req.params.providerId });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'ai_policy', entityId: req.params.providerId, action: 'updated', triggeredBy: userId, data: { action: 'compliance_update' } });
  res.json({ success: true, data: result });
}));

router.post('/provenance', authenticate, requirePermission('ai.governance.write'), validate({ body: provenanceBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await registerModelProvenance(req.tenantId, { ...req.body, created_by: userId });
  setAuditData(res as any, { action: 'create', entityType: 'ai_model_provenance', entityId: result.id });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'model_registry', entityId: result.id, action: 'created', triggeredBy: userId, data: { model_name: req.body.model_name } });
  res.status(201).json({ success: true, data: result });
}));

router.get('/provenance/:provenanceId', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getProvenanceById(req.tenantId, req.params.provenanceId);
  if (!result) { res.status(404).json({ success: false, error: 'Provenance record not found' }); return; }
  res.json({ success: true, data: result });
}));

router.post('/lineage', authenticate, requirePermission('ai.governance.write'), validate({ body: lineageBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await trackDataLineage(req.tenantId, req.body);
  setAuditData(res as any, { action: 'create', entityType: 'ai_data_lineage', entityId: result.id });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'model_registry', entityId: result.id, action: 'created', triggeredBy: userId, data: { dataset_name: req.body.dataset_name } });
  res.status(201).json({ success: true, data: result });
}));

router.get('/lineage/:lineageId', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getLineageById(req.tenantId, req.params.lineageId);
  if (!result) { res.status(404).json({ success: false, error: 'Lineage record not found' }); return; }
  res.json({ success: true, data: result });
}));

router.get('/:systemId/aibom', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const bom = await generateAiBom(req.tenantId, req.params.systemId);
  res.json({ success: true, data: bom });
}));

router.get('/:systemId/risk-assessment', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const assessment = await assessSupplyChainRisk(req.tenantId, req.params.systemId);
  res.json({ success: true, data: assessment });
}));

router.get('/:systemId/data-sovereignty', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await checkDataSovereignty(req.tenantId, req.params.systemId);
  res.json({ success: true, data: result });
}));

router.post('/modifications', authenticate, requirePermission('ai.governance.write'), validate({ body: modificationBody }), asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user!.userId;
  const result = await recordModelModification(req.tenantId, { ...req.body, approved_by: userId });
  setAuditData(res as any, { action: 'create', entityType: 'ai_model_modification', entityId: result.id, afterState: { modification_type: req.body.modification_type, is_substantial: req.body.is_substantial } });
  emitAiGovernanceEvent({ tenantId: req.tenantId, entityType: 'model_registry', entityId: result.id, action: 'updated', triggeredBy: userId, data: { modification_type: req.body.modification_type, is_substantial: req.body.is_substantial } });
  res.status(201).json({ success: true, data: result });
}));

router.get('/modifications', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const filters: Record<string, unknown> = {};
  if (req.query.provenance_id) filters.provenance_id = req.query.provenance_id;
  if (req.query.system_id) filters.system_id = req.query.system_id;
  if (req.query.is_substantial !== undefined) filters.is_substantial = req.query.is_substantial === 'true';
  const modifications = await listModelModifications(req.tenantId, filters);
  res.json({ success: true, data: modifications, total: modifications.length });
}));

router.get('/modifications/:modificationId', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const result = await getModificationById(req.tenantId, req.params.modificationId);
  if (!result) { res.status(404).json({ success: false, error: 'Modification record not found' }); return; }
  res.json({ success: true, data: result });
}));

router.get('/:systemId/substantial-modifications', authenticate, requirePermission('ai.governance.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const modifications = await getSubstantialModifications(req.tenantId, req.params.systemId);
  res.json({ success: true, data: modifications, total: modifications.length });
}));

export default router;

let genericPayloadSchema = z.record(z.unknown());

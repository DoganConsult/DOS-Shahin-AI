import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { errMsg } from '../../../../i18n/error-messages';
import { emitEvent } from '../../ports/events.port';
import { enforceStatusTransition } from '../../ports/platform.port';
import { getFirstRow } from '@dos/db';

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';
import { nameSchema, legalEntityUpdateSchema, createDomainBody, updateDomainBody, createBodyBody, updateBodyBody, createReportingLineBody, createLegalEntitiesBody, updateLegalEntitiesBody } from "../../schemas/governance.schemas";
import { genericGovernanceSchema } from "../../schemas/governance.schemas";

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware('governance-structure'));
const legalEntityCreateSchema = nameSchema.extend({
  entity_type: z.string().max(100).optional().nullable(),
  registration_no: z.string().max(200).optional().nullable(),
  country: z.string().max(100).optional().nullable(),
  description: z.string().max(5000).optional().nullable(),
});
const uuidParam = z.string().uuid();
router.get('/domains', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `SELECT domain_id, tenant_id, name_en, name_ar, description, owner_id, sort_order, status, created_at, updated_at FROM "${schema}".governance_domains WHERE deleted_at IS NULL ORDER BY sort_order, name_en`
  );
  res.json({ domains: result.rows, count: result.rows.length });
}));

router.post('/domains', authenticate, requirePermission('governance.record.write'), validate({ body: createDomainBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { name_en, name_ar, description, owner_id, sort_order } = req.body;
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_domains (tenant_id, name_en, name_ar, description, owner_id, sort_order) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
  [req.tenantId, name_en, name_ar, description, owner_id, sort_order || 0]
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_domain', entityId: getFirstRow(result)?.domain_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.created' });
  res.status(201).json(getFirstRow(result));
}));

router.put('/domains/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateDomainBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { name_en, name_ar, description, owner_id, sort_order } = req.body;
  const result = await safeQuery(
  `UPDATE "${schema}".governance_domains SET name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar), description=COALESCE($4,description), owner_id=COALESCE($5,owner_id), sort_order=COALESCE($6,sort_order), updated_at=NOW() WHERE domain_id=$1 AND deleted_at IS NULL RETURNING *`,
  [req.params.id, name_en, name_ar, description, owner_id, sort_order]
  );
  if (!getFirstRow(result)) return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
  setAuditData(res as any, { action: 'update', entityType: 'governance_domain', entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.updated' });
  res.json(getFirstRow(result));
}));

router.delete('/domains/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`UPDATE "${schema}".governance_domains SET deleted_at=NOW() WHERE domain_id=$1 AND deleted_at IS NULL RETURNING domain_id`, [req.params.id]);
  if (!getFirstRow(result)) return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_domain', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.deleted' });
  res.json({ deleted: true });
}));

router.get('/bodies', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { body_type, domain_id } = req.query;
  let sql = `SELECT body_id, tenant_id, domain_id, body_type, name_en, name_ar, description, chair_user_id, status, created_at, updated_at FROM "${schema}".governance_bodies WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (body_type) { params.push(body_type); sql += ` AND body_type = $${params.length}`; }
  if (domain_id) { params.push(domain_id); sql += ` AND domain_id = $${params.length}`; }
  sql += ' ORDER BY name_en';
  const result = await safeQuery(sql, params);
  res.json({ bodies: result.rows, count: result.rows.length });
}));

router.post('/bodies', authenticate, requirePermission('governance.record.write'), validate({ body: createBodyBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { domain_id, body_type, name_en, name_ar, description, chair_user_id } = req.body;
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_bodies (tenant_id, domain_id, body_type, name_en, name_ar, description, chair_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
  [req.tenantId, domain_id, body_type || 'committee', name_en, name_ar, description, chair_user_id]
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_body', entityId: getFirstRow(result)?.body_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.created' });
  res.status(201).json(getFirstRow(result));
}));

router.put('/bodies/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateBodyBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { name_en, name_ar, description, body_type, domain_id, chair_user_id, status } = req.body;
  if (status) {
  const enforcement = await enforceStatusTransition(req.tenantId, {
  moduleCode: 'governance', table: 'governance_bodies', idColumn: 'body_id',
  entityId: req.params.id, toStatus: status, actorUserId: req.user!.userId!,
  });
  if (!enforcement.success && enforcement.blocked) {
  return res.status(403).json({ error: 'Transition denied', reason: enforcement.reason });
  }
  }
  const result = await safeQuery(
  `UPDATE "${schema}".governance_bodies SET name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar), description=COALESCE($4,description), body_type=COALESCE($5,body_type), domain_id=COALESCE($6,domain_id), chair_user_id=COALESCE($7,chair_user_id), status=COALESCE($8,status), updated_at=NOW() WHERE body_id=$1 AND deleted_at IS NULL RETURNING *`,
  [req.params.id, name_en, name_ar, description, body_type, domain_id, chair_user_id, status]
  );
  if (!getFirstRow(result)) return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
  setAuditData(res as any, { action: 'update', entityType: 'governance_body', entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.updated' });
  res.json(getFirstRow(result));
}));

router.delete('/bodies/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`UPDATE "${schema}".governance_bodies SET deleted_at=NOW() WHERE body_id=$1 AND deleted_at IS NULL RETURNING body_id`, [req.params.id]);
  if (!getFirstRow(result)) return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_body', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.deleted' });
  res.json({ deleted: true });
}));

router.get('/reporting-lines', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`SELECT line_id, tenant_id, parent_body_id, child_body_id, relationship_type, created_at FROM "${schema}".governance_reporting_lines ORDER BY created_at`);
  res.json({ lines: result.rows, count: result.rows.length });
}));

router.post('/reporting-lines', authenticate, requirePermission('governance.record.write'), validate({ body: createReportingLineBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { parent_body_id, child_body_id, relationship_type } = req.body;
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_reporting_lines (tenant_id, parent_body_id, child_body_id, relationship_type) VALUES ($1,$2,$3,$4) RETURNING *`,
  [req.tenantId, parent_body_id, child_body_id, relationship_type || 'reports_to']
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_reporting_line', entityId: getFirstRow(result)?.line_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.created' });
  res.status(201).json(getFirstRow(result));
}));

router.delete('/reporting-lines/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`DELETE FROM "${schema}".governance_reporting_lines WHERE line_id=$1 RETURNING line_id`, [req.params.id]);
  if (!getFirstRow(result)) return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
  setAuditData(res as any, { action: 'delete', entityType: 'governance_reporting_line', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.deleted' });
  res.json({ deleted: true });
}));

router.get('/org-tree', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const bodies = await safeQuery(`SELECT body_id, tenant_id, domain_id, body_type, name_en, name_ar, description, chair_user_id, status, created_at FROM "${schema}".governance_bodies WHERE deleted_at IS NULL ORDER BY name_en`);
  const lines = await safeQuery(`SELECT line_id, parent_body_id, child_body_id, relationship_type FROM "${schema}".governance_reporting_lines`);
  const domains = await safeQuery(`SELECT domain_id, name_en, name_ar, description, owner_id, sort_order, status FROM "${schema}".governance_domains WHERE deleted_at IS NULL ORDER BY sort_order`);
  res.json({ bodies: bodies.rows, reportingLines: lines.rows, domains: domains.rows });
}));

// NOTE: Department CRUD removed — use canonical /api/departments (departments.routes.ts) instead.
// This file retains governance_domains, governance_bodies, reporting_lines, and legal_entities only.

router.get('/legal-entities', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`SELECT entity_id, name_en, name_ar, entity_type, registration_no, country, description, is_active, created_at, updated_at FROM "${schema}".legal_entities WHERE deleted_at IS NULL ORDER BY name_en`);
  res.json({ entities: result.rows, count: result.rows.length });
  } catch (err: unknown) {
  if (((err as Record<string,any>)['code'] as string | undefined) === '42P01') return res.json({ entities: [], count: 0 });
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
}));

router.post('/legal-entities', authenticate, requirePermission('governance.record.write'), validate({ body: createLegalEntitiesBody }), asyncHandler(async (req, res) => {
  const parsed = legalEntityCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  const { name_en, name_ar, entity_type, registration_no, country, description } = parsed.data;
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `INSERT INTO "${schema}".legal_entities (name_en, name_ar, entity_type, registration_no, country, description) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
  [name_en, name_ar, entity_type, registration_no, country, description]
  );
  setAuditData(res as any, { action: 'create', entityType: 'legal_entity', entityId: getFirstRow(result)?.entity_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.created' });
  res.status(201).json(getFirstRow(result));
}));

router.put('/legal-entities/:id', authenticate, requirePermission('governance.record.write'), validate({ body: updateLegalEntitiesBody }), asyncHandler(async (req, res) => {
  if (!uuidParam.safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid entity ID' });
  const parsed = legalEntityUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: 'Validation failed', details: parsed.error.flatten().fieldErrors });
  const { name_en, name_ar, entity_type, registration_no, country, description } = parsed.data;
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `UPDATE "${schema}".legal_entities SET name_en=COALESCE($2,name_en), name_ar=COALESCE($3,name_ar), entity_type=COALESCE($4,entity_type), registration_no=COALESCE($5,registration_no), country=COALESCE($6,country), description=COALESCE($7,description), updated_at=NOW() WHERE entity_id=$1 AND deleted_at IS NULL RETURNING *`,
  [req.params.id, name_en, name_ar, entity_type, registration_no, country, description]
  );
  if (!getFirstRow(result)) return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
  setAuditData(res as any, { action: 'update', entityType: 'legal_entity', entityId: req.params.id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.updated' });
  res.json(getFirstRow(result));
}));

router.delete('/legal-entities/:id', authenticate, requirePermission('governance.record.delete'), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  if (!uuidParam.safeParse(req.params.id).success) return res.status(400).json({ error: 'Invalid entity ID' });
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`UPDATE "${schema}".legal_entities SET deleted_at=NOW() WHERE entity_id=$1 AND deleted_at IS NULL RETURNING entity_id`, [req.params.id]);
  if (!getFirstRow(result)) return res.status(404).json({ error: errMsg('NOT_FOUND', req) });
  setAuditData(res as any, { action: 'delete', entityType: 'legal_entity', entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'governance_structure', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_structure.deleted' });
  res.json({ deleted: true });
}));

export default router;


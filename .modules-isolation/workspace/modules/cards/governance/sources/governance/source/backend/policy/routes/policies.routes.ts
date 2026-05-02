import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";
import { catchHandler, EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../ports/database.port';
import { errMsg } from "../../../i18n/error-messages";
import { emitEvent } from '../../ports/events.port';
import { enforceStatusTransition } from '../../ports/platform.port';
import { getFirstRow } from '@dos/db';
// ── Zod Validation Schemas ──
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, requireOwnership, fieldRbacFilter, enforceMandatoryFields, enforceStageGates, lifecycleGate as _lifecycleGate, injectScopeContext, validate, moduleStack } from '../ports/middleware.port';
import { createRootBody, updateIdBody, createIdApproveBody } from "../schemas/policy.schemas";

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware("policy"));
router.use(automationMiddleware("policy"));
router.use(fieldRbacFilter("policy"));
router.use(enforceMandatoryFields("policy"));
router.use(enforceStageGates("policy"));
router.use(injectScopeContext);

/**
 * @swagger
 * /policies:
 *   get:
 *     summary: List all policies with version and approval status
 *     tags: [Policy]
 *     responses:
 *       200:
 *         description: Policy list
 */
router.get("/", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const user = req.user!;
  const hasFullScope = user?.is_super_admin === true ||
    (user?.permissions ?? []).includes('policy.document.read_all');
  let sql = `SELECT * FROM "${schema}".policies WHERE deleted_at IS NULL`;
  const params: unknown[] = [];
  if (user && !hasFullScope) {
  sql += ` AND (author_user_id = $1 OR created_by = $1 OR owner = $1)`;
  params.push(user.userId);
  }
  sql += ` ORDER BY updated_at DESC NULLS LAST, created_at DESC`;
  const result = await safeQuery(sql, params);
  res.json({ policies: result.rows, count: result.rows.length });
}));

/**
 * @swagger
 * /policies/{id}:
 *   get:
 *     summary: Get policy by ID
 *     tags: [Policy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Policy detail
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Policy'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/:id", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`SELECT * FROM "${schema}".policies WHERE policy_id = $1`, [req.params.id]);
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(getFirstRow(result));
}));

/**
 * @swagger
 * /policies:
 *   post:
 *     summary: Create a new policy
 *     tags: [Policy]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Policy'
 *     responses:
 *       201:
 *         description: Policy created
 */
router.post("/", authenticate, requirePermission("policy.document.write"), validate({ body: createRootBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { title, content, description, category, frameworks, next_review_date,
  review_frequency, effective_date, expiry_date, linked_controls, tags } = req.body;
  if (!title || !content) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const userId = req.user!.userId!;
  // Resolve org_unit_id from user's department for enterprise auth scope binding
  let orgUnitId: number | null = null;
  try {
  const deptRes = await safeQuery(
  `SELECT d.id FROM "${schema}".departments d
  JOIN "${schema}".users u ON u.department_id = d.id
  WHERE u.user_id = $1 LIMIT 1`, [userId]);
  orgUnitId = getFirstRow(deptRes)?.id || null;
  } catch { /* departments may not have user linkage */ }

  const result = await safeQuery(
  `INSERT INTO "${schema}".policies
  (title, content, description, category, status, approval_status, frameworks, owner,
  review_frequency, next_review_date, effective_date, expiry_date, linked_controls, tags,
  author_user_id, created_by, org_unit_id)
  VALUES ($1,$2,$3,$4,'draft','draft',$5,$6,$7,$8,$9,$10,$11,$12,$6,$6,$13) RETURNING *`,
  [title, content, description || '', category || 'general',
  frameworks || [], userId, review_frequency || 'annual',
  next_review_date || null, effective_date || null, expiry_date || null,
  linked_controls || [], tags || [], orgUnitId]
  );
  const policy = getFirstRow(result)!;
  await safeQuery(
  `INSERT INTO "${schema}".policy_versions (policy_id, version, title, content, status, change_summary, changed_by, snapshot)
  VALUES ($1, 1, $2, $3, 'draft', 'Initial version', $4, $5)`,
  [policy.policy_id, title, content, userId, JSON.stringify(policy)]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
  setAuditData(res as any, { action: "create", entityType: "policy", entityId: policy.policy_id, afterState: policy });
  emitEvent(({ tenantId: req.tenantId!, userId: userId, module: 'policy', event: 'created', entityType: 'policy', entityId: policy.policy_id, data: policy } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.status(201).json(policy);
}));

/**
 * @swagger
 * /policies/{id}:
 *   put:
 *     summary: Update a policy (creates new version)
 *     tags: [Policy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Policy updated
 */
router.put("/:id", authenticate, requirePermission("policy.document.write"), validate({ body: updateIdBody }), requireOwnership("policy"), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const id = req.params.id as string;
  const userId = req.user!.userId!;
  const current = await safeQuery(`SELECT * FROM "${schema}".policies WHERE policy_id = $1 AND deleted_at IS NULL`, [id]);
  if (current.rows.length === 0) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  const old = getFirstRow(current)!;
  const newVersion = (old.version || 1) + 1;
  const allowed = ['title','content','description','category','status','frameworks',
  'review_frequency','next_review_date','effective_date','expiry_date',
  'linked_controls','linked_procedures','tags'];
  const cols = Object.keys(req.body).filter(k => allowed.includes(k));
  if (cols.length === 0) { res.status(400).json({ error: errMsg('NO_FIELDS_TO_UPDATE', req) }); return; }
  const sets = cols.map((c, i) => `${c} = $${i + 2}`);
  const vals = cols.map(c => req.body[c]);
  const result = await safeQuery(
  `UPDATE "${schema}".policies SET ${sets.join(', ')}, version = $${cols.length + 2},
  updated_at = NOW(), approval_status = 'draft'
  WHERE policy_id = $1 AND deleted_at IS NULL RETURNING *`,
  [id, ...vals, newVersion]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  const policy = getFirstRow(result)!;
  const changeSummary = req.body.change_summary || `Updated: ${cols.join(', ')}`;
  await safeQuery(
  `INSERT INTO "${schema}".policy_versions (policy_id, version, title, content, status, change_summary, changed_by, snapshot)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
  [id, newVersion, policy.title, policy.content, policy.status, changeSummary, userId, JSON.stringify(policy)]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
  setAuditData(res as any, { action: "update", entityType: "policy", entityId: id, afterState: policy });
  emitEvent(({ tenantId: req.tenantId!, userId: userId, module: 'policy', event: 'updated', entityType: 'policy', entityId: id, data: policy, previousData: old } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  res.json(policy);
}));

/**
 * @swagger
 * /policies/{id}/approve:
 *   post:
 *     summary: Approve a policy
 *     tags: [Policy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Policy approved
 */
router.post("/:id/approve", authenticate, requirePermission("policy.document.write"), validate({ body: createIdApproveBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const tenantId = req.tenantId!;
  const id = req.params.id;
  const userId = req.user!.userId!;

  const existing = await safeQuery(
  `SELECT policy_id, created_by, owner FROM "${schema}".policies WHERE policy_id = $1 AND deleted_at IS NULL`,
  [id]
  );
  if (!getFirstRow(existing)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }

  const policy = getFirstRow(existing)!;
  const sodConfigKey = 'governance_policy_approval_sod';
  let sodPolicy: 'enforce' | 'warn' | 'off' = 'enforce';
const cfgRs = await safeQuery(
`SELECT config_value FROM "${schema}".platform_operation_config WHERE config_key = $1 AND owner_module = 'policy' LIMIT 1`,
[sodConfigKey]
);
if (cfgRs.rows.length > 0) {
let raw = getFirstRow(cfgRs)?.config_value;
if (typeof raw === 'string') raw = raw.replace(/^"|"$/g, '');
if (['enforce', 'warn', 'off'].includes(raw)) (sodPolicy as any) = raw as unknown;
}

  const isAuthor = policy.created_by && policy.created_by === userId;
  const isOwner = policy.owner && policy.owner === userId;
  const sodConflict = isAuthor || isOwner;

  if (sodConflict && sodPolicy === 'enforce') {
  const role = isAuthor ? 'author' : 'owner';
  res.status(403).json({
  error: `Separation of Duties violation: user '${userId}' cannot approve this policy because they are the ${role}. A different user with policy:write permission must approve.`,
  sodViolation: true,
  conflictRole: role,
  });
  return;
  }

  const enforcement = await enforceStatusTransition(tenantId, {
  moduleCode: 'policy', table: 'policies', idColumn: 'policy_id',
  entityId: id, toStatus: 'approved', actorUserId: userId,
  extraSets: "approval_status = 'approved', approved_by = $2, approved_at = NOW()",
  extraParams: [userId],
  });
  if (!enforcement.success && enforcement.blocked) {
  res.status(403).json({ error: 'Transition denied', reason: enforcement.reason }); return;
  }
  if (!enforcement.success) {
  await safeQuery(`UPDATE "${schema}".policies SET approval_status = 'approved', approved_by = $1, approved_at = NOW(), status = 'approved', updated_at = NOW() WHERE policy_id = $2 AND deleted_at IS NULL`, [userId, id]);
  }
  const result = await safeQuery(`SELECT * FROM "${schema}".policies WHERE policy_id = $1`, [id]);
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "update", entityType: "policy", entityId: id, afterState: getFirstRow(result) });

  emitEvent(({ tenantId, userId, module: 'policy', event: 'approved', entityType: 'policy', entityId: id, data: { ...getFirstRow(result), sodWarning: sodConflict && sodPolicy === 'warn' } } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
  const response: unknown = getFirstRow(result);

  if (sodConflict && sodPolicy === 'warn') {

  response.sodWarning = `User '${userId}' is the ${isAuthor ? 'author' : 'owner'} of this policy. SoD policy is set to 'warn'.`;
  }
  res.json(response);
}));

/**
 * @swagger
 * /policies/{id}:
 *   delete:
 *     summary: Delete a policy
 *     tags: [Policy]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: Policy deleted
 */
router.delete("/:id", authenticate, requirePermission("policy.document.delete"), requireOwnership("policy"), validate({ body: genericPayloadSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const id = req.params.id as string;
  const result = await safeQuery(
  `UPDATE "${schema}".policies SET deleted_at = NOW(), updated_at = NOW()
  WHERE policy_id = $1 AND deleted_at IS NULL RETURNING policy_id`,
  [id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "delete", entityType: "policy", entityId: id });
  res.json({ deleted: true });
}));

router.get("/:id/versions", authenticate, requirePermission("policy.document.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const policyId = req.params.id;
  const result = await safeQuery(
  `SELECT * FROM "${schema}".policy_versions WHERE policy_id = $1 ORDER BY version ASC`,
  [policyId]
  );
  if (result.rows.length === 0) {
  const current = await safeQuery(`SELECT * FROM "${schema}".policies WHERE policy_id = $1`, [policyId]);
  if (current.rows.length === 0) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  const p = getFirstRow(current)!;
  res.json({ versions: [{
  version: p.version || 1, author: p.owner, updated_at: p.updated_at || p.created_at,
  status: p.status, change_summary: 'Initial version', content: p.content,
  }]});
  return;
  }
  res.json({ versions: result.rows });
}));

export default router;


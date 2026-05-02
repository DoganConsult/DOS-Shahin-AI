import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import {
  listAcknowledgements, listCampaigns, createCampaign as _createCampaign,
  recordAcknowledgement as _recordAcknowledgement, getAckStats,
} from '../../../services/governance/governance-acknowledgements.service';
import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '../../../../../utils/db-utils';

/** Zod schemas for request body validation */
const createCampaignBody = z.object({
  policy_id: z.string().min(1),
  title: z.string().min(1),
  due_date: z.string().optional(),
}).passthrough();

const recordAcknowledgementBody = z.object({
  policy_id: z.string().min(1),
  version_acknowledged: z.number().optional(),
  campaign_id: z.string().optional(),
  due_date: z.string().optional(),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';

import { swallow, EC } from '../../../ports/resilience.port';

import { catchHandler, EC } from '@dos/platform-core/resilience';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.get('/', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { policy_id, user_id, campaign_id } = req.query;
  const rows = await listAcknowledgements(req.tenantId, {
  policy_id: policy_id as string,
  user_id: user_id as string,
  campaign_id: campaign_id as string,
  });
  res.json({ acknowledgements: rows, count: rows.length });
}));

router.get('/campaigns', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const rows = await listCampaigns(req.tenantId);
  res.json({ campaigns: rows, count: rows.length });
}));

router.post('/campaigns', authenticate, requirePermission('governance.record.write'), validate({ body: createCampaignBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { policy_id, title, due_date } = req.body;
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_ack_campaigns (tenant_id, policy_id, title, due_date, created_by) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
  [req.tenantId, policy_id, title, due_date, req.user?.userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_ack_campaign', entityId: getFirstRow(result)?.campaign_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_ack_campaign', entityId: getFirstRow(result)?.campaign_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_ack_campaign.created' });
  res.status(201).json(getFirstRow(result));
}));

router.get('/campaigns/:id/status', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const campaign = await safeQuery(`SELECT * FROM "${schema}".governance_ack_campaigns WHERE campaign_id=$1`, [req.params.id]);
  if (!getFirstRow(campaign)) return res.status(404).json({ error: 'Campaign not found' });
  const acks = await safeQuery(`SELECT * FROM "${schema}".governance_policy_acknowledgements WHERE campaign_id=$1 AND deleted_at IS NULL`, [req.params.id]);
  const pending = await safeQuery(`SELECT * FROM "${schema}".governance_policy_acknowledgements WHERE campaign_id=$1 AND deleted_at IS NULL AND due_date IS NOT NULL AND due_date < NOW() AND acknowledged_at IS NULL`, [req.params.id]);
  res.json({ campaign: getFirstRow(campaign), acknowledged: acks.rows.length, overdue: pending.rows.length });
}));

router.post('/', authenticate, requirePermission('governance.record.write'), validate({ body: recordAcknowledgementBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const userId = req.user!.userId!;
  const { policy_id, version_acknowledged, campaign_id, due_date } = req.body;
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_policy_acknowledgements (policy_id, user_id, version_acknowledged, campaign_id, due_date, created_by)
  VALUES ($1,$2,$3,$4,$5,$6)
  ON CONFLICT (policy_id, user_id, version_acknowledged) DO UPDATE SET acknowledged_at=NOW(), updated_at=NOW()
  RETURNING *`,
  [policy_id, userId, version_acknowledged || 1, campaign_id, due_date, userId]
  );
  setAuditData(res as any, { action: 'create', entityType: 'governance_acknowledgement', entityId: getFirstRow(result)?.acknowledgement_id, afterState: getFirstRow(result) });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_acknowledgement', entityId: getFirstRow(result)?.acknowledgement_id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_acknowledgement.created' });
  // Emit obligation_acknowledged event for cross-module workflow chains
  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'obligation_acknowledged', entityType: 'governance_obligation', entityId: policy_id, data: { acknowledgementId: getFirstRow(result)?.acknowledgement_id, versionAcknowledged: version_acknowledged || 1 } } as any)).catch(catchHandler(EC.EVENT_BUS));
  res.status(201).json(getFirstRow(result));
}));

router.get('/pending', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const userId = req.user!.userId!;
  const result = await safeQuery(
  `SELECT p.policy_id, p.title, p.version FROM "${schema}".policies p
  WHERE p.deleted_at IS NULL AND p.status IN ('approved','published')
  AND NOT EXISTS (SELECT 1 FROM "${schema}".governance_policy_acknowledgements a WHERE a.policy_id=p.policy_id AND a.user_id=$1 AND a.version_acknowledged=p.version AND a.deleted_at IS NULL)
  ORDER BY p.updated_at DESC`,
  [userId]
  );
  res.json({ pending: result.rows, count: result.rows.length });
}));

router.get('/stats', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const _stats = await getAckStats(req.tenantId);
  const schema = tenantSchema(req.tenantId);
  const total = await safeQuery(`SELECT COUNT(*) AS count FROM "${schema}".governance_policy_acknowledgements WHERE deleted_at IS NULL`);
  const campaigns = await safeQuery(`SELECT COUNT(*) AS count FROM "${schema}".governance_ack_campaigns`);
  const pending = await safeQuery(
  `SELECT COUNT(*) AS count FROM "${schema}".policies p
  WHERE p.deleted_at IS NULL AND p.status IN ('approved','published')
  AND NOT EXISTS (SELECT 1 FROM "${schema}".governance_policy_acknowledgements a WHERE a.policy_id=p.policy_id AND a.deleted_at IS NULL)`
  );
  res.json({ totalAcknowledgements: +getFirstRow(total)?.count, totalCampaigns: +getFirstRow(campaigns)?.count, pendingCount: +getFirstRow(pending)?.count });
}));

export default router;


import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());
import { authenticate, requirePermission } from '../../../ports/auth.port';
import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { getFirstRow } from '../../../../../utils/db-utils';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../../../ports/ai.port';

/** Zod schemas for request body validation */
const resolveViolationBody = z.object({
  resolution_notes: z.string().optional(),
}).passthrough();

import { asyncHandler, validate, auditMiddleware, setAuditData, moduleStack } from '../../../ports/middleware.port';
import { swallow, swallowDefault, EC , catchHandler } from '../../../ports/resilience.port';
import { createScanBody } from '../../../schemas/governance.schemas';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));

router.post('/scan', authenticate, requirePermission('governance.record.write'), validate({ body: createScanBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const tenantId = req.tenantId!;
  const violations: unknown[] = [];

  const noCharter = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT c.committee_id, c.name FROM "${schema}".committees c WHERE NOT EXISTS (SELECT 1 FROM "${schema}".governance_charters ch WHERE ch.committee_id = c.committee_id AND ch.status='active' AND ch.deleted_at IS NULL)`), { tenantId: tenantId, operation: 'query committees' });
  for (const c of noCharter.rows) {
  violations.push({ rule_code: 'NO_CHARTER', rule_description: 'Committee without active charter', entity_type: 'committee', entity_id: c.committee_id, entity_label: c.name, severity: 'high' });
  }

  const overdueActions = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT action_id, title FROM "${schema}".governance_action_items WHERE deleted_at IS NULL AND due_date < NOW() AND status NOT IN ('completed','closed')`), { tenantId: tenantId, operation: 'query governance_action_items' });
  for (const a of overdueActions.rows) {
  violations.push({ rule_code: 'OVERDUE_ACTION', rule_description: 'Overdue governance action', entity_type: 'action_item', entity_id: a.action_id, entity_label: a.title, severity: 'medium' });
  }

  const overdueReviews = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT policy_id, title FROM "${schema}".policies WHERE deleted_at IS NULL AND next_review_date IS NOT NULL AND next_review_date < NOW()`), { tenantId: tenantId, operation: 'query policies' });
  for (const p of overdueReviews.rows) {
  violations.push({ rule_code: 'OVERDUE_REVIEW', rule_description: 'Overdue policy review', entity_type: 'policy', entity_id: p.policy_id, entity_label: p.title, severity: 'medium' });
  }

  const expiredMandates = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT mandate_id, title_en FROM "${schema}".governance_mandates WHERE deleted_at IS NULL AND status='active' AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE`), { tenantId: tenantId, operation: 'query governance_mandates' });
  for (const m of expiredMandates.rows) {
  violations.push({ rule_code: 'EXPIRED_MANDATE', rule_description: 'Expired mandate still active', entity_type: 'mandate', entity_id: m.mandate_id, entity_label: m.title_en, severity: 'high' });
  }

  const expiredDelegations = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT delegation_id, authority_type FROM "${schema}".governance_delegations WHERE deleted_at IS NULL AND status='active' AND expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE`), { tenantId: tenantId, operation: 'query governance_delegations' });
  for (const d of expiredDelegations.rows) {
  violations.push({ rule_code: 'EXPIRED_DELEGATION', rule_description: 'Expired delegation still active', entity_type: 'delegation', entity_id: d.delegation_id, entity_label: d.authority_type, severity: 'medium' });
  }

  const meetingsNoMinutes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT meeting_id, title FROM "${schema}".governance_meetings WHERE deleted_at IS NULL AND status='completed' AND (minutes IS NULL OR minutes='') AND scheduled_at < NOW() - INTERVAL '7 days'`), { tenantId: tenantId, operation: 'query governance_meetings' });
  for (const m of meetingsNoMinutes.rows) {
  violations.push({ rule_code: 'MEETING_NO_MINUTES', rule_description: 'Completed meeting without minutes', entity_type: 'meeting', entity_id: m.meeting_id, entity_label: m.title, severity: 'medium' });
  }

  const decisionOverdue = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT decision_id, decision_text FROM "${schema}".governance_decisions WHERE deleted_at IS NULL AND status IN ('approved','pending_vote') AND review_date IS NOT NULL AND review_date < NOW()`), { tenantId: tenantId, operation: 'query governance_decisions' });
  for (const d of decisionOverdue.rows) {

  violations.push({ rule_code: 'DECISION_IMPL_OVERDUE', rule_description: 'Decision implementation overdue', entity_type: 'decision', entity_id: d.decision_id, entity_label: d.decision_text?.substring(0, 80), severity: 'high' });
  }

  const exceptionsNoControl = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT e.exception_id, e.title FROM "${schema}".exceptions e WHERE e.deleted_at IS NULL AND e.status IN ('open','approved') AND (e.severity='high' OR e.severity='critical') AND NOT EXISTS (SELECT 1 FROM "${schema}".governance_compensating_controls cc WHERE cc.exception_id=e.exception_id AND cc.status='active')`), { tenantId: tenantId, operation: 'query exceptions' });
  for (const e of exceptionsNoControl.rows) {
  violations.push({ rule_code: 'EXCEPTION_NO_CONTROL', rule_description: 'High/critical exception without compensating control', entity_type: 'exception', entity_id: e.exception_id, entity_label: e.title, severity: 'critical' });
  }

  const staleCampaigns = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT campaign_id, title FROM "${schema}".governance_ack_campaigns WHERE due_date IS NOT NULL AND due_date < CURRENT_DATE - INTERVAL '14 days'`), { tenantId: tenantId, operation: 'query governance_ack_campaigns' });
  for (const c of staleCampaigns.rows) {
  violations.push({ rule_code: 'STALE_ACK_CAMPAIGN', rule_description: 'Acknowledgement campaign overdue by 14+ days', entity_type: 'ack_campaign', entity_id: c.campaign_id, entity_label: c.title, severity: 'medium' });
  }

  const expiredCharters = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT charter_id, title_en FROM "${schema}".governance_charters WHERE deleted_at IS NULL AND status='active' AND expires_at IS NOT NULL AND expires_at < CURRENT_DATE`), { tenantId: tenantId, operation: 'query governance_charters' });
  for (const c of expiredCharters.rows) {
  violations.push({ rule_code: 'EXPIRED_CHARTER', rule_description: 'Active charter past expiry date', entity_type: 'charter', entity_id: c.charter_id, entity_label: c.title_en, severity: 'high' });
  }

  const policiesNoOwner = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT policy_id, title FROM "${schema}".policies WHERE deleted_at IS NULL AND status IN ('approved','published') AND (owner IS NULL OR owner='')`), { tenantId: tenantId, operation: 'query policies' });
  for (const p of policiesNoOwner.rows) {
  violations.push({ rule_code: 'POLICY_NO_OWNER', rule_description: 'Published policy without owner', entity_type: 'policy', entity_id: p.policy_id, entity_label: p.title, severity: 'high' });
  }

  const unassignedResponsibilities = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT r.responsibility_id, r.title_en FROM "${schema}".governance_responsibilities r WHERE r.deleted_at IS NULL AND r.criticality IN ('high','critical') AND NOT EXISTS (SELECT 1 FROM "${schema}".governance_responsibility_assignments a WHERE a.responsibility_id=r.responsibility_id)`), { tenantId: tenantId, operation: 'query governance_responsibilities' });
  for (const r of unassignedResponsibilities.rows) {
  violations.push({ rule_code: 'UNASSIGNED_RESPONSIBILITY', rule_description: 'High/critical responsibility without assignee', entity_type: 'responsibility', entity_id: r.responsibility_id, entity_label: r.title_en, severity: 'high' });
  }

  for (const v of violations) {
  await safeQuery(
  `INSERT INTO "${schema}".governance_enforcement_log (tenant_id, rule_code, rule_description, entity_type, entity_id, entity_label, severity) VALUES ($1,$2,$3,$4,$5,$6,$7)`,

  [tenantId, v.rule_code, v.rule_description, v.entity_type, v.entity_id, v.entity_label, v.severity]
  ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  setAuditData(res as any, { action: 'create', entityType: 'governance_enforcement_scan', afterState: { violations_found: violations.length } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_enforcement_scan', entityId: '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_enforcement_scan.created' });
  res.json({ scanned: true, violations_found: violations.length, violations });
}));

router.get('/violations', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(`SELECT * FROM "${schema}".governance_enforcement_log WHERE tenant_id=$1 ORDER BY detected_at DESC`, [req.tenantId]);
  res.json({ violations: result.rows, count: result.rows.length });
}));

router.get('/summary', authenticate, requirePermission('governance.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `SELECT rule_code, severity, status, COUNT(*)::int AS count FROM "${schema}".governance_enforcement_log WHERE tenant_id=$1 GROUP BY rule_code, severity, status ORDER BY count DESC`,
  [req.tenantId]
  );
  res.json({ summary: result.rows });
}));

router.post('/violations/:id/resolve', authenticate, requirePermission('governance.record.write'), validate({ body: resolveViolationBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { resolution_notes } = req.body;
  const enforcement = await enforceStatusTransition(req.tenantId, {
  moduleCode: 'governance', table: 'governance_enforcement_log', idColumn: 'violation_id',
  entityId: req.params.id, toStatus: 'resolved', actorUserId: req.user!.userId!,
  extraSets: 'resolved_at=NOW(), resolved_by=$2, resolution_notes=$3',
  extraParams: [req.user?.userId, resolution_notes],
  });
  if (!enforcement.success && enforcement.blocked) {
  return res.status(403).json({ error: 'Transition denied', reason: enforcement.reason });
  }
  if (!enforcement.success) {
  await safeQuery(
  `UPDATE "${schema}".governance_enforcement_log SET status='resolved', resolved_at=NOW(), resolved_by=$2, resolution_notes=$3 WHERE violation_id=$1`,
  [req.params.id, req.user?.userId, resolution_notes]
  );
  }
  const result = await safeQuery(`SELECT * FROM "${schema}".governance_enforcement_log WHERE violation_id=$1`, [req.params.id]);
  const violation = getFirstRow(result)!;
  if (!violation) return res.status(404).json({ error: 'Violation not found' });
  setAuditData(res as any, { action: 'update', entityType: 'governance_enforcement_violation', entityId: req.params.id, afterState: { status: 'resolved' } });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_enforcement_violation', entityId: req.params.id || '' } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_enforcement_violation.updated' });
  res.json(violation);
}));

export default router;


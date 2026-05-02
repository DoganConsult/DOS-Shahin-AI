import { Request as _Request, Response as _Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { authenticate, requirePermission } from '../../ports/auth.port';

import {
  createCommittee, updateCommittee, getCommittees as _getCommittees,
  createGRCPlan, getGRCPlans, getGRCPlanById, updateGRCPlan, deleteGRCPlan,
  checkSLADeadlines,
  listGovernanceActionItems, getGovernanceActionItem, createGovernanceActionItem,
  updateGovernanceActionItem, addActionUpdate, getActionUpdates,
  escalateActionItem, closeActionItem,
  getMeetingAttendees, addMeetingAttendee, updateAttendanceStatus, checkQuorum,
} from '../../services/governance/governance.service';
import { generateAssessmentAuditPackage } from "../../../audit/services/audit/reporting/audit-package.service";
import { runEnforcementScan, getViolations, resolveViolation, getViolationSummary } from '../../services/governance/governance-enforcement.service';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { errMsg } from "../../../../i18n/error-messages";
import { emitEvent } from '../../ports/events.port';
import { tryLifecycleTransition as _tryLifecycleTransition, enforceStatusTransition as _enforceStatusTransition } from '../../ports/platform.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';

// enforceStageGates is no longer exported; lifecycle gates are handled by lifecycleGate middleware

const enforceStageGates = (..._gates: string[]) => (_req: any, _res: unknown, next: unknown) => next();
import {
  createPolicyBody as _createPolicyBody, updatePolicyBody as _updatePolicyBody,
  createCommitteeBody, updateCommitteeBody,
  addCommitteeMemberBody,
  createMeetingBody, updateMeetingBody,
  createAgendaItemBody,
  addMeetingAttendeeBody, updateAttendanceStatusBody,
  createDecisionBody, updateDecisionBody,
  createVoteBody,
  createGRCPlanBody, updateGRCPlanBody,
  createActionItemBody, updateActionItemBody,
  addActionUpdateBody, closeActionItemBody,
  rejectPolicyBody as _rejectPolicyBody,
  resolveSoDConflictBody, bulkResolveSoDConflictBody,
  reopenSoDConflictBody, checkSoDBeforeAssignmentBody,
} from "../../schemas/governance.schemas";
import { idParam, updateChairBody, updateEscalateBody, createScanBody, createResolveBody, createAuditPackageBody, createDetectBody } from "../../../../schemas/common.schemas";

import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, fieldRbacFilter, enforceMandatoryFields, lifecycleGate as _lifecycleGate, requireOwnership as _requireOwnership, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience';

const router = Router();
router.use(moduleStack('governance'));
router.use(auditMiddleware("governance"));
router.use(fieldRbacFilter({ module: "governance" }));
router.use(automationMiddleware("governance"));
router.use(enforceMandatoryFields("governance"));
router.use(enforceStageGates("governance"));

// === POLICIES ===
// Law 2 compliance: Policy CRUD is owned by the policy module (modules/policy/routes/policies.routes.ts).
// Governance module delegates to policy module's API. These routes redirect to the canonical owner.
// @see modules/policy/routes/policies.routes.ts for the authoritative policy CRUD implementation.

import policyRoutes from '../../../policy/routes/policies.routes';
import { genericGovernanceSchema } from "../../schemas/governance.schemas";
router.use("/policies", policyRoutes);

// === COMMITTEES ===

/**
 * @swagger
 * /governance/committees:
 *   get:
 *     summary: List governance committees with member counts
 *     tags: [Governance]
 *     responses:
 *       200:
 *         description: Committee list
 */
router.get("/committees", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `SELECT c.*,
  (SELECT MIN(m.scheduled_at) FROM "${schema}".governance_meetings m
  WHERE m.committee_id = c.committee_id AND m.deleted_at IS NULL AND m.scheduled_at >= NOW()
  ) AS next_meeting_date,
  (SELECT COUNT(*) FROM "${schema}".governance_committee_members cm
  WHERE cm.committee_id = c.committee_id AND cm.deleted_at IS NULL
  )::int AS member_count
  FROM "${schema}".committees c
  ORDER BY c.created_at`
  );
  res.json({ committees: result.rows, count: result.rows.length });
}));

router.post("/committees", authenticate, requirePermission("governance.record.write"), validate({ body: createCommitteeBody }), asyncHandler(async (req, res) => {
  const { name } = req.body;
  if (!name) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const committee = await createCommittee(req.tenantId, req.body);
  setAuditData(res as any, { action: "create", entityType: "committee", entityId: committee.committee_id, afterState: committee });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'committee', entityId: committee.committee_id, data: committee } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.committee.created' });
  res.status(201).json(committee);
}));

router.put("/committees/:id", authenticate, requirePermission("governance.record.write"), validate({ params: idParam, body: updateCommitteeBody }), asyncHandler(async (req, res) => {
  const committee = await updateCommittee(req.tenantId, req.params.id as string, req.body);
  setAuditData(res as any, { action: "update", entityType: "committee", entityId: req.params.id as string, afterState: committee });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'committee', entityId: req.params.id as string, data: committee } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.committee.updated' });
  res.json(committee);
}));

router.delete("/committees/:id", authenticate, requirePermission("governance.record.delete"), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
  `DELETE FROM "${schema}".committees WHERE committee_id = $1 RETURNING committee_id`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "delete", entityType: "committee", entityId: req.params.id as string });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'committee', entityId: req.params.id as string } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.committee.deleted' });
  res.json({ deleted: true });
}));

// === DECISIONS ===

/**
 * @swagger
 * /governance/decisions:
 *   get:
 *     summary: List governance decisions and resolutions
 *     tags: [Governance]
 *     responses:
 *       200:
 *         description: Decision records
 */
router.get("/decisions", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
  `SELECT d.*, m.title AS meeting_title, c.name AS committee_name
  FROM "${schema}".governance_decisions d
  LEFT JOIN "${schema}".governance_meetings m ON m.meeting_id = d.meeting_id
  LEFT JOIN "${schema}".committees c ON c.committee_id = m.committee_id
  WHERE d.deleted_at IS NULL
  ORDER BY d.created_at DESC`
  );
  res.json({ decisions: result.rows, count: result.rows.length });
}));

// === COMMITTEE MEMBERS ===

router.get("/committees/:id/members", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `SELECT * FROM "${schema}".governance_committee_members WHERE committee_id = $1 AND deleted_at IS NULL ORDER BY is_chair DESC, created_at`,
  [req.params.id]
  );
  res.json({ members: result.rows, count: result.rows.length });
}));

router.post("/committees/:id/members", authenticate, requirePermission("governance.record.write"), validate({ body: addCommitteeMemberBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { user_id, role_in_committee, is_chair, voting_rights } = req.body;
  if (!user_id) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  if (is_chair) {
  await safeQuery(`UPDATE "${schema}".governance_committee_members SET is_chair = FALSE WHERE committee_id = $1 AND deleted_at IS NULL`, [req.params.id]);
  }
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_committee_members (committee_id, user_id, role_in_committee, is_chair, voting_rights, created_by)
  VALUES ($1, $2, $3, $4, $5, $6)
  ON CONFLICT (committee_id, user_id) DO UPDATE SET role_in_committee = $3, is_chair = $4, voting_rights = $5, deleted_at = NULL, updated_at = NOW()
  RETURNING *`,
  [req.params.id, user_id, role_in_committee || 'member', is_chair || false, voting_rights !== false, req.user?.userId]
  );
  setAuditData(res as any, { action: "create", entityType: "committee_member", entityId: getFirstRow(result)?.member_id });
  res.status(201).json(getFirstRow(result));
}));

router.delete("/committees/:cid/members/:mid", authenticate, requirePermission("governance.record.write"), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `UPDATE "${schema}".governance_committee_members SET deleted_at = NOW() WHERE member_id = $1 AND committee_id = $2 RETURNING member_id`,
  [req.params.mid, req.params.cid]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "delete", entityType: "committee_member", entityId: req.params.mid });
  res.json({ deleted: true });
}));

router.patch("/committees/:cid/members/:mid/chair", authenticate, requirePermission("governance.record.write"), validate({ body: updateChairBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  await safeQuery(`UPDATE "${schema}".governance_committee_members SET is_chair = FALSE WHERE committee_id = $1 AND deleted_at IS NULL`, [req.params.cid]);
  const result = await safeQuery(
  `UPDATE "${schema}".governance_committee_members SET is_chair = TRUE, role_in_committee = 'chair', updated_at = NOW() WHERE member_id = $1 AND committee_id = $2 RETURNING *`,
  [req.params.mid, req.params.cid]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(getFirstRow(result));
}));

// === MEETINGS ===

router.get("/committees/:id/meetings", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `SELECT m.*,
  (SELECT COUNT(*) FROM "${schema}".governance_agenda_items a WHERE a.meeting_id = m.meeting_id AND a.deleted_at IS NULL)::int AS agenda_count,
  (SELECT COUNT(*) FROM "${schema}".governance_decisions d WHERE d.meeting_id = m.meeting_id AND d.deleted_at IS NULL)::int AS decision_count
  FROM "${schema}".governance_meetings m
  WHERE m.committee_id = $1 AND m.deleted_at IS NULL
  ORDER BY m.scheduled_at DESC`,
  [req.params.id]
  );
  res.json({ meetings: result.rows, count: result.rows.length });
}));

router.post("/meetings", authenticate, requirePermission("governance.record.write"), validate({ body: createMeetingBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { committee_id, title, scheduled_at, location, duration_minutes } = req.body;
  if (!committee_id || !title || !scheduled_at) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_meetings (committee_id, title, scheduled_at, location, duration_minutes, created_by)
  VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
  [committee_id, title, scheduled_at, location || null, duration_minutes || null, req.user?.userId]
  );
  setAuditData(res as any, { action: "create", entityType: "meeting", entityId: getFirstRow(result)?.meeting_id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'meeting', entityId: getFirstRow(result)?.meeting_id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.meeting.created' });
  res.status(201).json(getFirstRow(result));
}));

router.put("/meetings/:id", authenticate, requirePermission("governance.record.write"), validate({ params: idParam, body: updateMeetingBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { title, scheduled_at, location, status, minutes, duration_minutes } = req.body;
  const result = await safeQuery(
  `UPDATE "${schema}".governance_meetings SET title = COALESCE($2, title), scheduled_at = COALESCE($3, scheduled_at),
  location = COALESCE($4, location), status = COALESCE($5, status), minutes = COALESCE($6, minutes),
  duration_minutes = COALESCE($7, duration_minutes), updated_at = NOW()
  WHERE meeting_id = $1 AND deleted_at IS NULL RETURNING *`,
  [req.params.id, title, scheduled_at, location, status, minutes, duration_minutes]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "update", entityType: "meeting", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'meeting', entityId: req.params.id as string } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.meeting.updated' });
  res.json(getFirstRow(result));
}));

router.delete("/meetings/:id", authenticate, requirePermission("governance.record.delete"), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `UPDATE "${schema}".governance_meetings SET deleted_at = NOW() WHERE meeting_id = $1 AND deleted_at IS NULL RETURNING meeting_id`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "delete", entityType: "meeting", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'meeting', entityId: req.params.id as string } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.meeting.deleted' });
  res.json({ deleted: true });
}));

// === DECISION CRUD + VOTES ===

router.post("/decisions", authenticate, requirePermission("governance.record.write"), validate({ body: createDecisionBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { meeting_id, agenda_item_id, decision_text, decision_type } = req.body;
  if (!meeting_id || !decision_text) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_decisions (meeting_id, agenda_item_id, decision_text, decision_type, created_by)
  VALUES ($1, $2, $3, $4, $5) RETURNING *`,
  [meeting_id, agenda_item_id || null, decision_text, decision_type || 'resolution', req.user?.userId]
  );
  setAuditData(res as any, { action: "create", entityType: "decision", entityId: getFirstRow(result)?.decision_id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'decision', entityId: getFirstRow(result)?.decision_id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.decision.created' });
  res.status(201).json(getFirstRow(result));
}));

router.put("/decisions/:id", authenticate, requirePermission("governance.record.write"), validate({ params: idParam, body: updateDecisionBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { decision_text, decision_type, status, effective_date, review_date } = req.body;
  const result = await safeQuery(
  `UPDATE "${schema}".governance_decisions SET decision_text = COALESCE($2, decision_text),
  decision_type = COALESCE($3, decision_type), status = COALESCE($4, status),
  effective_date = COALESCE($5, effective_date), review_date = COALESCE($6, review_date), updated_at = NOW()
  WHERE decision_id = $1 AND deleted_at IS NULL RETURNING *`,
  [req.params.id, decision_text, decision_type, status, effective_date, review_date]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "update", entityType: "decision", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'decision', entityId: req.params.id as string } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.decision.updated' });
  res.json(getFirstRow(result));
}));

router.get("/decisions/:id/votes", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `SELECT * FROM "${schema}".governance_decision_votes WHERE decision_id = $1 AND deleted_at IS NULL ORDER BY created_at`,
  [req.params.id]
  );
  res.json({ votes: result.rows, count: result.rows.length });
}));

router.post("/decisions/:id/votes", authenticate, requirePermission("governance.record.write"), validate({ body: createVoteBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { voter_user_id, vote, comments } = req.body;
  if (!voter_user_id || !vote) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_decision_votes (decision_id, voter_user_id, vote, comments, created_by)
  VALUES ($1, $2, $3, $4, $5)
  ON CONFLICT (decision_id, voter_user_id) DO UPDATE SET vote = $3, comments = $4, updated_at = NOW()
  RETURNING *`,
  [req.params.id, voter_user_id, vote, comments || null, req.user?.userId]
  );
  setAuditData(res as any, { action: "create", entityType: "decision_vote", entityId: getFirstRow(result)?.vote_id });
  res.status(201).json(getFirstRow(result));
}));

// === AGENDA ITEMS ===

router.get("/meetings/:id/agenda", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `SELECT * FROM "${schema}".governance_agenda_items WHERE meeting_id = $1 AND deleted_at IS NULL ORDER BY sort_order, created_at`,
  [req.params.id]
  );
  res.json({ items: result.rows, count: result.rows.length });
}));

router.post("/meetings/:id/agenda", authenticate, requirePermission("governance.record.write"), validate({ body: createAgendaItemBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const { title, description, sort_order } = req.body;
  if (!title) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const result = await safeQuery(
  `INSERT INTO "${schema}".governance_agenda_items (meeting_id, title, description, sort_order, created_by)
  VALUES ($1, $2, $3, $4, $5) RETURNING *`,
  [req.params.id, title, description || null, sort_order || 0, req.user?.userId]
  );
  setAuditData(res as any, { action: "create", entityType: "agenda_item", entityId: getFirstRow(result)?.agenda_item_id });
  res.status(201).json(getFirstRow(result));
}));

router.delete("/agenda/:id", authenticate, requirePermission("governance.record.write"), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
  `UPDATE "${schema}".governance_agenda_items SET deleted_at = NOW() WHERE agenda_item_id = $1 AND deleted_at IS NULL RETURNING agenda_item_id`,
  [req.params.id]
  );
  if (!getFirstRow(result)) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "delete", entityType: "agenda_item", entityId: req.params.id });
  res.json({ deleted: true });
}));

// === MEETING ATTENDEES ===

router.get("/meetings/:id/attendees", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const attendees = await getMeetingAttendees(req.tenantId, req.params.id);
  res.json({ attendees, count: attendees.length });
}));

router.post("/meetings/:id/attendees", authenticate, requirePermission("governance.record.write"), validate({ body: addMeetingAttendeeBody }), asyncHandler(async (req, res) => {
  const { user_id } = req.body;
  if (!user_id) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const attendee = await addMeetingAttendee(req.tenantId, req.params.id, {
  ...req.body, created_by: req.user?.userId,
  });
  setAuditData(res as any, { action: "create", entityType: "meeting_attendee", entityId: attendee.attendee_id });
  res.status(201).json(attendee);
}));

router.patch("/meetings/:mid/attendees/:aid", authenticate, requirePermission("governance.record.write"), validate({ body: updateAttendanceStatusBody }), asyncHandler(async (req, res) => {
  try {
  const { attendance_status } = req.body;
  if (!attendance_status) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const attendee = await updateAttendanceStatus(req.tenantId, req.params.mid, req.params.aid, attendance_status);
  setAuditData(res as any, { action: "update", entityType: "meeting_attendee", entityId: req.params.aid });
  res.json(attendee);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "Attendee not found" ? 404 : 500).json({ error: toErrorMessage(err) === "Attendee not found" ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

router.get("/meetings/:id/quorum", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const quorum = await checkQuorum(req.tenantId, req.params.id);
  res.json(quorum);
}));

// === POLICY REJECT + PUBLISH ===
// Law 2 compliance: Policy lifecycle operations (reject, publish) are owned by the policy module.
// @see modules/policy/routes/policy-lifecycle.routes.ts for the canonical implementation.
// The policy routes are delegated above via `router.use("/policies", policyRoutes)`.

// === GOVERNANCE CALENDAR AGGREGATE ===

router.get("/calendar", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);
  const meetings = await safeQuery(
  `SELECT meeting_id AS id, 'meeting' AS type, title, scheduled_at AS date, status, committee_id FROM "${schema}".governance_meetings WHERE deleted_at IS NULL AND scheduled_at >= NOW() - INTERVAL '7 days' ORDER BY scheduled_at LIMIT 100`
  );
  const policyReviews = await safeQuery(
  `SELECT policy_id AS id, 'policy_review' AS type, title, next_review_date AS date, status FROM "${schema}".policies WHERE deleted_at IS NULL AND next_review_date IS NOT NULL ORDER BY next_review_date LIMIT 100`
  );
  const exceptionExpiries = await safeQuery(
  `SELECT exception_id AS id, 'exception_expiry' AS type, COALESCE(title, 'Exception ' || exception_id) AS title, expiry_date AS date, status FROM "${schema}".exceptions WHERE deleted_at IS NULL AND expiry_date IS NOT NULL AND status NOT IN ('expired','rejected') ORDER BY expiry_date LIMIT 100`
  );
  const items = [...meetings.rows, ...policyReviews.rows, ...exceptionExpiries.rows]
  .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
  res.json({ items, count: items.length });
}));

// === GRC PLANS ===

router.get("/plans", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const plans = await getGRCPlans(req.tenantId);
  res.json(plans);
}));

router.post("/plans", authenticate, requirePermission("governance.record.write"), validate({ body: createGRCPlanBody }), asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const plan = await createGRCPlan(req.tenantId, {
  ...req.body, created_by: req.user.userId,
  });
  setAuditData(res as any, { action: "create", entityType: "grc_plan", entityId: plan.plan_id, afterState: plan });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'grc_plan', entityId: plan.plan_id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.grc_plan.created' });
  res.status(201).json(plan);
}));

router.get("/plans/:id", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const plan = await getGRCPlanById(req.tenantId, req.params.id as string);
  if (!plan) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(plan);
}));

router.put("/plans/:id", authenticate, requirePermission("governance.record.write"), validate({ params: idParam, body: updateGRCPlanBody }), asyncHandler(async (req, res) => {
  const plan = await updateGRCPlan(req.tenantId, req.params.id as string, req.body);
  setAuditData(res as any, { action: "update", entityType: "grc_plan", entityId: req.params.id as string, afterState: plan });
  res.json(plan);
}));

router.delete("/plans/:id", authenticate, requirePermission("governance.record.delete"), validate({ body: genericGovernanceSchema }), asyncHandler(async (req, res) => {
  const before = await getGRCPlanById(req.tenantId, req.params.id as string);
  const deleted = await deleteGRCPlan(req.tenantId, req.params.id as string);
  if (!deleted) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: "delete", entityType: "grc_plan", entityId: req.params.id as string, beforeState: before });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'deleted', entityType: 'grc_plan', entityId: req.params.id as string } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.grc_plan.deleted' });
  res.json({ deleted: true });
}));

// === SLA DEADLINES ===

router.get("/sla-deadlines", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const deadlines = await checkSLADeadlines(req.tenantId);
  res.json(deadlines);
}));

// === GOVERNANCE ACTION ITEMS ===

router.get("/action-items", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const filters = {
  status: req.query.status as string | undefined,
  source_type: req.query.source_type as string | undefined,
  assigned_to: req.query.assigned_to as string | undefined,
  board_attention: req.query.board_attention === 'true' ? true : undefined,
  };
  const items = await listGovernanceActionItems(req.tenantId, filters);
  res.json({ action_items: items, count: items.length });
}));

router.get("/action-items/:id", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const item = await getGovernanceActionItem(req.tenantId, req.params.id);
  res.json(item);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "Action item not found" ? 404 : 500).json({ error: toErrorMessage(err) === "Action item not found" ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

router.post("/action-items", authenticate, requirePermission("governance.record.write"), validate({ body: createActionItemBody }), asyncHandler(async (req, res) => {
  const { title } = req.body;
  if (!title) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const item = await createGovernanceActionItem(req.tenantId, {
  ...req.body, created_by: req.user?.userId,
  });
  setAuditData(res as any, { action: "create", entityType: "governance_action_item", entityId: item.action_item_id, afterState: item });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'created', entityType: 'governance_action_item', entityId: item.action_item_id } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_action_item.created' });
  // Emit governance.action_created for cross-module event contract

  emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'action_created', entityType: 'governance_action_item', entityId: item.action_item_id, data: item } as any)).catch(catchHandler(EC.EVENT_BUS));
  res.status(201).json(item);
}));

router.put("/action-items/:id", authenticate, requirePermission("governance.record.write"), validate({ params: idParam, body: updateActionItemBody }), asyncHandler(async (req, res) => {
  try {
  const item = await updateGovernanceActionItem(req.tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: "update", entityType: "governance_action_item", entityId: req.params.id, afterState: item });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'updated', entityType: 'governance_action_item', entityId: req.params.id as string } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_action_item.updated' });
  res.json(item);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "Action item not found" ? 404 : 500).json({ error: toErrorMessage(err) === "Action item not found" ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

router.post("/action-items/:id/updates", authenticate, requirePermission("governance.record.write"), validate({ body: addActionUpdateBody }), asyncHandler(async (req, res) => {
  const { update_text } = req.body;
  if (!update_text) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const update = await addActionUpdate(req.tenantId, req.params.id, {
  update_text, updated_by: req.user?.userId,
  });
  setAuditData(res as any, { action: "create", entityType: "action_update", entityId: update.update_id });
  res.status(201).json(update);
}));

router.get("/action-items/:id/updates", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const updates = await getActionUpdates(req.tenantId, req.params.id);
  res.json({ updates, count: updates.length });
}));

router.patch("/action-items/:id/escalate", authenticate, requirePermission("governance.record.write"), validate({ body: updateEscalateBody }), asyncHandler(async (req, res) => {
  try {
  const item = await escalateActionItem(req.tenantId, req.params.id);
  setAuditData(res as any, { action: "update", entityType: "governance_action_item", entityId: req.params.id, afterState: item });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'escalated', entityType: 'governance_action_item', entityId: req.params.id as string } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_action_item.escalated' });
  res.json(item);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "Action item not found" ? 404 : 500).json({ error: toErrorMessage(err) === "Action item not found" ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

router.patch("/action-items/:id/close", authenticate, requirePermission("governance.record.write"), validate({ body: closeActionItemBody }), asyncHandler(async (req, res) => {
  try {
  const { closure_evidence } = req.body;
  if (!closure_evidence) { res.status(400).json({ error: errMsg('MISSING_FIELDS', req) }); return; }
  const item = await closeActionItem(req.tenantId, req.params.id, closure_evidence);
  setAuditData(res as any, { action: "update", entityType: "governance_action_item", entityId: req.params.id, afterState: item });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'closed', entityType: 'governance_action_item', entityId: req.params.id as string } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.governance_action_item.closed' });
  res.json(item);
  } catch (err: unknown) {
  res.status(toErrorMessage(err) === "Action item not found" ? 404 : 500).json({ error: toErrorMessage(err) === "Action item not found" ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

// === GOVERNANCE ENFORCEMENT ===

router.get("/enforcement/violations", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const filters = {
  severity: req.query.severity as string | undefined,
  entity_type: req.query.entity_type as string | undefined,
  resolved: req.query.resolved === 'true' ? true : req.query.resolved === 'false' ? false : undefined,
  };
  const violations = await getViolations(req.tenantId, filters);
  res.json({ violations, count: violations.length });
}));

router.get("/enforcement/summary", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const summary = await getViolationSummary(req.tenantId);
  res.json(summary);
}));

router.post("/enforcement/scan", authenticate, requirePermission("governance.record.write"), validate({ body: createScanBody }), asyncHandler(async (req, res) => {
  const results = await runEnforcementScan(req.tenantId);
  res.json({ results, count: results.length });
}));

router.post("/enforcement/violations/:id/resolve", authenticate, requirePermission("governance.record.write"), validate({ body: createResolveBody }), asyncHandler(async (req, res) => {
  try {
  const violation = await resolveViolation(req.tenantId, req.params.id, req.user?.userId);
  setAuditData(res as any, { action: "update", entityType: "enforcement_log", entityId: req.params.id });
  swallow(EC.EVENT_BUS, emitEvent(({ tenantId: req.tenantId!, userId: req.user!.userId!, module: 'governance', event: 'resolved', entityType: 'enforcement_violation', entityId: req.params.id as string } as any)), { tenantId: req.tenantId!, operation: 'grcEvent:governance.enforcement_violation.resolved' });
  res.json(violation);
  } catch (err: unknown) {
  res.status(toErrorMessage(err).includes("not found") ? 404 : 500).json({ error: toErrorMessage(err).includes("not found") ? errMsg('NOT_FOUND', req) : errMsg('INTERNAL_ERROR', req) });
  }
}));

// === AUDIT PACKAGE ===

router.post("/audit-package/:assessmentId", authenticate, requirePermission("governance.record.read"), validate({ body: createAuditPackageBody }), asyncHandler(async (req, res) => {
  try {
  const pkg = await generateAssessmentAuditPackage(req.tenantId, req.params.assessmentId as string, req.user?.role);
  res.json(pkg);
  } catch (err: unknown) {
  if (toErrorMessage(err) === "Assessment not found") {
  res.status(404).json({ error: errMsg('ASSESSMENT_NOT_FOUND', req) });
  return;
  }
  res.status(500).json({ error: errMsg('INTERNAL_ERROR', req) });
  }
}));

// === SoD Conflict Detection (Priority 13) ===

router.get("/sod-conflicts", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { getOpenSoDConflicts } = await import("../../services/governance/sod-conflict-detector.service.js");

  const filters = {
  userId: req.query.userId as string | undefined,
  conflictType: req.query.conflictType as string | undefined,
  severity: req.query.severity as string | undefined,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  offset: req.query.offset ? parseInt(req.query.offset as string, 10) : undefined
  };

  const result = await getOpenSoDConflicts(req.tenantId, filters);
  res.json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

router.post("/sod-conflicts/detect", authenticate, requirePermission("governance.record.write"), validate({ body: createDetectBody }), asyncHandler(async (req, res) => {
  try {
  const { detectSoDConflicts } = await import("../../services/governance/sod-conflict-detector.service.js");
  const result = await detectSoDConflicts(req.tenantId);
  setAuditData(res as any, { action: "execute", entityType: "sod_scan", entityId: `scan-${Date.now()}`, afterState: result });
  res.json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

router.post("/sod-conflicts/:conflictId/resolve", authenticate, requirePermission("governance.record.write"), validate({ body: resolveSoDConflictBody }), asyncHandler(async (req, res) => {
  try {
  const { resolveSoDConflict } = await import("../../services/governance/sod-conflict-detector.service.js");
  const { status, resolvedBy, resolutionNote } = req.body;

  if (!status || !resolvedBy) {
  res.status(400).json({ error: "status and resolvedBy are required" });
  return;
  }

  if (!['mitigated', 'accepted', 'resolved'].includes(status)) {
  res.status(400).json({ error: "status must be one of: mitigated, accepted, resolved" });
  return;
  }

  await resolveSoDConflict(req.tenantId, req.params.conflictId, {
  status: status as 'mitigated' | 'accepted' | 'resolved',
  resolvedBy,
  resolutionNote: resolutionNote || undefined
  });

  setAuditData(res as any, { action: "update", entityType: "sod_conflict", entityId: req.params.conflictId, afterState: { status, resolvedBy, resolutionNote } });
  res.json({ success: true, conflictId: req.params.conflictId, status });
  } catch (err: unknown) {
  const code = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(code).json({ error: toErrorMessage(err) });
  }
}));

// === SoD Conflict Detection Enhancements ===

router.post("/sod-conflicts/bulk-resolve", authenticate, requirePermission("governance.record.write"), validate({ body: bulkResolveSoDConflictBody }), asyncHandler(async (req, res) => {
  try {
  const { bulkResolveConflicts } = await import("../../services/governance/sod-conflict-detector.service.js");
  const { conflictIds, status, resolvedBy, resolutionNote } = req.body;

  if (!Array.isArray(conflictIds) || conflictIds.length === 0 || !status || !resolvedBy) {
  res.status(400).json({ error: "conflictIds (array), status, and resolvedBy are required" });
  return;
  }

  if (!['mitigated', 'accepted', 'resolved'].includes(status)) {
  res.status(400).json({ error: "status must be one of: mitigated, accepted, resolved" });
  return;
  }

  const result = await bulkResolveConflicts(req.tenantId, conflictIds, {
  status: status as 'mitigated' | 'accepted' | 'resolved',
  resolvedBy,
  resolutionNote: resolutionNote || undefined
  });

  setAuditData(res as any, { action: "bulk_update", entityType: "sod_conflict", entityId: `bulk-${Date.now()}`, afterState: result });
  res.json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

router.get("/sod-conflicts/:conflictId/suggestions", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { getOpenSoDConflicts, suggestRemediation } = await import("../../services/governance/sod-conflict-detector.service.js");
  const conflicts = await getOpenSoDConflicts(req.tenantId, { limit: 1000 });
  const conflict = conflicts.conflicts.find(c => c.conflictId === req.params.conflictId);

  if (!conflict) {
  res.status(404).json({ error: "Conflict not found" });
  return;
  }

  const suggestions = await suggestRemediation(req.tenantId, conflict);
  res.json({ suggestions });
  } catch (err: unknown) {
  const code = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(code).json({ error: toErrorMessage(err) });
  }
}));

router.get("/sod-conflicts/trends", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { getConflictTrends } = await import("../../services/governance/sod-conflict-detector.service.js");
  const days = req.query.days ? parseInt(req.query.days as string, 10) : 30;
  const trends = await getConflictTrends(req.tenantId, days);
  res.json({ trends, days });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

router.get("/sod-conflicts/patterns", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { detectConflictPatterns } = await import("../../services/governance/sod-conflict-detector.service.js");
  const patterns = await detectConflictPatterns(req.tenantId);
  res.json({ patterns, count: patterns.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

router.get("/sod-conflicts/:conflictId/history", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { getConflictResolutionHistory } = await import("../../services/governance/sod-conflict-detector.service.js");
  const history = await getConflictResolutionHistory(req.tenantId, req.params.conflictId);
  res.json({ history, count: history.length });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

router.post("/sod-conflicts/:conflictId/reopen", authenticate, requirePermission("governance.record.write"), validate({ body: reopenSoDConflictBody }), asyncHandler(async (req, res) => {
  try {
  const { reopenSoDConflict } = await import("../../services/governance/sod-conflict-detector.service.js");
  const { reopenedBy, reason } = req.body;

  if (!reopenedBy || !reason) {
  res.status(400).json({ error: "reopenedBy and reason are required" });
  return;
  }

  await reopenSoDConflict(req.tenantId, req.params.conflictId, reopenedBy, reason);
  setAuditData(res as any, { action: "update", entityType: "sod_conflict", entityId: req.params.conflictId, afterState: { status: "open", reason } });
  res.json({ success: true, conflictId: req.params.conflictId, status: "open" });
  } catch (err: unknown) {
  const code = toErrorMessage(err).includes("not found") ? 404 : 500;
  res.status(code).json({ error: toErrorMessage(err) });
  }
}));

router.post("/sod-conflicts/check-before-assignment", authenticate, requirePermission("governance.record.write"), validate({ body: checkSoDBeforeAssignmentBody }), asyncHandler(async (req, res) => {
  try {
  const { checkSoDBeforeAssignment } = await import("../../services/governance/sod-conflict-detector.service.js");
  const { userId, assignment } = req.body;

  if (!userId || !assignment) {
  res.status(400).json({ error: "userId and assignment are required" });
  return;
  }

  const result = await checkSoDBeforeAssignment(req.tenantId, userId, assignment);
  res.json(result);
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

router.get("/sod-conflicts/export", authenticate, requirePermission("governance.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const { getOpenSoDConflicts } = await import("../../services/governance/sod-conflict-detector.service.js");
  const format = (req.query.format as string) || 'csv';
  const allConflicts = await getOpenSoDConflicts(req.tenantId, { limit: 10000 });

  if (format === 'csv') {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="sod-conflicts-${Date.now()}.csv"`);
  
  const csvRows = [
  ['Conflict ID', 'User', 'Email', 'Conflict Type', 'Scope Type', 'Scope ID', 'Scope Name', 'Severity', 'Risk Score', 'Detected At', 'Status', 'Resolved At', 'Resolved By', 'Resolution Note'].join(','),
  ...allConflicts.conflicts.map(c => [
  c.conflictId,
  c.userName || '',
  c.userEmail || '',
  c.conflictType,
  c.scopeType,
  c.scopeId,
  c.scopeName || '',
  c.severity,
  c.riskScore?.toString() || '',
  c.detectedAt,
  c.status,
  c.resolvedAt || '',
  c.resolvedBy || '',
  (c.resolutionNote || '').replace(/"/g, '""')
  ].map(v => `"${v}"`).join(','))
  ];
  
  res.send(csvRows.join('\n'));
  } else {
  res.json({ conflicts: allConflicts.conflicts, total: allConflicts.total, exportedAt: new Date().toISOString() });
  }
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err) });
  }
}));

export default router;


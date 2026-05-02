import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Policy Publication Routes
// API endpoints for policy publication campaigns:
// create, list, delivery status, reminders, recall.
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, moduleStack, injectScopeContext } from '../ports/middleware.port';
import { errMsg } from '../../../i18n/error-messages';
import { safeQuery, tenantSchema } from '../ports/database.port';

import { createPolicyBody, createRemindBody, createRecallBody } from '../schemas/policy.schemas';
import {
  createPublication,
  listPublications,
  getPublicationStatus,
  createDeliveryRecords,
  sendPublicationReminders,
  recallPublication,
} from '../services/policy/policy-publication.service';

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware('policy'));
router.use(injectScopeContext);

/**
 * GET /
 * List policy publications with optional filters.
 * Query: ?policyId=xxx&status=sent&channel=portal
 */
router.get('/', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const filters = {
    policyId: req.query.policyId as string | undefined,
    status: req.query.status as string | undefined,
    channel: req.query.channel as string | undefined,
  };
  const publications = await listPublications(tenantId, filters);
  res.json({ publications, count: publications.length });
}));

/**
 * POST /
 * Create a new policy publication campaign.
 * Body: { policyId, policyVersionId?, campaignName, publishChannel,
 *         audiences: [...], message?, scheduledAt? }
 * Also creates delivery records for all users in the targeted audiences.
 */
router.post('/', authenticate, requirePermission('policy.document.manage'), validate({ body: createPolicyBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  if (!userId) { res.status(401).json({ error: 'User ID required' }); return; }

  const { policyId, policyVersionId, campaignName, publishChannel,
          audiences, message, scheduledAt } = req.body;
  if (!policyId || !campaignName || !publishChannel || !audiences || !Array.isArray(audiences)) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }

  const publication = await createPublication(tenantId, {
    policyId,
    policyVersionId,
    campaignName,
    publishedBy: userId,
    publishChannel,
    audiences,
    message,
    scheduledAt,
  });

  // Resolve target user IDs from audiences and create delivery records
  const schema = tenantSchema(tenantId);
  const userIdsSet = new Set<string>();
  for (const audience of audiences) {
    if (audience.audienceType === 'user' && audience.audienceRef) {
      userIdsSet.add(audience.audienceRef);
    } else if (audience.audienceType === 'team' && audience.audienceRef) {
      // Resolve team members
      const teamMembers = await safeQuery(
        `SELECT user_id FROM "${schema}".team_members WHERE team_id = $1`,
        [audience.audienceRef],
      );
      for (const m of teamMembers.rows) {
        if (m.user_id) userIdsSet.add(m.user_id as string);
      }
    } else if (audience.audienceType === 'department' && audience.audienceRef) {
      // Resolve department members
      const deptMembers = await safeQuery(
        `SELECT user_id FROM "${schema}".users WHERE department_id = $1`,
        [audience.audienceRef],
      );
      for (const m of deptMembers.rows) {
        if (m.user_id) userIdsSet.add(m.user_id as string);
      }
    } else if (audience.audienceType === 'all') {
      // All active users in the tenant
      const allUsers = await safeQuery(
        `SELECT user_id FROM "${schema}".users WHERE status = 'active'`,
        [],
      );
      for (const m of allUsers.rows) {
        if (m.user_id) userIdsSet.add(m.user_id as string);
      }
    }
  }

  let deliveryResult = { insertedCount: 0 };
  if (userIdsSet.size > 0) {
    deliveryResult = await createDeliveryRecords(
      tenantId,
      (publication as any).publication_id,
      Array.from(userIdsSet),
    );
  }

  setAuditData(res as any, {
    action: 'create',
    entityType: 'policy_publication',
    entityId: (publication as any).publication_id,
    afterState: publication,
  });
  res.status(201).json({ publication, deliveryRecordsCreated: deliveryResult.insertedCount });
}));

/**
 * GET /:id/status
 * Get publication delivery status with aggregate stats.
 * Returns: total, delivered, viewed, acknowledged, declined, pending, completionRate
 */
router.get('/:id/status', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await getPublicationStatus(tenantId, req.params.id);
  if (!result) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  res.json(result);
}));

/**
 * POST /:id/remind
 * Send reminders for overdue (unacknowledged) deliveries.
 */
router.post('/:id/remind', authenticate, requirePermission('policy.document.manage'), validate({ body: createRemindBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const result = await sendPublicationReminders(tenantId, req.params.id);
  setAuditData(res as any, { action: 'update', entityType: 'policy_publication', entityId: req.params.id });
  res.json(result);
}));

/**
 * POST /:id/recall
 * Recall a publication, preventing further delivery and acknowledgment.
 * Body: { reason }
 */
router.post('/:id/recall', authenticate, requirePermission('policy.document.manage'), validate({ body: createRecallBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const userId = req.user!.userId!;
  if (!userId) { res.status(401).json({ error: 'User ID required' }); return; }

  const { reason } = req.body;
  if (!reason) {
    res.status(400).json({ error: 'reason is required' });
    return;
  }

  const result = await recallPublication(tenantId, req.params.id, userId, reason);
  if (!result) { res.status(404).json({ error: errMsg('NOT_FOUND', req) }); return; }
  setAuditData(res as any, { action: 'update', entityType: 'policy_publication', entityId: req.params.id, afterState: result });
  res.json(result);
}));

export default router;


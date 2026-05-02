import { Request, Response, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

/**
 * Workflow 3-Level Drafts routes — draft actions CRUD, recommendation catalog.
 */

import { authenticate, requirePermission } from '../../ports/auth.port';
import { setAuditData, validate, blockInHumanOnlyMode } from '../../ports/middleware.port';
import { toErrorMessage } from '@dos/module-sdk';
import { createDraftBody, upsertCatalogBody, createAcceptBody, createRejectBody, createConvertBody } from '../../schemas/workflow.schemas';

import * as drafts from '../../services/approvals/workflow-draft-actions.service';
import * as catalog from '../../services/ai/workflow-recommendation-catalog.service';
export function registerDraftsRoutes(router: Router): void {
  // ── L2: Draft Actions ──
  router.post(
    '/workflows/draft-actions',
    authenticate, requirePermission('workflow.autonomous.write'), blockInHumanOnlyMode(),
    validate({ body: createDraftBody }),
    async (req: Request, res: Response) => {
      try {
        const draft = await drafts.createDraftAction(req.tenantId!, req.body);
        setAuditData(res as any, { action: 'create', entityType: 'workflow_draft_action', entityId: draft.draft_id });
        res.status(201).json(draft);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.get(
    '/workflows/:instanceId/draft-actions', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const result = await drafts.getDraftsByInstance(req.tenantId!, req.params.instanceId as string, {
          status: req.query.status as any,
          draftType: req.query.draftType as any,
          limit: req.query.limit ? Number(req.query.limit) : undefined,
          offset: req.query.offset ? Number(req.query.offset) : undefined,
        });
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/draft-actions/:draftId/accept',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: createAcceptBody }),
    async (req: Request, res: Response) => {
      try {
        const result = await drafts.acceptDraft(req.tenantId!, req.params.draftId as string, req.userId!, req.body.modifications);
        if (!result) { res.status(404).json({ error: 'Draft not found or already resolved' }); return; }
        setAuditData(res as any, { action: 'update', entityType: 'workflow_draft_action', entityId: req.params.draftId as string });
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/draft-actions/:draftId/reject',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: createRejectBody }),
    async (req: Request, res: Response) => {
      try {
        const { reason } = req.body;
        if (!reason) { res.status(400).json({ error: 'Rejection reason required' }); return; }
        const result = await drafts.rejectDraft(req.tenantId!, req.params.draftId as string, req.userId!, reason);
        if (!result) { res.status(404).json({ error: 'Draft not found or already resolved' }); return; }
        setAuditData(res as any, { action: 'update', entityType: 'workflow_draft_action', entityId: req.params.draftId as string });
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.post(
    '/workflows/draft-actions/:draftId/convert',
    authenticate, requirePermission('workflow.autonomous.write'),
    validate({ body: createConvertBody }),
    async (req: Request, res: Response) => {
      try {
        const { entityType, entityId } = req.body;
        if (!entityType || !entityId) { res.status(400).json({ error: 'entityType and entityId required' }); return; }
        const result = await drafts.convertDraft(req.tenantId!, req.params.draftId as string, req.userId!, entityType, entityId);
        if (!result) { res.status(404).json({ error: 'Draft not found or not accepted' }); return; }
        res.json(result);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.get(
    '/workflows/draft-actions/pending', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.autonomous.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await drafts.getPendingDrafts(req.tenantId!);
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  // ── L2: Recommendation Catalog ──
  router.get(
    '/workflows/recommendation-catalog', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await catalog.getCatalog(req.tenantId!, {
          category: req.query.category as any,
          activeOnly: req.query.activeOnly !== 'false',
        });
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.get(
    '/workflows/recommendation-catalog/applicable/:stepType', validate({ query: z.record(z.unknown()) }), authenticate, requirePermission('workflow.instance.read'),
    async (req: Request, res: Response) => {
      try {
        const items = await catalog.getApplicableRecommendations(req.tenantId!, req.params.stepType as string);
        res.json({ items, count: items.length });
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );

  router.put(
    '/workflows/recommendation-catalog',
    authenticate, requirePermission('workflow.autonomous.config'),
    validate({ body: upsertCatalogBody }),
    async (req: Request, res: Response) => {
      try {
        const entry = await catalog.upsertCatalogEntry(req.tenantId!, req.body);
        res.json(entry);
      } catch (err: unknown) { res.status(500).json({ error: toErrorMessage(err) }); }
    },
  );
}


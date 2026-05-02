import { Request, Response, Router } from 'express';
import { z } from "zod";
import { logger } from '../../../../ports/logger.port';

const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Shahin-Ai — Frameworks CRUD Routes
// Mounted at /api/frameworks
//
// Provides POST / PUT / DELETE endpoints for
// framework management. The GET endpoint is
// already served by dashboard.routes.ts at
// GET /api/dashboard/frameworks.
//
// Multi-tenant: uses tenantSchema() for isolation.
// ============================================


import { authenticate, requirePermission } from '../../../../ports/auth.port';
import { query as _query, safeQuery, tenantSchema } from '../../../../ports/database.port';
import { getFirstRowOrThrow } from '@dos/db';
import { emitEvent } from '../../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { auditMiddleware, setAuditData, automationMiddleware, validate, moduleStack } from '../../../../ports/middleware.port';
import { swallow, EC } from '../../../../ports/resilience.port';
import { createFrameworkBody, updateFrameworkBody, genericComplianceSchema } from "../../../../schemas/compliance.schemas";

const router = Router();
router.use(moduleStack('compliance'));
router.use(auditMiddleware('compliance'));
router.use(automationMiddleware('compliance'));

// ── GET / — List all frameworks ───────────────────────────────────────────
router.get(
  '/', validate({ query: z.record(z.unknown()) }), authenticate,
  requirePermission('framework.record.read'),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const schema = tenantSchema(tenantId);
      const includeRemoved = req.query.includeRemoved === 'true';
      const whereClause = includeRemoved ? '' : `WHERE (removed_by_admin IS NULL OR removed_by_admin = FALSE)`;
      // secrets-scan-allow: schema tenantSchema()-validated; whereClause is a compile-time constant string (include-removed toggle)
      const result = await safeQuery(`SELECT * FROM "${schema}".frameworks ${whereClause} ORDER BY created_at`);
      res.json(result.rows.map((f: Record<string, unknown>) => ({
        frameworkId: f.framework_id, name: f.name, description: f.description,
        category: f.category, totalControls: f.total_controls,
        implementedControls: f.implemented_controls, completionPercent: f.completion_percent,
        status: f.status, targetDate: f.target_date,
        seedingTier: f.seeding_tier || 'mandatory',
        removedByAdmin: f.removed_by_admin || false,
        removedAt: f.removed_at, removedReason: f.removed_reason,
      })));
    } catch (err: unknown) {
      logger.error('[frameworks] GET / error:', err);
      res.status(500).json({ error: toErrorMessage(err) || 'Failed to list frameworks' });
    }
  },
);

// ── POST / — Create a new framework ───────────────────────────────────────
router.post(
  '/',
  authenticate,
  requirePermission('framework.record.write'),
  validate({ body: createFrameworkBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const schema = tenantSchema(tenantId);
      const {
        name,
        description,
        category,
        totalControls,
        status,
        targetDate,
      } = req.body;

      if (!name) {
        res.status(400).json({ error: 'name is required' });
        return;
      }

      const result = await safeQuery(
        `INSERT INTO "${schema}".frameworks
           (name, description, category, total_controls, implemented_controls, completion_percent, status, target_date)
         VALUES ($1, $2, $3, $4, 0, 0, $5, $6)
         RETURNING *`,
        [
          name,
          description || null,
          category || null,
          totalControls || 0,
          status || 'draft',
          targetDate || null,
        ],
      );

      const f = getFirstRowOrThrow(result, 'Framework creation failed');
      setAuditData(res as any, { action: 'create', entityType: 'framework', entityId: f.framework_id, afterState: f });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'frameworks', event: 'created', entityType: 'framework', entityId: f.framework_id, data: f } as any)), { tenantId: tenantId, operation: 'grcEvent:frameworks.framework.created' });
      res.status(201).json({
        frameworkId: f.framework_id,
        name: f.name,
        description: f.description,
        category: f.category,
        totalControls: f.total_controls,
        implementedControls: f.implemented_controls,
        completionPercent: f.completion_percent,
        status: f.status,
        targetDate: f.target_date,
      });
    } catch (err: unknown) {
      logger.error('[frameworks] POST / error:', err);
      res.status(500).json({ error: toErrorMessage(err) || 'Failed to create framework' });
    }
  },
);

// ── PUT /:id — Update an existing framework ───────────────────────────────
router.put(
  '/:id',
  authenticate,
  requirePermission('framework.record.write'),
  validate({ body: updateFrameworkBody }),
  async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const schema = tenantSchema(tenantId);
      const frameworkId = req.params.id;
      const {
        name,
        description,
        category,
        totalControls,
        implementedControls,
        completionPercent,
        status,
        targetDate,
      } = req.body;

      // Build dynamic SET clause
      const sets: string[] = [];
      const params: unknown[] = [];
      let idx = 1;

      if (name !== undefined) { sets.push(`name = $${idx++}`); params.push(name); }
      if (description !== undefined) { sets.push(`description = $${idx++}`); params.push(description); }
      if (category !== undefined) { sets.push(`category = $${idx++}`); params.push(category); }
      if (totalControls !== undefined) { sets.push(`total_controls = $${idx++}`); params.push(totalControls); }
      if (implementedControls !== undefined) { sets.push(`implemented_controls = $${idx++}`); params.push(implementedControls); }
      if (completionPercent !== undefined) { sets.push(`completion_percent = $${idx++}`); params.push(completionPercent); }
      if (status !== undefined) { sets.push(`status = $${idx++}`); params.push(status); }
      if (targetDate !== undefined) { sets.push(`target_date = $${idx++}`); params.push(targetDate); }

      if (sets.length === 0) {
        res.status(400).json({ error: 'No fields provided for update' });
        return;
      }

      sets.push(`updated_at = NOW()`);

      const result = await safeQuery(
        `UPDATE "${schema}".frameworks
         SET ${sets.join(', ')}
         WHERE framework_id = $${idx}
         RETURNING *`,
        [...params, frameworkId],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Framework not found' });
        return;
      }

      const f = getFirstRowOrThrow(result, 'Framework not found');
      setAuditData(res as any, { action: 'update', entityType: 'framework', entityId: frameworkId, afterState: f });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'frameworks', event: 'updated', entityType: 'framework', entityId: frameworkId, data: f } as any)), { tenantId: tenantId, operation: 'grcEvent:frameworks.framework.updated' });
      res.json({
        frameworkId: f.framework_id,
        name: f.name,
        description: f.description,
        category: f.category,
        totalControls: f.total_controls,
        implementedControls: f.implemented_controls,
        completionPercent: f.completion_percent,
        status: f.status,
        targetDate: f.target_date,
      });
    } catch (err: unknown) {
      logger.error('[frameworks] PUT /:id error:', err);
      res.status(500).json({ error: toErrorMessage(err) || 'Failed to update framework' });
    }
  },
);

// ── DELETE /:id — Delete a framework ──────────────────────────────────────
router.delete(
  '/:id',
  authenticate,
  requirePermission('framework.record.write'), validate({ body: genericComplianceSchema }), async (req: Request, res: Response) => {
    try {
      const tenantId = req.tenantId!;
      const schema = tenantSchema(tenantId);
      const frameworkId = req.params.id;

      const result = await safeQuery(
        `DELETE FROM "${schema}".frameworks WHERE framework_id = $1 RETURNING framework_id`,
        [frameworkId],
      );

      if (result.rows.length === 0) {
        res.status(404).json({ error: 'Framework not found' });
        return;
      }

      setAuditData(res as any, { action: 'delete', entityType: 'framework', entityId: frameworkId });
      swallow(EC.EVENT_BUS, emitEvent(({ tenantId, userId: req.user!.userId!, module: 'frameworks', event: 'deleted', entityType: 'framework', entityId: frameworkId } as any)), { tenantId: tenantId, operation: 'grcEvent:frameworks.framework.deleted' });
      res.json({ success: true, deleted: frameworkId });
    } catch (err: unknown) {
      logger.error('[frameworks] DELETE /:id error:', err);
      res.status(500).json({ error: toErrorMessage(err) || 'Failed to delete framework' });
    }
  },
);

export default router;


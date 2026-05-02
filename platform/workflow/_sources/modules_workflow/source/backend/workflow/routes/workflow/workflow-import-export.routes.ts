import { Request, Response, NextFunction as _NextFunction, Router } from 'express';
import { z } from "zod";

const genericPayloadSchema = z.record(z.unknown());

import { emitEvent as _emitEvent } from '../../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
/**
 * Workflow Import/Export Routes
 *
 * Export: bundles workflow_definitions + workflow_steps + workflow_transitions
 * into a portable JSON structure.
 * Import: validates the incoming JSON, inserts a new workflow definition with
 * its steps and transitions, and returns the new workflow ID.
 */

import { z as _z } from "zod";
import { authenticate, requirePermission } from '../../ports/auth.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';

import { validate, ok, NotFoundError } from "../../utils/route-kit";
import { asyncHandler, auditMiddleware, tenantGuard, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { getFirstRow } from "@dos/db";
import { exportParams, importBody } from "../../schemas/workflow.schemas";
const router = Router();
router.use(moduleStack('workflow'));
router.use(mutationEventHook('workflow'));
router.use(auditMiddleware("workflows"));
router.use(authenticate as any);
router.use(tenantGuard());

// ── Zod Schemas ──────────────────────────────────────────────────────────
// ── Export Workflow ──────────────────────────────────────────────────────

router.get("/:id/export",
  requirePermission("workflow.instance.read"),
  validate({ params: exportParams }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const { id } = req.params;

    // Fetch the workflow definition
    const defResult = await safeQuery(
      `SELECT * FROM "${schema}".workflow_definitions WHERE workflow_id = $1`,
      [id],
    );
    if (defResult.rows.length === 0) {
      // Fallback: try the workflows table (legacy schema)
      const wfResult = await safeQuery(
        `SELECT * FROM "${schema}".workflows WHERE workflow_id = $1`,
        [id],
      );
      if (wfResult.rows.length === 0) {
        throw new NotFoundError(`workflow ${id} not found`);
      }

      const wf = getFirstRow(wfResult)!;
      res.json(ok({
        definition: wf.definition ?? wf,
        metadata: {
          name: wf.name || wf.title || "Unnamed Workflow",
          version: wf.version || 1,
          module_code: wf.module_code || null,
          exported_at: new Date().toISOString(),
        },
      }, req));
      return;
    }

    const def = getFirstRow(defResult)!;

    // Fetch associated steps
    const stepsResult = await safeQuery(
      `SELECT * FROM "${schema}".workflow_steps
       WHERE workflow_id = $1
       ORDER BY step_order ASC, created_at ASC`,
      [id],
    );

    // Fetch associated transitions
    const transResult = await safeQuery(
      `SELECT * FROM "${schema}".workflow_transitions
       WHERE workflow_id = $1
       ORDER BY created_at ASC`,
      [id],
    );

    res.json(ok({
      definition: {
        ...def,
        steps: stepsResult.rows,
        transitions: transResult.rows,
      },
      metadata: {
        name: def.name || def.title || "Unnamed Workflow",
        version: def.version || 1,
        module_code: def.module_code || null,
        exported_at: new Date().toISOString(),
      },
    }, req));
  }),
);

// ── Import Workflow ─────────────────────────────────────────────────────

router.post("/import",
  requirePermission("workflow.instance.write"),
  validate({ body: importBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const schema = tenantSchema(req.tenantId!);
    const { definition, metadata } = req.body;
    const name = metadata.name;
    const moduleCode = metadata.module_code || "workflow";

    // Insert workflow definition
    const defInsert = await safeQuery(
      `INSERT INTO "${schema}".workflows
         (name, definition, module_code, status, version, created_by)
       VALUES ($1, $2, $3, 'draft', 1, $4)
       RETURNING workflow_id, name`,
      [
        name,
        JSON.stringify(definition),
        moduleCode,
        req.user!.userId!,
      ],
    );

    const newWf = getFirstRow(defInsert)!;
    if (!newWf) {
      throw new Error("Failed to import workflow");
    }

    // If definition contains steps, insert them
    const steps = definition.steps;
    if (Array.isArray(steps)) {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        await safeQuery(
          `INSERT INTO "${schema}".workflow_steps
             (workflow_id, step_name, step_type, step_order, config, created_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            newWf.workflow_id,
            step.step_name || step.name || `Step ${i + 1}`,
            step.step_type || step.type || "action",
            step.step_order ?? i + 1,
            JSON.stringify(step.config || step),
            req.user!.userId!,
          ],
        );
      }
    }

    // If definition contains transitions, insert them
    const transitions = definition.transitions;
    if (Array.isArray(transitions)) {
      for (const t of transitions) {
        await safeQuery(
          `INSERT INTO "${schema}".workflow_transitions
             (workflow_id, from_step, to_step, condition, created_by)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            newWf.workflow_id,
            t.from_step || t.from_step_id,
            t.to_step || t.to_step_id,
            JSON.stringify(t.condition || null),
            req.user!.userId!,
          ],
        );
      }
    }

    res.status(201).json(ok({
      workflowId: newWf.workflow_id,
      name: newWf.name,
    }, req));
  }),
);

export default router;

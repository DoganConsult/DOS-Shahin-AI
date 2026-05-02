import { Request, Response, Router } from 'express';
import { z } from "zod";
import { emitEvent as _emitEvent } from '../ports/events.port';
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';
const genericPayloadSchema = z.record(z.unknown());
// ============================================
// Policy Reports & Admin Settings Routes
// API endpoints for policy report catalog,
// report generation, and module admin settings.
// ============================================


import { authenticate, requirePermission } from '../ports/auth.port';
import { validate, asyncHandler, auditMiddleware, setAuditData, moduleStack, injectScopeContext } from '../ports/middleware.port';
import { errMsg as _errMsg } from '../../../i18n/error-messages';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { getFirstRow as _getFirstRow } from '@dos/db';

import { createRunBody, updateSettingsBody } from '../schemas/policy.schemas';
import {
  getReportCatalog,
  runReport,
} from '../services/policy/policy-reporting.service';

const router = Router();
router.use(moduleStack('policy'));
router.use(auditMiddleware('policy'));
router.use(injectScopeContext);

/**
 * GET /catalog
 * List available policy report types with metadata.
 */
router.get('/catalog', authenticate, requirePermission('policy.document.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: Request, res: Response) => {
  const catalog = getReportCatalog();
  res.json({ catalog, count: catalog.length });
}));

/**
 * POST /run
 * Generate a policy report by type.
 * Body: { reportType, options?: { format?, dateFrom?, dateTo?,
 *         categoryFilter?, statusFilter? } }
 */
router.post('/run', authenticate, requirePermission('policy.document.read'), validate({ body: createRunBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const { reportType, options } = req.body;

  if (!reportType) {
    res.status(400).json({ error: 'reportType is required' });
    return;
  }

  try {
    const report = await runReport(tenantId, reportType, options);
    setAuditData(res as any, { action: 'read', entityType: 'policy_report', entityId: report.reportId });
    res.json(report);
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.startsWith('Unknown report type')) {
      res.status(400).json({ error: err.message });
      return;
    }
    throw err;
  }
}));

/**
 * GET /admin/settings
 * Get policy module settings: categories and platform_operation_config
 * entries related to policy management.
 */
router.get('/admin/settings', authenticate, requirePermission('policy.document.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);

  // Fetch policy categories
  const categoriesRes = await safeQuery(
    `SELECT * FROM "${schema}".policy_categories ORDER BY sort_order ASC, name ASC`,
    [],
  );

  // Fetch policy-related platform operation config entries
  const configRes = await safeQuery(
    `SELECT config_key, config_value, description, updated_at
     FROM "${schema}".platform_operation_config
     WHERE config_key LIKE 'policy_%' OR config_key LIKE 'governance_policy_%'
     ORDER BY config_key`,
    [],
  );

  // Parse config values
  const settings: Record<string, unknown> = {};
  for (const row of configRes.rows) {
    let value = row.config_value;
    if (typeof value === 'string') {
      try { value = JSON.parse(value); } catch { /* keep raw string */ }
    }
    settings[row.config_key as string] = value;
  }

  res.json({
    categories: categoriesRes.rows,
    settings,
    configEntries: configRes.rows,
  });
}));

/**
 * PATCH /admin/settings
 * Update policy module settings.
 * Body: { categories?: [...], reviewCycles?: {...},
 *         reminderRules?: {...}, retentionDays?: number }
 * UPSERT into platform_operation_config for each provided setting.
 */
router.patch('/admin/settings', authenticate, requirePermission('policy.document.manage'), validate({ body: updateSettingsBody }), asyncHandler(async (req: Request, res: Response) => {
  const tenantId = req.tenantId!;
  const schema = tenantSchema(tenantId);
  const userId = req.user!.userId!;
  const { categories, reviewCycles, reminderRules, retentionDays } = req.body;

  const updatedKeys: string[] = [];

  // Upsert individual config entries
  const upsertConfig = async (key: string, value: unknown) => {
    await safeQuery(
      `INSERT INTO "${schema}".platform_operation_config
       (config_key, config_value, updated_by, owner_module, owner_type, updated_at)
       VALUES ($1, $2, $3, 'policy', 'module', NOW())
       ON CONFLICT (config_key, owner_module) DO UPDATE
       SET config_value = EXCLUDED.config_value,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()`,
      [key, JSON.stringify(value), userId],
    );
    updatedKeys.push(key);
  };

  if (reviewCycles !== undefined) {
    await upsertConfig('policy_review_cycles', reviewCycles);
  }
  if (reminderRules !== undefined) {
    await upsertConfig('policy_reminder_rules', reminderRules);
  }
  if (retentionDays !== undefined) {
    await upsertConfig('policy_retention_days', retentionDays);
  }

  // Handle category updates if provided
  if (categories && Array.isArray(categories)) {
    for (const cat of categories) {
      if (cat.id) {
        // Update existing category
        await safeQuery(
          `UPDATE "${schema}".policy_categories
           SET name = COALESCE($2, name),
               description = COALESCE($3, description),
               sort_order = COALESCE($4, sort_order),
               updated_at = NOW()
           WHERE id = $1`,
          [cat.id, cat.name ?? null, cat.description ?? null, cat.sort_order ?? null],
        );
      } else if (cat.name) {
        // Insert new category
        await safeQuery(
          `INSERT INTO "${schema}".policy_categories
           (name, description, sort_order, created_at, updated_at)
           VALUES ($1, $2, $3, NOW(), NOW())
           ON CONFLICT DO NOTHING`,
          [cat.name, cat.description ?? null, cat.sort_order ?? 999],
        );
      }
    }
    updatedKeys.push('categories');
  }

  setAuditData(res as any, { action: 'update', entityType: 'policy_settings', entityId: 'admin' });
  res.json({ updated: true, updatedKeys });
}));

export default router;


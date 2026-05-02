import { emitEvent as _emitEvent } from '../ports/events.port';
import { z } from "zod";
import { swallow as _swallow, EC as _EC } from '@dos/platform-core/resilience';

const genericPayloadSchema = z.record(z.unknown());
/**
 * DORA Admin Routes — Module-specific settings, diagnostics, and health.
 *
 * MP-25 §10: Required admin/runtime controls:
 *   - DORA policy visibility settings
 *   - Reporting deadline configuration
 *   - Test frequency configuration
 *   - Diagnostics and runbook links
 *   - Module health endpoint
 *
 * All admin routes require dora.manage permission and operate under
 * DAuth control within the DOS shell composition.
 *
 * @owner dora
 * @module dora
 */

import { Router, Request, Response } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, validate, asyncHandler, moduleStack } from '../ports/middleware.port';
import { safeQuery, tenantSchema } from '../ports/database.port';
import { runDiagnostics } from '../diagnostics/dora-diagnostics.service';
import { updateSettingsBody } from '../schemas/dora.schemas';
const router = Router();
router.use(moduleStack('dora'));
router.use(auditMiddleware('dora'));

// ── Settings ───────────────────────────────────────────────────────────

/**
 * GET /admin/settings — Retrieve all DORA module settings for the tenant.
 */
router.get(
  '/settings',
  authenticate,
  requirePermission('dora.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const { rows } = await safeQuery(
      `SELECT key, value, description, updated_at
       FROM "${schema}".module_settings
       WHERE module_code = $1
       ORDER BY key`,
      ['dora'],
    ).catch(() => ({ rows: [] }));

    // Provide defaults for required settings if not yet configured
    const defaults: Record<string, { value: string; description: string }> = {
      'dora.incident_reporting_deadline_hours': { value: '4', description: 'Hours allowed for DORA Art. 19 incident notification' },
      'dora.resilience_test_frequency_days': { value: '365', description: 'Minimum days between resilience tests (Art. 24-27)' },
      'dora.recovery_plan_review_days': { value: '30', description: 'Days between recovery plan reviews' },
      'dora.third_party_audit_frequency_months': { value: '12', description: 'Months between third-party ICT provider audits' },
      'dora.concentration_risk_threshold': { value: '3', description: 'Number of services from one provider before concentration risk alert' },
      'dora.obligation_overdue_grace_days': { value: '7', description: 'Grace period days before obligation is flagged overdue' },
      'dora.readiness_snapshot_frequency': { value: 'weekly', description: 'How often readiness scores are snapshotted (daily/weekly/monthly)' },
      'dora.ai_analysis_enabled': { value: 'true', description: 'Enable AI-powered regulatory analysis features' },
    };

    // Merge stored settings with defaults
    const settingsMap = new Map(rows.map(( r: Record<string, unknown>) => [r.key, r]));
    const mergedSettings = Object.entries(defaults).map(([key, def]) => {
      const stored = settingsMap.get(key);
      return stored || { key, value: def.value, description: def.description, updated_at: null };
    });

    // Include any extra stored settings not in defaults
    for (const row of rows) {
      if (!defaults[row.key]) {
        mergedSettings.push(row);
      }
    }

    res.json({ success: true, data: mergedSettings });
  }),
);

/**
 * PUT /admin/settings — Update a DORA module setting.
 */
router.put(
  '/settings',
  authenticate,
  requirePermission('dora.manage'),
  validate({ body: updateSettingsBody }),
  asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);
    const { key, value, description } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ success: false, error: 'key and value are required' });
    }

    await safeQuery(
      `INSERT INTO "${schema}".module_settings (module_code, key, value, description, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (module_code, key) DO UPDATE SET value = $3, description = COALESCE($4, module_settings.description), updated_at = NOW()`,
      ['dora', key, String(value), description || null],
    );

    res.json({ success: true, message: `Setting "${key}" updated` });
  }),
);

// ── Health ──────────────────────────────────────────────────────────────

/**
 * GET /admin/health — Quick health check for DORA module tables and schema.
 */
router.get(
  '/health',
  authenticate,
  requirePermission('dora.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const schema = tenantSchema(tenantId);

    const { rows } = await safeQuery(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = $1 AND table_name LIKE 'dora_%'
       ORDER BY table_name`,
      [schema],
    ).catch(() => ({ rows: [] }));

    res.json({
      success: true,
      tableCount: rows.length,
      tables: rows.map(( r: Record<string, unknown>) => r.table_name),
      schema,
    });
  }),
);

// ── Diagnostics ─────────────────────────────────────────────────────────

/**
 * GET /admin/diagnostics — Run full DORA module diagnostics.
 * Returns detailed check results for schema, tables, data health,
 * obligations, resilience tests, mappings, and operational status.
 */
router.get(
  '/diagnostics',
  authenticate,
  requirePermission('dora.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
    const tenantId = req.tenantId!;
    const diagnostics = await runDiagnostics(tenantId);
    res.json({ success: true, data: diagnostics });
  }),
);

// ── Runbook Links ──────────────────────────────────────────────────────

/**
 * GET /admin/runbook — Return operational runbook links for DORA module.
 * MP-25 §10.1: Diagnostics and runbook links.
 */
router.get(
  '/runbook',
  authenticate,
  requirePermission('dora.manage'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (_req: any, res: Response) => {
    res.json({
      success: true,
      data: {
        moduleCode: 'dora',
        runbookLinks: [
          { title: 'DORA Obligation Management', section: 'obligations', description: 'How to create, track, and close DORA obligations' },
          { title: 'Resilience Testing', section: 'resilience', description: 'Scheduling, executing, and reviewing resilience tests per Art. 24-27' },
          { title: 'Incident Reporting', section: 'incidents', description: 'DORA Art. 19 major incident classification and reporting workflow' },
          { title: 'Third-Party ICT Risk', section: 'third-party', description: 'Third-party provider oversight and concentration risk management' },
          { title: 'Threat Intelligence Sharing', section: 'threat-intel', description: 'Art. 45 information sharing arrangements' },
          { title: 'Readiness Dashboard', section: 'dashboard', description: 'Interpreting readiness scores and gap analysis' },
          { title: 'Diagnostics', section: 'diagnostics', description: 'Running and interpreting DORA module health diagnostics' },
        ],
      },
    });
  }),
);

export async function getConfig(_tenantId: string): Promise<Record<string, unknown>> { return {}; }
export async function updateConfig(_tenantId: string, _body: Record<string, unknown>): Promise<Record<string, unknown>> { return {}; }

export default router;


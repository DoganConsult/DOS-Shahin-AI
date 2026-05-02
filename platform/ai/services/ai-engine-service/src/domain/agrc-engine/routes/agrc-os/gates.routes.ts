// @ts-nocheck
import { Request, Response, Router } from 'express';
import { catchHandler, EC } from '@dos/platform-core/resilience/resilient-catch';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { auditMiddleware, asyncHandler, validate, validateReleaseGate, validateVendorGate, validateGateOverride } from '../../ports/middleware.port';
import { errMsg } from '../../../../i18n/error-messages';
import { emitEvent } from '../../ports/events.port';
import { safeQuery, tenantSchema } from '../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import { createRegistryBody, updateRegistryBody, createRulesBody, createValidateBody, createValidateBatchBody, createOverrideBody, createApproveBody } from '../../schemas/agrc-engine.schemas';
import { z } from "zod";
const genericPayloadSchema = z.record(z.unknown());

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware('gates'));

// ===============================================================
// Dynamic Gate Registry — All gates are DB-driven
// ===============================================================

// GET /gates/registry — List all available gates for this tenant
router.get('/gates/registry', authenticate, requirePermission('gate.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId);
  const result = await safeQuery(
    `SELECT gate_id, gate_code, gate_type, display_name_en, display_name_ar, description_en,
            enabled, ai_analysis_enabled, severity_on_block, override_allowed, sla_hours,
            (SELECT COUNT(*) FROM "${schema}".gate_validation_rules r WHERE r.gate_id = g.gate_id AND r.enabled = true) AS rule_count,
            (SELECT COUNT(*) FROM "${schema}".enforcement_gate_log l WHERE l.gate_type = g.gate_code AND l.created_at > NOW() - INTERVAL '30 days') AS invocations_30d,
            (SELECT COUNT(*) FROM "${schema}".enforcement_gate_log l WHERE l.gate_type = g.gate_code AND l.allowed = false AND l.created_at > NOW() - INTERVAL '30 days') AS blocks_30d
     FROM "${schema}".gate_definitions g
     WHERE g.tenant_id IN ($1, '00000000-0000-0000-0000-000000000000')
     ORDER BY g.gate_type, g.gate_code`,
    [req.tenantId]
  );
  res.json({ gates: result.rows, count: result.rows.length });
}));

// GET /gates/registry/:gateCode — Get single gate definition with rules
router.get('/gates/registry/:gateCode', authenticate, requirePermission('gate.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId);
  const gate = await safeQuery(
    `SELECT * FROM "${schema}".gate_definitions
     WHERE gate_code = $1 AND tenant_id IN ($2, '00000000-0000-0000-0000-000000000000')
     ORDER BY tenant_id DESC LIMIT 1`,
    [req.params.gateCode, req.tenantId]
  );
  if (!gate.rows[0]) { res.status(404).json({ error: 'Gate not found' }); return; }

  const rules = await safeQuery(
    `SELECT * FROM "${schema}".gate_validation_rules
     WHERE gate_id = $1 AND enabled = true ORDER BY execution_order`,
    [gate.rows[0].gate_id]
  );
  res.json({ ...gate.rows[0], rules: rules.rows });
}));

// POST /gates/registry — Create custom gate definition

router.post('/gates/registry', authenticate, requirePermission('tenant.config.manage'), validate({ body: createRegistryBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId);
  const { gate_code, gate_type, display_name_en, display_name_ar, description_en,
          validation_rules, ai_analysis_enabled, ai_prompt_template, required_permission,
          severity_on_block, override_allowed, sla_hours } = req.body;

  if (!gate_code || !gate_type || !display_name_en) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".gate_definitions
     (tenant_id, gate_code, gate_type, display_name_en, display_name_ar, description_en,
      validation_rules, ai_analysis_enabled, ai_prompt_template, required_permission,
      severity_on_block, override_allowed, sla_hours)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING *`,
    [req.tenantId, gate_code, gate_type || 'custom', display_name_en, display_name_ar || '',
     description_en || '', JSON.stringify(validation_rules || []), ai_analysis_enabled !== false,
     ai_prompt_template || null, required_permission || 'gate.record.read',
     severity_on_block || 'high', override_allowed !== false, sla_hours || 24]
  );

  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'gate_definition', entityId: result.rows[0]?.gate_id || '' } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.status(201).json(result.rows[0]);
}));

// PUT /gates/registry/:gateCode — Update gate definition

router.put('/gates/registry/:gateCode', authenticate, requirePermission('tenant.config.manage'), validate({ body: updateRegistryBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId);
  const fields: string[] = [];
  const values: unknown[] = [req.params.gateCode, req.tenantId];
  let paramIdx = 3;

  const updatable = ['display_name_en', 'display_name_ar', 'description_en', 'enabled',
    'ai_analysis_enabled', 'ai_prompt_template', 'severity_on_block', 'override_allowed',
    'override_requires_approval', 'sla_hours', 'auto_notify_on_block', 'notification_channels'];

  for (const field of updatable) {
    if (req.body[field] !== undefined) {
      const val = field === 'notification_channels' ? JSON.stringify(req.body[field]) : req.body[field];
      fields.push(`${field} = $${paramIdx}`);
      values.push(val);
      paramIdx++;
    }
  }

  if (fields.length === 0) { res.status(400).json({ error: 'No fields to update' }); return; }
  fields.push('updated_at = NOW()');

  const result = await safeQuery(
    `UPDATE "${schema}".gate_definitions SET ${fields.join(', ')}
     WHERE gate_code = $1 AND tenant_id = $2 RETURNING *`,
    values
  );

  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'gate_definition', entityId: req.params.gateCode } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result.rows[0] || { error: 'Gate not found' });
}));

// POST /gates/registry/:gateCode/rules — Add validation rule to gate

router.post('/gates/registry/:gateCode/rules', authenticate, requirePermission('tenant.config.manage'), validate({ body: createRulesBody }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId);
  const gate = await safeQuery(
    `SELECT gate_id FROM "${schema}".gate_definitions WHERE gate_code = $1 AND tenant_id = $2`,
    [req.params.gateCode, req.tenantId]
  );
  if (!gate.rows[0]) { res.status(404).json({ error: 'Gate not found' }); return; }

  const { rule_name, rule_type, rule_config, error_message_en, error_message_ar, severity, execution_order } = req.body;
  if (!rule_name || !rule_type || !rule_config) {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".gate_validation_rules
     (gate_id, tenant_id, rule_name, rule_type, rule_config, error_message_en, error_message_ar, severity, execution_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [gate.rows[0].gate_id, req.tenantId, rule_name, rule_type, JSON.stringify(rule_config),
     error_message_en || '', error_message_ar || '', severity || 'blocker', execution_order || 0]
  );
  res.status(201).json(result.rows[0]);
}));

// ===============================================================
// Dynamic Gate Validation — Single endpoint for ALL gate types
// ===============================================================

// POST /gates/validate/:gateCode — Validate ANY gate dynamically

router.post('/gates/validate/:gateCode', authenticate, validate({ body: createValidateBody }), asyncHandler(async (req: Request, res: Response) => {
  const { validateDynamicGate } = await import('../../../governance/services/misc/enforcement-gate.service');
  const result = await validateDynamicGate(req.tenantId, req.params.gateCode, req.body, req.userId);

  emitEvent(({
      tenantId: req.tenantId, userId: req.user!.userId,
      module: 'governance', event: result.allowed ? 'gate_passed' : 'gate_blocked',
      entityType: 'enforcement_gate', entityId: req.params.gateCode,
    } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));

  res.status(result.allowed ? 200 : 409).json(result);
}));

// POST /gates/validate-batch — Validate multiple gates at once

router.post('/gates/validate-batch', authenticate, requirePermission('gate.record.read'), validate({ body: createValidateBatchBody }), asyncHandler(async (req: Request, res: Response) => {
  const { validateDynamicGate } = await import('../../../governance/services/misc/enforcement-gate.service');
  const { gates } = req.body; // Array of { gateCode, params }
  if (!Array.isArray(gates) || gates.length === 0) {
    res.status(400).json({ error: 'gates array required' });
    return;
  }

  const results = await Promise.all(
    gates.map(async (g: { gateCode: string; params: any }) => {
      try {
        const result = await validateDynamicGate(req.tenantId, g.gateCode, g.params || {}, req.userId);
        return { ...result, gateCode: g.gateCode };
      } catch (err) {
        return { allowed: false, error: toErrorMessage(err), gateCode: g.gateCode };
      }
    })
  );

  const allPassed = results.every(r => r.allowed);
  res.status(allPassed ? 200 : 409).json({ allPassed, results });
}));

// ===============================================================
// Gate Overrides — DB-driven approval workflow
// ===============================================================

// POST /gates/override/:gateLogId — Request override for blocked gate

router.post('/gates/override/:gateLogId', authenticate, requirePermission('gate.record.read'), validateGateOverride, validate({ body: createOverrideBody }), asyncHandler(async (req: Request, res: Response) => {
  const { overrideGate } = await import('../../../governance/services/misc/enforcement-gate.service');
  const { justification } = req.body;
  const result = await overrideGate(req.tenantId, req.params.gateLogId, req.userId, justification);

  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'gate_override', entityId: req.params.gateLogId } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
}));

// POST /gates/override/:overrideId/approve — Approve/reject override

router.post('/gates/override/:overrideId/approve', authenticate, requirePermission('tenant.config.manage'), validate({ body: createApproveBody }), asyncHandler(async (req: Request, res: Response) => {
  const { approveOverrideRequest } = await import('../../../governance/services/misc/enforcement-gate.service');
  const { approved } = req.body;
  if (typeof approved !== 'boolean') {
    res.status(400).json({ error: errMsg('MISSING_FIELDS', req) });
    return;
  }
  const result = await approveOverrideRequest(req.tenantId, req.params.overrideId, req.userId, approved);

  emitEvent(({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: approved ? 'approved' : 'rejected', entityType: 'gate_override', entityId: req.params.overrideId } as any)).catch(catchHandler(EC.AGENT_ACTION, {}));
  res.json(result);
}));

// ===============================================================
// Gate Analytics — AI-powered insights
// ===============================================================

// GET /gates/log — Gate decision audit log (enhanced with filters)
router.get('/gates/log', authenticate, requirePermission('gate.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId);
  const { gateType, allowed, limit, offset, from, to } = req.query;

  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  if (gateType) { conditions.push(`gate_type = $${paramIdx++}`); params.push(gateType); }
  if (allowed !== undefined) { conditions.push(`allowed = $${paramIdx++}`); params.push(allowed === 'true'); }
  if (from) { conditions.push(`created_at >= $${paramIdx++}`); params.push(from); }
  if (to) { conditions.push(`created_at <= $${paramIdx++}`); params.push(to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await safeQuery(
    `SELECT * FROM "${schema}".enforcement_gate_log ${where}
     ORDER BY created_at DESC LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, parseInt(limit as string) || 50, parseInt(offset as string) || 0]
  );

  res.json({ logs: result.rows, count: result.rows.length });
}));

// GET /gates/analytics — AI-powered gate analytics dashboard
router.get('/gates/analytics', authenticate, requirePermission('gate.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId);
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);

  const [summary, byType, byDay, topBlocked] = await Promise.all([
    safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE allowed) AS passed, COUNT(*) FILTER (WHERE NOT allowed) AS blocked,
              COUNT(*) FILTER (WHERE overridden) AS overridden
              FROM "${schema}".enforcement_gate_log WHERE created_at > NOW() - ($1 || ' days')::interval`, [days]),
    safeQuery(`SELECT gate_type, COUNT(*) AS total, COUNT(*) FILTER (WHERE allowed) AS passed, COUNT(*) FILTER (WHERE NOT allowed) AS blocked
              FROM "${schema}".enforcement_gate_log WHERE created_at > NOW() - ($1 || ' days')::interval GROUP BY gate_type ORDER BY total DESC`, [days]),
    safeQuery(`SELECT DATE(created_at) AS day, COUNT(*) AS total, COUNT(*) FILTER (WHERE allowed) AS passed, COUNT(*) FILTER (WHERE NOT allowed) AS blocked
              FROM "${schema}".enforcement_gate_log WHERE created_at > NOW() - ($1 || ' days')::interval GROUP BY DATE(created_at) ORDER BY day`, [days]),
    safeQuery(`SELECT gate_type, subject_name, reason, COUNT(*) AS block_count
              FROM "${schema}".enforcement_gate_log WHERE allowed = false AND created_at > NOW() - ($1 || ' days')::interval
              GROUP BY gate_type, subject_name, reason ORDER BY block_count DESC LIMIT 10`, [days]),
  ]);

  res.json({
    period_days: days,
    summary: summary.rows[0] || {},
    by_type: byType.rows,
    trend: byDay.rows,
    top_blocked: topBlocked.rows,
  });
}));

// GET /gates/analytics/ai-insights — AI analysis of gate patterns
router.get('/gates/analytics/ai-insights', authenticate, requirePermission('gate.record.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req: Request, res: Response) => {
  const schema = tenantSchema(req.tenantId);
  const days = Math.min(parseInt(req.query.days as string) || 30, 365);

  const [stats, recentBlocks] = await Promise.all([
    safeQuery(`SELECT gate_type, COUNT(*) AS total, COUNT(*) FILTER (WHERE allowed) AS passed, COUNT(*) FILTER (WHERE NOT allowed) AS blocked, COUNT(*) FILTER (WHERE overridden) AS overridden
              FROM "${schema}".enforcement_gate_log WHERE created_at > NOW() - ($1 || ' days')::interval GROUP BY gate_type`, [days]),
    safeQuery(`SELECT gate_type, subject_name, reason, details FROM "${schema}".enforcement_gate_log
              WHERE allowed = false AND created_at > NOW() - INTERVAL '7 days' ORDER BY created_at DESC LIMIT 20`),
  ]);

  const { claudeJSON } = await import('../../../../config/claude-client');
  const insights = await claudeJSON({
    systemPrompt: `You are an AI-first GRC platform analyst specializing in enforcement gates and compliance risk.
Provide structured JSON with: executive_summary (string), risk_patterns (array of {pattern, severity, affected_gates}),
recommendations (array of {action, priority, expected_impact}), trend_analysis (string), override_risk_assessment (string).
Be concise, actionable, bilingual-ready.`,
    userMessage: `Analyze gate enforcement patterns for the last ${days} days:\n\nGate Statistics:\n${JSON.stringify(stats.rows)}\n\nRecent Blocks:\n${JSON.stringify(recentBlocks.rows.slice(0, 10))}`,
    maxTokens: 2048,
    temperature: 0.2,
  });

  res.json({ period_days: days, ...insights });
}));

// ===============================================================
// Legacy compatibility — keep original endpoints working
// ===============================================================

router.post('/gates/release/validate', authenticate, requirePermission('tenant.config.manage'), validateReleaseGate, validate({ body: createValidateBody }), asyncHandler(async (req: Request, res: Response) => {
  const { validateReleaseGate: validateGate } = await import('../../../governance/services/misc/enforcement-gate.service');
  const { releaseId, serviceName, controlKeys } = req.body;
  const result = await validateGate(req.tenantId, releaseId, serviceName, controlKeys || [], req.userId);
  res.status(result.allowed ? 200 : 409).json(result);
}));

router.post('/gates/vendor/validate', authenticate, requirePermission('risk.record.read'), validateVendorGate, validate({ body: createValidateBody }), asyncHandler(async (req: Request, res: Response) => {
  const { validateVendorGate } = await import('../../../governance/services/misc/enforcement-gate.service');
  const { vendorId, vendorName, riskScore } = req.body;
  const result = await validateVendorGate(req.tenantId, vendorId, vendorName, riskScore, req.userId);
  res.status(result.allowed ? 200 : 409).json(result);
}));

export default router;


import { Router, type Request, type Response } from 'express';
import type { DbPool } from '../db.js';
import { UiOsFlagsManager } from '../managers/ui-os-flags.manager.js';
import {
  FeatureFlagSchema, FlagAssignmentSchema, ExperimentSchema, VariantSchema,
  ExperimentAssignmentSchema, RolloutRuleSchema, KillSwitchSchema, KillSwitchTriggerSchema,
} from '../schemas/flags.schemas.js';
import { requireFga } from '../middleware/openfga.js';

const UUID = /^[0-9a-fA-F-]{36}$/;
function ctx(req: Request, res: Response) {
  const tenantId = (req.header('x-dos-tenant-id') ?? req.query.tenantId) as string | undefined;
  const userId = (req.header('x-dos-user-id') ?? req.query.userId) as string | undefined;
  if (!tenantId || !userId) { res.status(400).json({ error: 'missing_identity' }); return null; }
  return { tenantId, userId };
}
function fail(res: Response, code: string, e: unknown) {
  const m = (e as Error).message;
  if (m.includes('duplicate key')) { res.status(409).json({ error: 'conflict' }); return; }
  if (m.includes('violates foreign key')) { res.status(400).json({ error: 'fk_violation', message: m }); return; }
  if (m.includes('violates check constraint')) { res.status(400).json({ error: 'check_violation', message: m }); return; }
  res.status(500).json({ error: code, message: m });
}

export function createFlagsRouter(pool: DbPool): Router {
  const router = Router();
  const m = new UiOsFlagsManager(pool);
  const fgaViewer = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'viewer', object: `ui_os_tenant:${req.principal.tenantId}` } : null });
  const fgaAdmin = requireFga({ build: (req) => req.principal?.sub && req.principal?.tenantId
    ? { user: `user:${req.principal.sub}`, relation: 'admin', object: `ui_os_tenant:${req.principal.tenantId}` } : null });

  // Feature flags
  router.get('/feature-flags', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ flags: await m.listFlags(c.tenantId) }); } catch (e) { fail(res, 'flags_list_failed', e); }
  });
  router.get('/feature-flags/:flagId', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.flagId)) { res.status(400).json({ error: 'invalid_flag_id' }); return; }
    try {
      const f = await m.getFlag(c.tenantId, req.params.flagId);
      if (!f) { res.status(404).json({ error: 'flag_not_found' }); return; }
      res.json(f);
    } catch (e) { fail(res, 'flag_get_failed', e); }
  });
  router.put('/feature-flags', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = FeatureFlagSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertFlag(c.tenantId, c.userId, p.data)); } catch (e) { fail(res, 'flag_upsert_failed', e); }
  });
  router.delete('/feature-flags/:flagId', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.flagId)) { res.status(400).json({ error: 'invalid_flag_id' }); return; }
    try {
      const ok = await m.deleteFlag(c.tenantId, req.params.flagId);
      if (!ok) { res.status(404).json({ error: 'flag_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'flag_delete_failed', e); }
  });

  // Flag assignments
  router.get('/feature-flags/:flagId/assignments', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.flagId)) { res.status(400).json({ error: 'invalid_flag_id' }); return; }
    try { res.json({ assignments: await m.listFlagAssignments(c.tenantId, req.params.flagId) }); } catch (e) { fail(res, 'flag_assignments_list_failed', e); }
  });
  router.put('/feature-flags/:flagId/assignments', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.flagId)) { res.status(400).json({ error: 'invalid_flag_id' }); return; }
    const p = FlagAssignmentSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertFlagAssignment(c.tenantId, req.params.flagId, p.data)); } catch (e) { fail(res, 'flag_assignment_upsert_failed', e); }
  });
  router.delete('/feature-flag-assignments/:assignmentId', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.assignmentId)) { res.status(400).json({ error: 'invalid_assignment_id' }); return; }
    try {
      const ok = await m.deleteFlagAssignment(c.tenantId, req.params.assignmentId);
      if (!ok) { res.status(404).json({ error: 'assignment_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'flag_assignment_delete_failed', e); }
  });

  // Experiments
  router.get('/experiments', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ experiments: await m.listExperiments(c.tenantId, String(req.query.activeOnly ?? '') === 'true') }); } catch (e) { fail(res, 'experiments_list_failed', e); }
  });
  router.get('/experiments/:experimentId', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.experimentId)) { res.status(400).json({ error: 'invalid_experiment_id' }); return; }
    try {
      const x = await m.getExperiment(c.tenantId, req.params.experimentId);
      if (!x) { res.status(404).json({ error: 'experiment_not_found' }); return; }
      res.json(x);
    } catch (e) { fail(res, 'experiment_get_failed', e); }
  });
  router.put('/experiments', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = ExperimentSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertExperiment(c.tenantId, p.data)); } catch (e) { fail(res, 'experiment_upsert_failed', e); }
  });
  router.delete('/experiments/:experimentId', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.experimentId)) { res.status(400).json({ error: 'invalid_experiment_id' }); return; }
    try {
      const ok = await m.deleteExperiment(c.tenantId, req.params.experimentId);
      if (!ok) { res.status(404).json({ error: 'experiment_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'experiment_delete_failed', e); }
  });

  // Variants
  router.get('/experiments/:experimentId/variants', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.experimentId)) { res.status(400).json({ error: 'invalid_experiment_id' }); return; }
    try { res.json({ variants: await m.listVariants(c.tenantId, req.params.experimentId) }); } catch (e) { fail(res, 'variants_list_failed', e); }
  });
  router.put('/experiments/:experimentId/variants', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.experimentId)) { res.status(400).json({ error: 'invalid_experiment_id' }); return; }
    const p = VariantSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertVariant(c.tenantId, req.params.experimentId, p.data)); } catch (e) { fail(res, 'variant_upsert_failed', e); }
  });
  router.delete('/experiment-variants/:variantId', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.variantId)) { res.status(400).json({ error: 'invalid_variant_id' }); return; }
    try {
      const ok = await m.deleteVariant(c.tenantId, req.params.variantId);
      if (!ok) { res.status(404).json({ error: 'variant_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'variant_delete_failed', e); }
  });

  // Experiment assignments
  router.get('/experiments/:experimentId/assignments', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.experimentId)) { res.status(400).json({ error: 'invalid_experiment_id' }); return; }
    try { res.json({ assignments: await m.listExperimentAssignments(c.tenantId, req.params.experimentId,
      parseInt(String(req.query.limit ?? 200), 10)) }); } catch (e) { fail(res, 'experiment_assignments_list_failed', e); }
  });
  router.get('/experiments/:experimentId/assignments/me', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.experimentId)) { res.status(400).json({ error: 'invalid_experiment_id' }); return; }
    try {
      const a = await m.getExperimentAssignment(c.tenantId, req.params.experimentId, c.userId);
      if (!a) { res.status(404).json({ error: 'assignment_not_found' }); return; }
      res.json(a);
    } catch (e) { fail(res, 'experiment_assignment_get_failed', e); }
  });
  router.put('/experiments/:experimentId/assignments', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.experimentId)) { res.status(400).json({ error: 'invalid_experiment_id' }); return; }
    const p = ExperimentAssignmentSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertExperimentAssignment(c.tenantId, req.params.experimentId, p.data.user_id, p.data.variant_id)); } catch (e) { fail(res, 'experiment_assignment_upsert_failed', e); }
  });

  // Rollout rules
  router.get('/rollout-rules', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ rules: await m.listRolloutRules(c.tenantId, {
      flagId: (req.query.flagId as string | undefined) ?? null,
      experimentId: (req.query.experimentId as string | undefined) ?? null,
    }) }); } catch (e) { fail(res, 'rollout_rules_list_failed', e); }
  });
  router.post('/rollout-rules', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = RolloutRuleSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.status(201).json(await m.createRolloutRule(c.tenantId, p.data)); } catch (e) { fail(res, 'rollout_rule_create_failed', e); }
  });
  router.delete('/rollout-rules/:ruleId', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    if (!UUID.test(req.params.ruleId)) { res.status(400).json({ error: 'invalid_rule_id' }); return; }
    try {
      const ok = await m.deleteRolloutRule(c.tenantId, req.params.ruleId);
      if (!ok) { res.status(404).json({ error: 'rule_not_found' }); return; }
      res.status(204).send();
    } catch (e) { fail(res, 'rollout_rule_delete_failed', e); }
  });

  // Kill switches
  router.get('/kill-switches', fgaViewer, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try { res.json({ switches: await m.listKillSwitches(c.tenantId, String(req.query.activeOnly ?? '') === 'true') }); } catch (e) { fail(res, 'kill_switches_list_failed', e); }
  });
  router.put('/kill-switches', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = KillSwitchSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.upsertKillSwitch(c.tenantId, p.data)); } catch (e) { fail(res, 'kill_switch_upsert_failed', e); }
  });
  router.post('/kill-switches/:switchCode/trigger', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    const p = KillSwitchTriggerSchema.safeParse(req.body ?? {});
    if (!p.success) { res.status(400).json({ error: 'invalid_request', details: p.error.flatten() }); return; }
    try { res.json(await m.triggerKillSwitch(c.tenantId, req.params.switchCode, c.userId, p.data.reason ?? null)); } catch (e) { fail(res, 'kill_switch_trigger_failed', e); }
  });
  router.post('/kill-switches/:switchCode/resolve', fgaAdmin, async (req, res) => {
    const c = ctx(req, res); if (!c) return;
    try {
      const r = await m.resolveKillSwitch(c.tenantId, req.params.switchCode);
      if (!r) { res.status(404).json({ error: 'switch_not_active' }); return; }
      res.json(r);
    } catch (e) { fail(res, 'kill_switch_resolve_failed', e); }
  });

  return router;
}

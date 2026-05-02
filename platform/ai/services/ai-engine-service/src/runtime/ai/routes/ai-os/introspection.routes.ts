// @ts-nocheck
import { emitEvent as _emitEvent } from '../../ports/events.port';
/**
 * AI OS — Introspection, Capability Map, Explainability, Health & Settings
 * @module ai-os/introspection
 */
import { Router } from 'express';
import { authenticate, requirePermission } from '../../ports/auth.port';
import { NotFoundError, ValidationError } from '../../../../errors';
import { aiReadLimiter, aiExportLimiter, setCacheHeaders } from './shared';
import { emptyResult, tenantSchema, safeQuery } from '../../ports/database.port';
import { getRuntimeHealthSummary, validateRuntimeConfigIntegrity, listAllRuntimeConfigs } from '../../services/agents/core/ai-agent-runtime.service';

import { getPolicyEvalStats } from '../../services/governance/ai-policy-rule.service';

import { getSignalStats, getAggregatedDashboard } from '../../services/cockpit/ai-cockpit-signal.service';
import { swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
import { auditMiddleware, validate, asyncHandler, moduleStack, mutationEventHook } from '../../ports/middleware.port';
import { createExplainBody } from '../../schemas/ai.schemas';
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware('ai'));
router.use(mutationEventHook('ai'));

// ── Health Check ────────────────────────────────────────────────────────────

/** @swagger /api/ai-os/health: get: { summary: AI OS composite health, tags: [AI OS - Introspection] } */
router.get('/ai-os/health', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const [healthSummary, configIntegrity, signalStats, policyStats] = await Promise.all([
    getRuntimeHealthSummary(tenantId),
    validateRuntimeConfigIntegrity(tenantId),
    getSignalStats(tenantId),
    getPolicyEvalStats(tenantId),
  ]);
  const status = (healthSummary.circuitOpenCount > 0 || healthSummary.stuckRunCount > 0 || !configIntegrity.valid) ? 'degraded' : 'healthy';
  setCacheHeaders(res, 15);
  res.ok({ status, healthSummary, configIntegrity, signalStats, policyStats });
}));

// ── Settings Overview ───────────────────────────────────────────────────────

router.get('/ai-os/settings', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const [configs, policyStats, signalStats] = await Promise.all([
    listAllRuntimeConfigs(tenantId),
    getPolicyEvalStats(tenantId),
    getSignalStats(tenantId),
  ]);
  setCacheHeaders(res, 30);
  res.ok({
    agentCount: configs.length,
    enabledAgents: configs.filter((c: Record<string, unknown>) => c.enabled).length,
    disabledAgents: configs.filter((c: Record<string, unknown>) => !c.enabled).length,
    policyStats,
    signalStats,
    retentionDays: { signals: 90, decisions: 180 },
  });
}));

// ── Aggregated Dashboard ────────────────────────────────────────────────────

router.get('/ai-os/dashboard/aggregated', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const dashboard = await getAggregatedDashboard(req.tenantId);
  setCacheHeaders(res, 15);
  res.ok(dashboard);
}));

// ── AI Self-Introspection (heavy — calls Claude) ────────────────────────────

/** @swagger /api/ai-os/introspect: get: { summary: AI self-assessment, tags: [AI OS - Introspection] } */
router.get('/ai-os/introspect', authenticate, aiExportLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);

  const [agents, decisions, signals, alerts] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT agent_id, status, last_run_at, error_count, success_count FROM "${schema}".agent_runtime_config WHERE enabled = true`), { tenantId: req.tenantId, operation: 'query agent_runtime_config' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE outcome = 'accepted') AS accepted, COUNT(*) FILTER (WHERE outcome = 'rejected') AS rejected FROM "${schema}".ai_decisions WHERE created_at > NOW() - INTERVAL '24 hours'`), { tenantId: req.tenantId, operation: 'query agent_runtime_config' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'new') AS unread FROM "${schema}".governance_signals WHERE detected_at > NOW() - INTERVAL '24 hours'`), { tenantId: req.tenantId, operation: 'query ai_decisions' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE severity = 'critical') AS critical FROM "${schema}".ai_alerts WHERE created_at > NOW() - INTERVAL '24 hours' AND status != 'resolved'`), { tenantId: req.tenantId, operation: 'query governance_signals' }),
  ]);

  const { claudeJSON } = await import('../../../../config/claude-client');
  const introspection = await claudeJSON({
    systemPrompt: `You are the AI OS self-introspection engine. Analyze the AI system health and provide:
{health_score: number (0-100), status: "healthy"|"degraded"|"critical",
 active_agents: number, decision_acceptance_rate: number,
 key_issues: string[], recommendations: string[],
 autonomy_assessment: string, risk_posture: string}`,
    userMessage: `AI OS State:\nAgents: ${JSON.stringify(agents.rows)}\nDecisions (24h): ${JSON.stringify(decisions.rows[0])}\nSignals (24h): ${JSON.stringify(signals.rows[0])}\nAlerts: ${JSON.stringify(alerts.rows[0])}`,
    maxTokens: 1024,
    temperature: 0.2,
  });

  setCacheHeaders(res, 60);
  res.ok({ ...introspection as object, _raw: { agents: agents.rows.length, decisions: decisions.rows[0], signals: signals.rows[0], alerts: alerts.rows[0] } });
}));

// ── Capability Map ──────────────────────────────────────────────────────────

/** @swagger /api/ai-os/capability-map: get: { summary: Dynamic capability discovery, tags: [AI OS - Introspection] } */
router.get('/ai-os/capability-map', authenticate, aiReadLimiter, requirePermission('ai.agent.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);

  const [agents, policyRules, eventTriggers, routeRules, tools] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT agent_id, display_name, capabilities, status FROM "${schema}".agent_runtime_config`), { tenantId: req.tenantId, operation: 'query agent_runtime_config' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE enabled) AS active FROM "${schema}".ai_policy_rules`), { tenantId: req.tenantId, operation: 'query agent_runtime_config' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE enabled) AS active FROM "${schema}".ai_event_trigger_bindings`), { tenantId: req.tenantId, operation: 'query agent_runtime_config' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE enabled) AS active FROM "${schema}".ai_route_rules`), { tenantId: req.tenantId, operation: 'query agent_runtime_config' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT COUNT(*) AS total FROM "${schema}".ai_tools`), { tenantId: req.tenantId, operation: 'query ai_policy_rules' }),
  ]);

  setCacheHeaders(res, 30);
  res.ok({
    agents: agents.rows,
    capabilities: {
      policy_rules: policyRules.rows[0] || { total: 0, active: 0 },
      event_triggers: eventTriggers.rows[0] || { total: 0, active: 0 },
      route_rules: routeRules.rows[0] || { total: 0, active: 0 },
      tools: tools.rows[0] || { total: 0 },
    },
  });
}));

// ── AI Explainability (heavy — calls Claude) ────────────────────────────────

/** @swagger /api/ai-os/explain: post: { summary: AI explanation of any entity, tags: [AI OS - Introspection] } */
router.post('/ai-os/explain', authenticate, aiExportLimiter, requirePermission('ai.agent.read'), validate({ body: createExplainBody }), asyncHandler(async (req, res) => {
  const { entity_type, entity_id, question } = req.body;
  if (!entity_type || !entity_id) {
    throw new ValidationError([
      ...(!entity_type ? [{ path: 'entity_type', message: 'entity_type is required' }] : []),
      ...(!entity_id ? [{ path: 'entity_id', message: 'entity_id is required' }] : []),
    ]);
  }

  const schema = tenantSchema(req.tenantId);
  let entityData: Record<string, unknown> | null = null;

  const tableMap: Record<string, string> = {
    decision: 'ai_decisions',
    signal: 'governance_signals',
    alert: 'ai_alerts',
    observation: 'ai_observations',
    recommendation: 'ai_recommendations',
    gate: 'enforcement_gate_log',
    control: 'controls',
    risk: 'risks',
    incident: 'incidents',
  };

  const table = tableMap[entity_type];
  if (table) {
    const idCol = entity_type === 'gate' ? 'gate_log_id' : entity_type === 'control' ? 'control_id' : entity_type === 'risk' ? 'risk_id' : 'id';
    const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT * FROM "${schema}".${table} WHERE ${idCol} = $1 LIMIT 1`, [entity_id]), { tenantId: req.tenantId, operation: 'fallback query' });
    entityData = result.rows[0];
  }

  if (!entityData) throw new NotFoundError(entity_type, entity_id);

  const { claudeJSON } = await import('../../../../config/claude-client');
  const explanation = await claudeJSON({
    systemPrompt: `You are the AI Explainability Engine. Provide clear, bilingual-ready explanations of GRC decisions and actions.
Respond with JSON: {
  explanation_en: string, explanation_ar: string,
  reasoning_chain: string[], contributing_factors: string[],
  confidence: number (0-1), data_sources: string[],
  counterfactual: string (what would have happened differently)
}`,
    userMessage: `Explain this ${entity_type}:\n${JSON.stringify(entityData, null, 2)}${question ? `\n\nUser question: ${question}` : ''}`,
    maxTokens: 1536,
    temperature: 0.3,
  });

  res.ok({ entity_type, entity_id, ...explanation as object });
}));

export default router;

let genericPayloadSchema = z.record(z.unknown());

// @ts-nocheck
import { Request as _Request, Response as _Response, Router } from 'express';
import type { AuthenticatedRequest as _AuthenticatedRequest } from '@dos/types';
import { emitEvent as _emitEvent } from '../../ports/events.port';
import { logger } from '../../ports/logger.port';
// ============================================================
// AGRC-OS Unified Squad Routes — 22 endpoints
// ============================================================

import { z as _z } from 'zod';

import { authenticate, requirePermission } from '../../ports/auth.port';
import * as registry from '../../services/squad/unified-squad-registry.service';
import * as intervention from '../../ports/platform.port';
import * as erp from '../../../integrations/services/erp-connector.service';
import * as agentMgr from '../../services/squad/agent-squad-manager.service';
import { emptyResult, query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { emitModuleEvent } from '../../services/emit-event';
import { toErrorMessage } from '@dos/module-sdk';
import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, validate } from '../../ports/middleware.port';
import { getFirstRow } from '@dos/db';
import { swallow, swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience/resilient-catch';
import type { GenericRow as _GenericRow } from '@dos/types';
import { participantsPostBody, participantsIdStatusPutBody, syncPostBody, assignPostBody, intervenePostBody, handoffPostBody, erpConnectionsPostBody, erpConnectionsIdPutBody, erpConnectionsIdValidatePostBody, erpConnectionsIdMappingsPostBody, erpConnectionsIdSyncPostBody, agentsSeedPostBody, agentsIdStatusPutBody, createAiAssignBody, createAiRebalanceBody } from "../../schemas/ai.schemas";
import { traceSurfaceCall } from '../../../../domain/agrc-engine/observability/langfuse-bridge';
import { z } from "zod";

// ── Zod Schemas ──────────────────────────────────────────────────────────
import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(auditMiddleware("governance"));
router.use(automationMiddleware("governance"));

// ── Unified Squad Registry ─────────────────────────────────────────────────

// GET /unified-squad/participants
router.get('/participants', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const filters = {
  deploymentMode: req.query.deploymentMode as string,
  role: req.query.role as string,
  isAgent: req.query.isAgent === 'true' ? true : req.query.isAgent === 'false' ? false : undefined,
  status: req.query.status as string,
  };
  const result = await registry.listParticipants(tenantId, filters);
  res.json(result);
}));

// POST /unified-squad/participants
router.post('/participants', authenticate, validate({ body: participantsPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const { userId, displayNameEn, displayNameAr, role, deploymentMode, capabilities, isAgent, specialization, deliveryChannel, webhookUrl } = req.body;
  if (!userId || !displayNameEn || !displayNameAr || !role) {
  return res.status(400).json({ error: 'Missing required fields', code: 'VALIDATION_ERROR', details: 'userId, displayNameEn, displayNameAr, role are required' });
  }
  const result = await registry.registerParticipant(tenantId, { userId, displayNameEn, displayNameAr, role, deploymentMode, capabilities, isAgent, specialization, deliveryChannel, webhookUrl });
  setAuditData(res as any, { action: "create", entityType: "unified-squad", entityId: (result as Record<string, unknown>)?.id || userId, afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.status(201).json(result);
}));

// PUT /unified-squad/participants/:id/status
router.put('/participants/:id/status', authenticate, validate({ body: participantsIdStatusPutBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  await registry.updateParticipantStatus(tenantId, req.params.id, req.body.status);
  setAuditData(res as any, { action: "update", entityType: "unified-squad", entityId: req.params.id, afterState: { status: req.body.status } });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.updated' });
  res.json({ success: true });
}));

// POST /unified-squad/sync
router.post('/sync', authenticate, validate({ body: syncPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const { instanceId, roster } = req.body;
  const result = await registry.syncRemoteRoster(tenantId, instanceId, roster);
  setAuditData(res as any, { action: "update", entityType: "unified-squad", entityId: instanceId, afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.json(result);
}));

// POST /unified-squad/assign
router.post('/assign', authenticate, validate({ body: assignPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const { taskId, assigneeUserId } = req.body;
  const result = await registry.assignTask(tenantId, taskId, assigneeUserId);
  setAuditData(res as any, { action: "update", entityType: "unified-squad", entityId: taskId, afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.json(result);
}));

// ── Intervention ───────────────────────────────────────────────────────────

// POST /unified-squad/intervene
router.post('/intervene', authenticate, validate({ body: intervenePostBody }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.tenantId;
  const userId = req.userId;
  // Permission check: agrc_os:intervene
  const perms = req.permissions || [];
  if (!perms.includes('agrc_os:intervene') && !(req.user?.is_super_admin === true)) {
  return res.status(403).json({ error: 'Permission denied', code: 'FORBIDDEN', details: 'Requires agrc_os:intervene permission' });
  }

  const result = await intervention.executeIntervention(tenantId, { ...req.body, adminUserId: userId });

  setAuditData(res as any, { action: "create", entityType: "unified-squad", entityId: (result as Record<string, unknown>)?.interventionId || "intervention", afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.json(result);
  } catch (err: unknown) {
  const status = ((err as Record<string, unknown>)?.statusCode) || 500;
  res.status((status as any)).json({ error: toErrorMessage(err), code: 'INTERVENTION_FAILED' });
  }
}));

// GET /unified-squad/interventions
router.get('/interventions', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const filters = {
  workflowStepId: req.query.workflowStepId as string,
  adminUserId: req.query.adminUserId as string,
  type: req.query.type as string,
  limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
  };

  const result = await intervention.getInterventionAuditTrail(tenantId, filters);
  res.json(result);
}));

// POST /unified-squad/handoff
router.post('/handoff', authenticate, validate({ body: handoffPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;

  const result = await intervention.initiateHandoff(tenantId, req.body);

  setAuditData(res as any, { action: "create", entityType: "unified-squad", entityId: (result as Record<string, unknown>)?.id || "handoff", afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.status(201).json(result);
}));

// ── ERP Connector ──────────────────────────────────────────────────────────

// GET /unified-squad/erp/connections
router.get('/erp/connections', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await erp.getConnections(tenantId);
  res.json(result);
}));

// POST /unified-squad/erp/connections
router.post('/erp/connections', authenticate, validate({ body: erpConnectionsPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await erp.saveConnection(tenantId, req.body);

  setAuditData(res as any, { action: "create", entityType: "unified-squad", entityId: (result as Record<string, unknown>)?.id || "erp-connection", afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.status(201).json(result);
}));

// PUT /unified-squad/erp/connections/:id
router.put('/erp/connections/:id', authenticate, validate({ body: erpConnectionsIdPutBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await erp.saveConnection(tenantId, { ...req.body, connectionId: req.params.id });
  setAuditData(res as any, { action: "update", entityType: "unified-squad", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.updated' });
  res.json(result);
}));

// POST /unified-squad/erp/connections/:id/validate
router.post('/erp/connections/:id/validate', authenticate, validate({ body: erpConnectionsIdValidatePostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await erp.validateConnection(tenantId, req.params.id);
  setAuditData(res as any, { action: "update", entityType: "unified-squad", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.json(result);
}));

// GET /unified-squad/erp/connections/:id/mappings
router.get('/erp/connections/:id/mappings', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await erp.getFieldMappings(tenantId, req.params.id);
  res.json(result);
}));

// POST /unified-squad/erp/connections/:id/mappings
router.post('/erp/connections/:id/mappings', authenticate, validate({ body: erpConnectionsIdMappingsPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await erp.saveFieldMapping(tenantId, req.params.id, req.body);
  setAuditData(res as any, { action: "create", entityType: "unified-squad", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.status(201).json(result);
}));

// POST /unified-squad/erp/connections/:id/sync
router.post('/erp/connections/:id/sync', authenticate, validate({ body: erpConnectionsIdSyncPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await erp.executeSyncJob(tenantId, req.params.id);
  setAuditData(res as any, { action: "create", entityType: "unified-squad", entityId: req.params.id, afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.json(result);
}));

// GET /unified-squad/erp/connections/:id/history
router.get('/erp/connections/:id/history', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 100;
  const result = await erp.getSyncHistory(tenantId, req.params.id, limit);
  res.json(result);
}));

// ── Agent Squad ────────────────────────────────────────────────────────────

// GET /unified-squad/agents
router.get('/agents', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await registry.listParticipants(tenantId, { isAgent: true });
  res.json(result);
}));

// POST /unified-squad/agents/seed
router.post('/agents/seed', authenticate, validate({ body: agentsSeedPostBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await agentMgr.seedAgentSquad(tenantId);
  setAuditData(res as any, { action: "create", entityType: "unified-squad", entityId: tenantId, afterState: { seeded: result.length } });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.created' });
  res.json({ seeded: result.length, agents: result });
}));

// PUT /unified-squad/agents/:id/status
router.put('/agents/:id/status', authenticate, validate({ body: agentsIdStatusPutBody }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.tenantId;
  await traceSurfaceCall(
    {
      surface: 'agent-lifecycle',
      name: `agent-lifecycle.${req.params.id}.${req.body.status}`,
      tenantId,
      userId: req.user?.userId,
      input: { agentId: req.params.id, newStatus: req.body.status },
      metadata: { agentId: req.params.id, newStatus: req.body.status, op: 'transition' },
    },
    () => agentMgr.updateAgentStatus(tenantId, req.params.id, req.body.status),
  );
  setAuditData(res as any, { action: "update", entityType: "unified-squad", entityId: req.params.id, afterState: { status: req.body.status } });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'updated', entityType: 'unified_squad', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.updated' });
  res.json({ success: true });
  } catch (err: unknown) {
  const status = ((err as Record<string, unknown>)?.statusCode) || 500;
  res.status((status as any)).json({ error: toErrorMessage(err), code: 'AGENT_STATUS_FAILED' });
  }
}));

// GET /unified-squad/agents/:id/metrics
router.get('/agents/:id/metrics', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const result = await agentMgr.getAgentMetrics(tenantId, req.params.id);
  res.json(result);
}));

// GET /unified-squad/agents/monitoring (Tenant Admin only - comprehensive agent monitoring)
router.get('/agents/monitoring', authenticate, requirePermission('ai.squad.read'), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  try {
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);
  
  // Get all agents
  const agents = await registry.listParticipants(tenantId, { isAgent: true });
  
  // Get performance summaries for all agents
  const { getAgentPerformanceSummaries } = await import('../../services/observability/agent-metrics-aggregator.service');
  const performanceSummaries = await getAgentPerformanceSummaries(tenantId, 24);
  
  // Get latest metrics for each agent
  const agentMetricsMap = new Map<string, unknown>();
  for (const agent of agents) {
  try {
  const metrics = await agentMgr.getAgentMetrics(tenantId, (agent as any).userId);
  if (metrics.length > 0) {
  agentMetricsMap.set((agent as any).userId, metrics[0]); // Latest snapshot
  }
  } catch (err) {
  logger.warn(`[AgentMonitoring] Failed to get metrics for ${agent.userId}: ${toErrorMessage(err)}`);
  }
  }
  
  // Get workflow counts per agent
  const workflowCounts = await safeQuery(
  `SELECT assigned_participant_id, status, COUNT(*)::int as count
  FROM "${schema}".workflow_timeline_entries
  WHERE assigned_participant_id IS NOT NULL
  GROUP BY assigned_participant_id, status`
  );
  
  const workflowMap = new Map<string, { status: string; count: number }[]>();
  for (const row of workflowCounts.rows) {
  if (!workflowMap.has(row.assigned_participant_id)) {
  workflowMap.set(row.assigned_participant_id, []);
  }
  workflowMap.get(row.assigned_participant_id)!.push({ status: row.status, count: row.count });
  }
  
  // Combine all data
  const monitoringData = agents.map(agent => {
  const perf = performanceSummaries.find(p => p.agentId === agent.userId);
  const metrics = agentMetricsMap.get((agent as any).userId);
  const workflows = workflowMap.get((agent as any).userId) || [];
  
  return {
  agentId: agent.userId,
  displayName: agent.displayNameEn || agent.displayNameAr || agent.userId,
  role: agent.role,
  status: agent.currentStatus || 'active',
  specialization: agent.specialization,
  // Performance metrics
  performance: perf ? {
  runsTotal: perf.runsTotal,
  runsLast24h: perf.runsLast24h,
  actionsProposed: perf.actionsProposed,
  actionsExecuted: perf.actionsExecuted,
  avgDurationMs: perf.avgDurationMs,
  successRate: perf.successRate,
  lastRunAt: perf.lastRunAt,
  topActionTypes: perf.topActionTypes,
  } : null,
  // Collaboration metrics
  collaboration: metrics ? {

  suggestionsGenerated: metrics.suggestionsGenerated,

  suggestionsAccepted: metrics.suggestionsAccepted,

  tasksCompleted: metrics.tasksCompleted,

  avgTaskDurationMs: metrics.avgTaskDurationMs,

  errorCount: metrics.errorCount,

  snapshotAt: metrics.snapshotAt,
  } : null,
  // Workflow status
  workflows: {
  total: workflows.reduce((sum, w) => sum + w.count, 0),
  byStatus: workflows.reduce((acc, w) => {
  acc[w.status] = w.count;
  return acc;
  }, {} as Record<string, number>),
  },
  };
  });
  
  res.json({
  agents: monitoringData,
  totalAgents: agents.length,
  timestamp: new Date().toISOString(),
  });
  } catch (err: unknown) {
  res.status(500).json({ error: toErrorMessage(err), code: 'AGENT_MONITORING_FAILED' });
  }
}));

// ── Dashboard & Timeline ───────────────────────────────────────────────────

// GET /unified-squad/dashboard
router.get('/dashboard', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);

  const [participants, agents, timeline, interventions, metrics] = await Promise.all([
  registry.listParticipants(tenantId),
  registry.listParticipants(tenantId, { isAgent: true }),
  safeQuery(`SELECT status, COUNT(*) as count FROM "${schema}".workflow_timeline_entries GROUP BY status`),
  safeQuery(`SELECT COUNT(*) as count FROM "${schema}".intervention_audit_log`),
  agentMgr.getAgentMetrics(tenantId),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of timeline.rows) statusCounts[row.status] = parseInt(row.count, 10);

  res.json({
  totalParticipants: participants.length,
  humanParticipants: participants.filter(p => !p.isAgent).length,
  aiAgents: agents.length,
  activeWorkflows: (statusCounts['in_progress'] || 0) + (statusCounts['pending'] || 0),
  pendingApprovals: statusCounts['pending'] || 0,
  overdueTasks: statusCounts['overdue'] || 0,
  interventionCount: parseInt(getFirstRow(interventions)?.count || '0', 10),
  agentMetrics: metrics,
  });
}));

// GET /unified-squad/workflow-timeline
router.get('/workflow-timeline', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const schema = tenantSchema(tenantId);
  const status = req.query.status as string;
  const workflowType = req.query.workflowType as string;
  const participantId = req.query.participantId as string;

  const conds: string[] = [];
  const params: unknown[] = [];
  let idx = 1;
  if (status) { conds.push(`status = $${idx++}`); params.push(status); }
  if (workflowType) { conds.push(`workflow_type = $${idx++}`); params.push(workflowType); }
  if (participantId) { conds.push(`assigned_participant_id = $${idx++}`); params.push(participantId); }

  const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
  const result = await safeQuery(
  `SELECT * FROM "${schema}".workflow_timeline_entries ${where} ORDER BY due_date ASC NULLS LAST LIMIT 200`, params
  );
  res.json(result.rows);
}));

// ═══════════════════════════════════════════════════════════════
// AI-First Squad Enhancements — Capability matching & smart assignment
// ═══════════════════════════════════════════════════════════════

// POST /unified-squad/ai-assign — AI-driven task assignment based on capabilities
router.post('/ai-assign', authenticate, validate({ body: createAiAssignBody }), asyncHandler(async (req, res) => {
  const tenantId = req.tenantId;
  const { taskId, taskDescription, requiredCapabilities, urgency } = req.body;
  if (!taskDescription) {
    res.status(400).json({ error: 'taskDescription required' });
    return;
  }

  const schema = tenantSchema(tenantId);
  const participants = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT p.*,
       (SELECT COUNT(*) FROM "${schema}".process_tasks pt WHERE pt.assigned_to = p.user_id AND pt.status = 'open') AS open_tasks,
       (SELECT AVG(EXTRACT(EPOCH FROM (pt.completed_at - pt.created_at))/3600) FROM "${schema}".process_tasks pt WHERE pt.assigned_to = p.user_id AND pt.status = 'completed' AND pt.completed_at > NOW() - INTERVAL '30 days') AS avg_completion_hours
     FROM "${schema}".unified_squad_participants p
     WHERE p.status = 'active'`,
    []
  ), { tenantId: req.tenantId, operation: 'query process_tasks' });

  if (participants.rows.length === 0) {
    res.status(404).json({ error: 'No active squad participants' });
    return;
  }

  const { claudeJSON } = await import('../../../../config/claude-client');
  const assignment = await claudeJSON({
    systemPrompt: `You are an AI task assignment optimizer for a GRC squad. Match tasks to the best participant based on:
1. Capability match 2. Current workload 3. Historical performance 4. Specialization fit
Respond with JSON: {
  recommended_assignee: {user_id: string, display_name: string, match_score: number (0-100), reasons: string[]},
  alternatives: [{user_id: string, display_name: string, match_score: number, reason: string}],
  workload_warning: boolean,
  estimated_completion_hours: number
}`,
    userMessage: `Task: ${taskDescription}\nUrgency: ${urgency || 'normal'}\nRequired capabilities: ${JSON.stringify(requiredCapabilities || [])}\n\nAvailable participants:\n${JSON.stringify(participants.rows.map((p: Record<string, unknown>) => ({
      user_id: p.user_id, name: p.display_name_en, role: p.role, capabilities: p.capabilities,
      specialization: p.specialization, is_agent: p.is_agent, open_tasks: p.open_tasks,
      avg_hours: p.avg_completion_hours
    })))}`,
    maxTokens: 1024,
    temperature: 0.2,
  });

  // Auto-assign if confidence is high
  if ((assignment as any).recommended_assignee?.match_score >= 80 && taskId) {
    await safeQuery(
      `UPDATE "${schema}".process_tasks SET assigned_to = $1, updated_at = NOW() WHERE task_id = $2`,
      [(assignment as any).recommended_assignee.user_id, taskId]
    ).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId, userId: req.user!.userId, module: 'governance', event: 'ai_assignment', entityType: 'unified_squad', entityId: taskId || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.unified_squad.ai_assignment' });
  res.json(assignment);
}));

// GET /unified-squad/capability-matrix — Dynamic capability matrix
router.get('/capability-matrix', authenticate, validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);

  const [participants, taskHistory] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT user_id, display_name_en, role, capabilities, specialization, is_agent, status FROM "${schema}".unified_squad_participants ORDER BY role, display_name_en`), { tenantId: req.tenantId, operation: 'query unified_squad_participants' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT assigned_to, COUNT(*) AS total, COUNT(*) FILTER (WHERE status = 'completed') AS completed, COUNT(*) FILTER (WHERE status = 'overdue' OR (status = 'open' AND due_date < NOW())) AS overdue FROM "${schema}".process_tasks WHERE created_at > NOW() - INTERVAL '90 days' GROUP BY assigned_to`), { tenantId: req.tenantId, operation: 'query unified_squad_participants' }),
  ]);

  const taskMap = new Map(taskHistory.rows.map(( r: Record<string, unknown>) => [r.assigned_to, r]));
  const matrix = participants.rows.map((p: Record<string, unknown>) => ({
    ...p,
    performance: taskMap.get(p.user_id) || { total: 0, completed: 0, overdue: 0 },

    completion_rate: taskMap.get(p.user_id) ? Math.round(100 * (taskMap.get(p.user_id).completed / taskMap.get(p.user_id).total)) : null,
  }));

  res.json({ matrix, count: matrix.length });
}));

// POST /unified-squad/ai-rebalance — AI-driven workload rebalancing
router.post('/ai-rebalance', authenticate, validate({ body: createAiRebalanceBody }), asyncHandler(async (req, res) => {
  const schema = tenantSchema(req.tenantId);

  const [openTasks, participants] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT task_id, title, assigned_to, priority, due_date, created_at FROM "${schema}".process_tasks WHERE status = 'open' ORDER BY CASE WHEN priority = 'critical' THEN 0 WHEN priority = 'high' THEN 1 ELSE 2 END, due_date ASC LIMIT 100`), { tenantId: req.tenantId, operation: 'query process_tasks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT user_id, display_name_en, role, capabilities, specialization, status FROM "${schema}".unified_squad_participants WHERE status = 'active'`), { tenantId: req.tenantId, operation: 'query process_tasks' }),
  ]);

  const { claudeJSON } = await import('../../../../config/claude-client');
  const rebalance = await claudeJSON({
    systemPrompt: `You are a workload rebalancing optimizer. Analyze current task distribution and recommend reassignments.
Respond with JSON: {
  current_imbalance_score: number (0-100, 0=perfect),
  reassignments: [{task_id: string, from_user: string, to_user: string, reason: string}],
  workload_summary: [{user_id: string, name: string, current_tasks: number, recommended_max: number}],
  bottlenecks: string[]
}`,
    userMessage: `Open tasks (${openTasks.rows.length}):\n${JSON.stringify(openTasks.rows)}\n\nParticipants:\n${JSON.stringify(participants.rows)}`,
    maxTokens: 1536,
    temperature: 0.2,
  });

  res.json(rebalance);
}));

export default router;

let genericPayloadSchema = z.record(z.unknown());

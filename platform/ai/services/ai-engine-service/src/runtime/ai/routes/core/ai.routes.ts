import { Request as _Request, Response as _Response, Router } from 'express';
import { emitEvent as _emitEvent } from '../../ports/events.port';

import { authenticate, requirePermission } from '../../ports/auth.port';
import { getFirstRow } from '@dos/db';
import {
  orchestratedAssessRisk as assessRisk,
  orchestratedAnalyzeGap as analyzeComplianceGap,
  orchestratedGeneratePolicy as generatePolicy,
  orchestratedPrepareAudit as prepareAudit,
  orchestratedTriageIncident as triageIncident,
  orchestratedAnalyzeRegulatoryChange as analyzeRegulatoryChange,
  orchestratedGetProactiveInsights as getProactiveInsights,
  orchestratedAutoClassifyRisk as autoClassifyRisk,
  orchestratedAutoClassifyIncident as autoClassifyIncident,
} from '../../services/orchestration/ai-os-orchestrator.service';
import { emitModuleEvent } from '../../services/emit-event';
import { toErrorMessage as _toErrorMessage } from '@dos/module-sdk';
import { generatePolicyBody, copilotQueryBody as _copilotQueryBody, autoEvalBody } from "../schemas/ai.schemas";

import { asyncHandler, auditMiddleware, setAuditData, automationMiddleware, fieldRbacFilter, validate, moduleStack } from '../../ports/middleware.port';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
import { z } from "zod";

import type { Router as ExpressRouter } from 'express';
const router: ExpressRouter = Router();
router.use(moduleStack('ai'));
router.use(auditMiddleware("ai"));
router.use(automationMiddleware("ai"));
router.use(fieldRbacFilter("ai"));

const composeDescriptionBody = z.object({
  context: z.string().min(1).max(20_000),
  itemType: z.string().min(1).max(60).optional(),
}).strict();

const composeImproveBody = z.object({
  text: z.string().min(1).max(20_000),
  tone: z.enum(['professional', 'casual', 'formal']).optional(),
}).strict();

function clampText(value: string, maxLen: number): string {
  const v = value.trim();
  return v.length <= maxLen ? v : v.slice(0, maxLen).trim();
}

router.get("/risk-assessment/:riskId", authenticate, requirePermission("risk.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const riskId = req.params.riskId as string;
  const assessment = await assessRisk(req.tenantId, riskId);
  res.json(assessment);
}));

router.get("/gap-analysis/:frameworkId", authenticate, requirePermission("framework.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const frameworkId = req.params.frameworkId as string;
  const analysis = await analyzeComplianceGap(req.tenantId, frameworkId);
  res.json(analysis);
}));

router.post("/generate-policy", authenticate, requirePermission("policy.document.write"), validate({ body: generatePolicyBody }), asyncHandler(async (req, res) => {
  const { frameworkId, policyType } = req.body;
  if (!frameworkId || !policyType) {
  res.status(400).json({ error: "frameworkId, policyType required" }); return;
  }
  const policy = await generatePolicy(req.tenantId, req.body);

  setAuditData(res as any, { action: "create", entityType: "ai-analysis", entityId: policy?.id || "generate-policy", afterState: policy });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'ai', entityId: req.params.id || '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai.created' });
  res.json(policy);
}));

router.get("/audit-prep/:frameworkId", authenticate, requirePermission("audit.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const frameworkId = req.params.frameworkId as string;
  const checklist = await prepareAudit(req.tenantId, frameworkId);
  res.json(checklist);
}));

router.get("/triage-incident/:incidentId", authenticate, requirePermission("incident.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const incidentId = req.params.incidentId as string;
  const triage = await triageIncident(req.tenantId, incidentId);
  res.json(triage);
}));

router.get("/regulatory-impact/:instrumentId", authenticate, requirePermission("framework.record.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const instrumentId = req.params.instrumentId as string;
  const impact = await analyzeRegulatoryChange(req.tenantId, instrumentId);
  res.json(impact);
}));

// Proactive insights
router.get("/insights", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const tenantId = req.user?.tenantId || req.tenantId;
  const insights = await getProactiveInsights(tenantId);
  res.json(insights);
}));

// Auto-classify risk
router.post("/classify-risk", authenticate, requirePermission("risk.record.read"), validate({ body: autoEvalBody }), asyncHandler(async (req, res) => {
  const result = autoClassifyRisk(req.body, req.tenantId);
  setAuditData(res as any, { action: "create", entityType: "ai-analysis", entityId: "classify-risk", afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'ai', entityId: '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai.created' });
  res.json(result);
}));

// Auto-classify incident
router.post("/classify-incident", authenticate, requirePermission("incident.record.read"), validate({ body: autoEvalBody }), asyncHandler(async (req, res) => {
  const result = autoClassifyIncident(req.body, req.tenantId);
  setAuditData(res as any, { action: "create", entityType: "ai-analysis", entityId: "classify-incident", afterState: result });
  swallow(EC.EVENT_BUS, emitModuleEvent({ tenantId: req.tenantId, userId: req.user!.userId, module: 'governance', event: 'created', entityType: 'ai', entityId: '' }), { tenantId: req.tenantId, operation: 'grcEvent:governance.ai.created' });
  res.json(result);
}));

// AI performance dashboard — queries via service layer
router.get("/performance", authenticate, requirePermission("admin.config.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const { safeQuery, tenantSchema } = await import('@dos/db');
  const schema = tenantSchema(req.tenantId);
  const perf = await safeQuery(
    `SELECT COUNT(*) as total_executions,
            AVG(duration_ms / 1000.0) as avg_duration_sec,
            COUNT(*) FILTER (WHERE success = true) as successes
     FROM "${schema}".agent_performance
     WHERE executed_at > NOW() - INTERVAL '30 days'`,
  );
  const row = getFirstRow(perf) || {} as Record<string, unknown>;
  res.json({
    totalExecutions: parseInt(row.total_executions) || 0,
    avgDurationSec: parseFloat(row.avg_duration_sec) || 0,
    successRate: row.total_executions > 0 ? (parseInt(row.successes) / parseInt(row.total_executions)) * 100 : 0,
  });
}));

// ═══ Agent Activity Feed — real-time agent actions for dashboard ═══
router.get("/agent-activity", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const {
    getActivityFeed,
  } = await import('../../services/activity/agent-activity-feed.service');
  const feed = await getActivityFeed(req.tenantId, {
    limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
    agentId: req.query.agentId as string | undefined,
    actionType: req.query.actionType as string | undefined,
    since: req.query.since as string | undefined,
  });
  res.json({ activities: feed });
}));

// ═══ Agent Performance Stats — aggregated stats for all 12 agents ═══
router.get("/agent-performance", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const {
    getAgentPerformanceStats,
  } = await import('../../services/activity/agent-activity-feed.service');
  const stats = await getAgentPerformanceStats(req.tenantId);
  res.json({ stats });
}));

// ═══ Agent Cooperation Timeline — cross-agent action chains ═══
router.get("/agent-cooperation", authenticate, requirePermission("ai.agent.read"), validate({ query: z.record(z.unknown()) }), asyncHandler(async (req, res) => {
  const {
    getAgentCooperationTimeline,
  } = await import('../../services/activity/agent-activity-feed.service');
  const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
  const timeline = await getAgentCooperationTimeline(req.tenantId, limit);
  res.json({ timeline });
}));

// ═══ Frontend AI Assistant Endpoints — Enterprise Module Integration ═══
// Response shapes match frontend AIAssistantService contracts exactly.

import { safeQuery as aiSafeQuery, tenantSchema as aiTenantSchema } from '@dos/db';

const PRIORITY_KEYWORDS: Record<string, string[]> = {
  critical: ['critical', 'urgent', 'emergency', 'severe', 'p1'],
  high: ['high', 'important', 'major', 'significant', 'p2'],
  medium: ['medium', 'moderate', 'normal', 'standard', 'p3'],
  low: ['low', 'minor', 'trivial', 'cosmetic', 'p4'],
};

const STATUS_KEYWORDS: Record<string, string[]> = {
  active: ['active', 'open', 'in progress', 'ongoing', 'pending', 'new'],
  inactive: ['inactive', 'closed', 'completed', 'resolved', 'done', 'archived'],
  draft: ['draft', 'not started'],
  overdue: ['overdue', 'late', 'expired', 'past due'],
};

async function getModuleStats(tenantId: string, moduleCode: string): Promise<{ total: number; recentCount: number; statusBreakdown: Record<string, number>; avgAge: number }> {
  const schema = aiTenantSchema(tenantId);
  const tableName = moduleCode.replace(/-/g, '_');
  try {
    const [totalResult, recentResult, statusResult, ageResult] = await Promise.all([
      aiSafeQuery(`SELECT COUNT(*) as cnt FROM "${schema}"."${tableName}" WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ cnt: 0 }] })),
      aiSafeQuery(`SELECT COUNT(*) as cnt FROM "${schema}"."${tableName}" WHERE created_at > NOW() - INTERVAL '7 days' AND deleted_at IS NULL`).catch(() => ({ rows: [{ cnt: 0 }] })),
      aiSafeQuery(`SELECT COALESCE(status, 'unknown') as status, COUNT(*) as cnt FROM "${schema}"."${tableName}" WHERE deleted_at IS NULL GROUP BY COALESCE(status, 'unknown') ORDER BY cnt DESC LIMIT 10`).catch(() => ({ rows: [] })),
      aiSafeQuery(`SELECT AVG(EXTRACT(EPOCH FROM (NOW() - created_at)) / 86400) as avg_days FROM "${schema}"."${tableName}" WHERE deleted_at IS NULL`).catch(() => ({ rows: [{ avg_days: 0 }] })),
    ]);
    const statusBreakdown: Record<string, number> = {};
    for (const r of statusResult.rows) statusBreakdown[r.status] = parseInt(r.cnt) || 0;
    return {
      total: parseInt(totalResult.rows[0]?.cnt) || 0,
      recentCount: parseInt(recentResult.rows[0]?.cnt) || 0,
      statusBreakdown,
      avgAge: parseFloat(ageResult.rows[0]?.avg_days) || 0,
    };
  } catch {
    return { total: 0, recentCount: 0, statusBreakdown: {}, avgAge: 0 };
  }
}

router.post("/suggestions/list", authenticate, requirePermission("ai.suggestion.read"), asyncHandler(async (req, res) => {
  const { moduleCode, context } = req.body;
  const tenantId = req.tenantId;
  const stats = await getModuleStats(tenantId, moduleCode);
  const suggestions: Array<{
    id: string; type: string; label: string; description?: string;
    field?: string; value?: any; order?: number;
    severity: string; confidence: number; icon?: string; message?: string; action?: string;
  }> = [];

  if (stats.recentCount > 0) {
    suggestions.push({
      id: `sugg-${Date.now()}-recent`,
      type: 'filter',
      label: `${stats.recentCount} new this week`,
      description: `Show ${stats.recentCount} ${moduleCode} items created in the last 7 days`,
      field: 'created_at',
      value: { matchMode: 'dateAfter', value: new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0] },
      severity: 'info',
      confidence: 0.92,
      icon: 'pi pi-clock',
    });
  }

  const overdueStatuses = Object.entries(stats.statusBreakdown).filter(([s]) => ['overdue', 'past_due', 'expired'].includes(s.toLowerCase()));
  if (overdueStatuses.length > 0) {
    const overdueCount = overdueStatuses.reduce((sum, [, c]) => sum + c, 0);
    suggestions.push({
      id: `sugg-${Date.now()}-overdue`,
      type: 'alert',
      label: `${overdueCount} overdue items`,
      description: `${overdueCount} items require attention`,
      severity: 'danger',
      confidence: 0.95,
      icon: 'pi pi-exclamation-triangle',
      message: `There are ${overdueCount} overdue ${moduleCode} items that need immediate attention.`,
    });
  }

  if (stats.total > 50) {
    suggestions.push({
      id: `sugg-${Date.now()}-sort`,
      type: 'sort',
      label: 'Sort by newest',
      description: 'View most recently updated items first',
      field: 'updated_at',
      order: -1,
      severity: 'info',
      confidence: 0.80,
      icon: 'pi pi-sort-amount-down',
    });
  }

  const highPriority = Object.entries(stats.statusBreakdown).filter(([s]) => ['critical', 'high'].includes(s.toLowerCase()));
  if (highPriority.length > 0) {
    const hpCount = highPriority.reduce((sum, [, c]) => sum + c, 0);
    suggestions.push({
      id: `sugg-${Date.now()}-priority`,
      type: 'filter',
      label: `${hpCount} high priority`,
      description: `Filter to see ${hpCount} high/critical priority items`,
      field: 'priority',
      value: { matchMode: 'in', value: ['high', 'critical'] },
      severity: 'warning',
      confidence: 0.88,
      icon: 'pi pi-flag',
    });
  }

  if (stats.avgAge > 30 && stats.total > 10) {
    suggestions.push({
      id: `sugg-${Date.now()}-stale`,
      type: 'alert',
      label: 'Aging items detected',
      description: `Average item age is ${Math.round(stats.avgAge)} days`,
      severity: 'warning',
      confidence: 0.75,
      icon: 'pi pi-history',
      message: `Average ${moduleCode} item age is ${Math.round(stats.avgAge)} days. Consider reviewing older items.`,
    });
  }

  res.json(suggestions);
}));

router.post("/suggestions/filters", authenticate, requirePermission("ai.suggestion.read"), asyncHandler(async (req, res) => {
  const { moduleCode, currentFilters } = req.body;
  const tenantId = req.tenantId;
  const stats = await getModuleStats(tenantId, moduleCode);
  const suggestions: Array<{
    id: string; type: string; label: string; description?: string;
    field?: string; value?: any; severity: string; confidence: number; icon?: string;
  }> = [];

  for (const [status, count] of Object.entries(stats.statusBreakdown)) {
    if (count > 0 && !currentFilters?.[`status`]) {
      suggestions.push({
        id: `fsugg-${Date.now()}-${status}`,
        type: 'filter',
        label: `${status}: ${count}`,
        description: `Filter by status "${status}" (${count} items)`,
        field: 'status',
        value: status,
        severity: count > stats.total * 0.5 ? 'warning' : 'info',
        confidence: 0.85,
        icon: 'pi pi-filter',
      });
    }
  }

  res.json(suggestions);
}));

router.post("/query/interpret", authenticate, requirePermission("ai.query.read"), asyncHandler(async (req, res) => {
  const { moduleCode, query } = req.body;
  const tenantId = req.tenantId;
  const lowerQuery = (query || '').toLowerCase().trim();

  const filters: Record<string, any> = {};
  let sort: { field: string; order: 'asc' | 'desc' } | null = null;
  let confidence = 0.5;
  const interpretedParts: string[] = [];

  for (const [priority, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      filters.priority = priority;
      interpretedParts.push(`priority = ${priority}`);
      confidence = Math.max(confidence, 0.85);
      break;
    }
  }

  for (const [status, keywords] of Object.entries(STATUS_KEYWORDS)) {
    if (keywords.some(kw => lowerQuery.includes(kw))) {
      filters.status = status;
      interpretedParts.push(`status = ${status}`);
      confidence = Math.max(confidence, 0.85);
      break;
    }
  }

  if (lowerQuery.includes('recent') || lowerQuery.includes('latest') || lowerQuery.includes('newest')) {
    sort = { field: 'created_at', order: 'desc' };
    interpretedParts.push('sorted by newest first');
    confidence = Math.max(confidence, 0.80);
  } else if (lowerQuery.includes('oldest') || lowerQuery.includes('first')) {
    sort = { field: 'created_at', order: 'asc' };
    interpretedParts.push('sorted by oldest first');
    confidence = Math.max(confidence, 0.80);
  }

  if (lowerQuery.includes('today')) {
    filters.created_after = new Date().toISOString().split('T')[0];
    interpretedParts.push('created today');
    confidence = Math.max(confidence, 0.90);
  } else if (lowerQuery.includes('this week')) {
    const d = new Date(); d.setDate(d.getDate() - 7);
    filters.created_after = d.toISOString().split('T')[0];
    interpretedParts.push('created this week');
    confidence = Math.max(confidence, 0.88);
  } else if (lowerQuery.includes('this month')) {
    const d = new Date(); d.setDate(1);
    filters.created_after = d.toISOString().split('T')[0];
    interpretedParts.push('created this month');
    confidence = Math.max(confidence, 0.88);
  }

  const ownerMatch = lowerQuery.match(/(?:owned by|assigned to|by)\s+(\w+)/);
  if (ownerMatch) {
    filters.owner = ownerMatch[1];
    interpretedParts.push(`owned by ${ownerMatch[1]}`);
    confidence = Math.max(confidence, 0.75);
  }

  if (Object.keys(filters).length === 0 && !sort) {
    try {
      const schema = aiTenantSchema(tenantId);
      const tableName = moduleCode.replace(/-/g, '_');
      const colResult = await aiSafeQuery(
        `SELECT column_name FROM information_schema.columns
         WHERE table_schema = $1 AND table_name = $2
         ORDER BY ordinal_position`,
        [schema, tableName],
      );
      const columns = colResult.rows.map((r: any) => r.column_name);
      const queryWords = lowerQuery.split(/\s+/).filter((w: string) => w.length > 2);
      for (const col of columns) {
        if (queryWords.some((w: string) => col.includes(w) || w.includes(col.replace(/_/g, '')))) {
          filters.globalFilter = query;
          interpretedParts.push(`search in ${col}`);
          confidence = Math.max(confidence, 0.65);
          break;
        }
      }
      if (interpretedParts.length === 0) {
        filters.globalFilter = query;
        interpretedParts.push(`full-text search: "${query}"`);
        confidence = 0.50;
      }
    } catch {
      filters.globalFilter = query;
      interpretedParts.push(`search: "${query}"`);
      confidence = 0.50;
    }
  }

  res.json({
    query,
    interpreted: interpretedParts.length > 0 ? `Showing ${moduleCode} where ${interpretedParts.join(', ')}` : query,
    filters,
    sort,
    confidence,
  });
}));

router.post("/classify", authenticate, requirePermission("ai.classify.read"), asyncHandler(async (req, res) => {
  const { moduleCode, itemData } = req.body;
  const tenantId = req.tenantId;

  let category = 'general';
  let suggestedPriority: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  let confidence = 0.60;
  const suggestedTags: string[] = [moduleCode];
  const suggestedOwners: string[] = [];
  const explanationParts: string[] = [];

  const textContent = Object.values(itemData || {}).filter(v => typeof v === 'string').join(' ').toLowerCase();

  if (/security|breach|vulnerability|exploit|attack|malware/.test(textContent)) {
    category = 'security';
    suggestedPriority = 'critical';
    suggestedTags.push('security', 'urgent');
    confidence = 0.88;
    explanationParts.push('Security-related keywords detected');
  } else if (/compliance|regulation|audit|policy|framework|standard|iso|nist|gdpr/.test(textContent)) {
    category = 'compliance';
    suggestedPriority = 'high';
    suggestedTags.push('compliance', 'regulatory');
    confidence = 0.85;
    explanationParts.push('Compliance/regulatory keywords detected');
  } else if (/risk|threat|impact|likelihood|exposure|mitigation/.test(textContent)) {
    category = 'risk';
    suggestedPriority = 'high';
    suggestedTags.push('risk-management');
    confidence = 0.82;
    explanationParts.push('Risk management keywords detected');
  } else if (/incident|event|alert|outage|downtime|failure/.test(textContent)) {
    category = 'incident';
    suggestedPriority = 'high';
    suggestedTags.push('incident-response');
    confidence = 0.85;
    explanationParts.push('Incident-related keywords detected');
  } else if (/improvement|enhancement|optimization|process|workflow/.test(textContent)) {
    category = 'operational';
    suggestedPriority = 'medium';
    suggestedTags.push('process-improvement');
    confidence = 0.72;
    explanationParts.push('Operational improvement keywords detected');
  }

  try {
    const schema = aiTenantSchema(tenantId);
    const tableName = moduleCode.replace(/-/g, '_');
    const ownerResult = await aiSafeQuery(
      `SELECT DISTINCT owner, COUNT(*) as cnt FROM "${schema}"."${tableName}"
       WHERE deleted_at IS NULL AND owner IS NOT NULL
       GROUP BY owner ORDER BY cnt DESC LIMIT 3`,
    ).catch(() => ({ rows: [] }));
    suggestedOwners.push(...ownerResult.rows.map((r: any) => r.owner).filter(Boolean));
  } catch { /* ignore */ }

  if (explanationParts.length === 0) {
    explanationParts.push(`Auto-classified based on ${moduleCode} module context and content analysis`);
  }

  res.json({
    category,
    confidence,
    suggestedTags,
    suggestedOwners,
    suggestedPriority,
    explanation: explanationParts.join('. '),
  });
}));

router.post("/predict", authenticate, requirePermission("ai.predict.read"), asyncHandler(async (req, res) => {
  const { moduleCode, field, partialData } = req.body;
  const tenantId = req.tenantId;

  let predictedValue: unknown = null;
  let confidence = 0.50;
  const alternatives: Array<{ value: unknown; confidence: number }> = [];
  let reasoning = `Prediction for ${field} in ${moduleCode}`;

  try {
    const schema = aiTenantSchema(tenantId);
    const tableName = moduleCode.replace(/-/g, '_');

    const colCheck = await aiSafeQuery(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = $1 AND table_name = $2 AND column_name = $3`,
      [schema, tableName, field],
    ).catch(() => ({ rows: [] }));

    if (colCheck.rows.length > 0) {
      const freqResult = await aiSafeQuery(
        `SELECT "${field}" as val, COUNT(*) as cnt
         FROM "${schema}"."${tableName}"
         WHERE deleted_at IS NULL AND "${field}" IS NOT NULL
         GROUP BY "${field}"
         ORDER BY cnt DESC LIMIT 5`,
      ).catch(() => ({ rows: [] }));

      if (freqResult.rows.length > 0) {
        const totalSeen = freqResult.rows.reduce((s: number, r: any) => s + parseInt(r.cnt), 0);
        predictedValue = freqResult.rows[0].val;
        confidence = Math.min(0.95, parseInt(freqResult.rows[0].cnt) / totalSeen);
        reasoning = `Based on ${totalSeen} historical records, "${freqResult.rows[0].val}" is the most common value for ${field}`;

        for (let i = 1; i < freqResult.rows.length; i++) {
          alternatives.push({
            value: freqResult.rows[i].val,
            confidence: Math.min(0.90, parseInt(freqResult.rows[i].cnt) / totalSeen),
          });
        }
      }
    }
  } catch { /* use defaults */ }

  if (predictedValue === null && field === 'priority' && partialData?.category) {
    predictedValue = partialData.category === 'critical' ? 'high' : 'medium';
    confidence = 0.75;
    reasoning = 'Predicted from item category';
  }

  res.json({ field, predictedValue, confidence, alternatives, reasoning });
}));

router.post("/analytics/empty-state", authenticate, requirePermission("ai.analytics.read"), asyncHandler(async (req, res) => {
  const { moduleCode, filters: currentFilters } = req.body;
  const tenantId = req.tenantId;

  let recommendation: string;
  let suggestedActions: string[];

  if (currentFilters && Object.keys(currentFilters).length > 0) {
    const filterNames = Object.keys(currentFilters).join(', ');
    recommendation = `No items match your current filters (${filterNames}). Try adjusting or clearing them.`;
    suggestedActions = [
      'Clear all filters',
      'Adjust filter criteria',
      'Try a broader search',
    ];
  } else {
    let hasAnyData = false;
    try {
      const schema = aiTenantSchema(tenantId);
      const tableName = moduleCode.replace(/-/g, '_');
      const check = await aiSafeQuery(`SELECT 1 FROM "${schema}"."${tableName}" LIMIT 1`).catch(() => ({ rows: [] }));
      hasAnyData = check.rows.length > 0;
    } catch { /* ignore */ }

    if (hasAnyData) {
      recommendation = 'Data exists but current view settings may be filtering everything out. Try resetting your view.';
      suggestedActions = ['Reset view to default', 'Clear all filters', 'Switch to table view'];
    } else {
      recommendation = `Get started by creating your first ${moduleCode.replace(/-/g, ' ')} record, or import existing data.`;
      suggestedActions = [
        `Create new ${moduleCode.replace(/-/g, ' ')}`,
        'Import data from file',
        'View setup guide',
      ];
    }
  }

  res.json({ recommendation, suggestedActions });
}));

router.post("/analytics/anomalies", authenticate, requirePermission("ai.analytics.read"), asyncHandler(async (req, res) => {
  const { moduleCode, data: inputData } = req.body;
  const tenantId = req.tenantId;
  const anomalies: Array<{
    id: string; type: string; field: string; message: string;
    severity: string; confidence: number; affectedItemIds?: string[]; timestamp: string;
  }> = [];

  try {
    const schema = aiTenantSchema(tenantId);
    const tableName = moduleCode.replace(/-/g, '_');

    const volumeResult = await aiSafeQuery(
      `SELECT
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 day') as today,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') / 7.0 as daily_avg_week,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') / 30.0 as daily_avg_month
       FROM "${schema}"."${tableName}" WHERE deleted_at IS NULL`,
    ).catch(() => ({ rows: [{ today: 0, daily_avg_week: 0, daily_avg_month: 0 }] }));

    const v = volumeResult.rows[0];
    const todayCount = parseInt(v.today) || 0;
    const dailyAvg = parseFloat(v.daily_avg_month) || 0;

    if (dailyAvg > 0 && todayCount > dailyAvg * 2.5) {
      anomalies.push({
        id: `anomaly-vol-${Date.now()}`,
        type: 'spike',
        field: 'created_at',
        message: `Unusual spike: ${todayCount} items today vs ${dailyAvg.toFixed(1)} daily average`,
        severity: todayCount > dailyAvg * 5 ? 'critical' : 'warning',
        confidence: Math.min(0.95, 0.7 + (todayCount / dailyAvg - 2) * 0.1),
        timestamp: new Date().toISOString(),
      });
    }

    if (dailyAvg > 2 && todayCount === 0) {
      anomalies.push({
        id: `anomaly-drop-${Date.now()}`,
        type: 'drop',
        field: 'created_at',
        message: `No new items today — daily average is ${dailyAvg.toFixed(1)}`,
        severity: 'info',
        confidence: 0.70,
        timestamp: new Date().toISOString(),
      });
    }

    const staleResult = await aiSafeQuery(
      `SELECT id FROM "${schema}"."${tableName}"
       WHERE deleted_at IS NULL
         AND updated_at < NOW() - INTERVAL '90 days'
         AND status NOT IN ('closed', 'completed', 'archived', 'resolved')
       LIMIT 20`,
    ).catch(() => ({ rows: [] }));

    if (staleResult.rows.length > 0) {
      anomalies.push({
        id: `anomaly-stale-${Date.now()}`,
        type: 'missing-pattern',
        field: 'updated_at',
        message: `${staleResult.rows.length}+ items not updated in 90+ days while still open`,
        severity: staleResult.rows.length > 10 ? 'warning' : 'info',
        confidence: 0.85,
        affectedItemIds: staleResult.rows.map((r: any) => r.id),
        timestamp: new Date().toISOString(),
      });
    }
  } catch { /* return empty anomalies on error */ }

  res.json(anomalies);
}));

router.post("/compose/description", authenticate, requirePermission("ai.compose.read"), validate({ body: composeDescriptionBody, strict: true }), asyncHandler(async (req, res) => {
  const { context, itemType } = req.body;
  let suggestion = '';

  try {
    const { gatewayJSON } = await import('../../services/gateway/ai-gateway.service');
    const result = await gatewayJSON({
      tenantId: req.tenantId,
      systemPrompt: `You are a GRC professional. Generate a concise, professional description for a ${itemType || 'record'}. Keep it under 200 words.`,
      userMessage: `Generate a description based on this context: ${context}`,
      maxTokens: 300,
      temperature: 0.7,
    });
    suggestion = typeof result === 'string' ? clampText(result, 2000) : clampText(String(result), 2000);
  } catch {
    suggestion = clampText(`[${itemType || 'Record'}] ${context || 'No context provided'}`, 2000);
  }

  setAuditData(res as any, {
    action: 'create',
    entityType: 'ai_compose',
    entityId: 'description',
    afterState: {
      itemType: itemType || null,
      inputBytes: Buffer.byteLength(context ?? '', 'utf8'),
      outputBytes: Buffer.byteLength(suggestion ?? '', 'utf8'),
    },
  });

  res.json({ suggestion });
}));

router.post("/compose/improve", authenticate, requirePermission("ai.compose.read"), validate({ body: composeImproveBody, strict: true }), asyncHandler(async (req, res) => {
  const { text, tone } = req.body;
  let improved = text;

  try {
    const { gatewayJSON } = await import('../../services/gateway/ai-gateway.service');
    const result = await gatewayJSON({
      tenantId: req.tenantId,
      systemPrompt: `You are a professional editor. Improve the given text to be more ${tone || 'professional'}. Maintain the original meaning. Return only the improved text.`,
      userMessage: text,
      maxTokens: 500,
      temperature: 0.5,
    });
    improved = typeof result === 'string' ? clampText(result, 20_000) : clampText(String(result), 20_000);
  } catch { /* return original text on failure */ }

  setAuditData(res as any, {
    action: 'create',
    entityType: 'ai_compose',
    entityId: 'improve',
    afterState: {
      tone: tone || 'professional',
      inputBytes: Buffer.byteLength(text ?? '', 'utf8'),
      outputBytes: Buffer.byteLength(improved ?? '', 'utf8'),
    },
  });

  res.json({ improved });
}));

router.post("/voice/command", authenticate, requirePermission("ai.voice.read"), asyncHandler(async (req, res) => {
  const { text, transcript, moduleCode, locale } = req.body;
  const inputText = text || transcript || '';
  const lowerText = inputText.toLowerCase();

  let command: Record<string, any> = {
    text: inputText,
    command: 'unknown',
    confidence: 0.5,
    parameters: {} as Record<string, any>,
  };

  if (lowerText.includes('create') || lowerText.includes('new') || lowerText.includes('add') || lowerText.includes('إنشاء') || lowerText.includes('جديد')) {
    command.command = 'create';
    command.confidence = 0.85;
  } else if (lowerText.includes('search') || lowerText.includes('find') || lowerText.includes('look for') || lowerText.includes('بحث') || lowerText.includes('ابحث')) {
    command.command = 'search';
    command.confidence = 0.85;
    const searchTerms = lowerText.replace(/search for|find|look for|بحث عن|ابحث عن/g, '').trim();
    command.parameters.query = searchTerms;
  } else if (lowerText.includes('filter') || lowerText.includes('show only') || lowerText.includes('فلتر') || lowerText.includes('تصفية')) {
    command.command = 'filter';
    command.confidence = 0.8;
  } else if (lowerText.includes('refresh') || lowerText.includes('reload') || lowerText.includes('update') || lowerText.includes('تحديث')) {
    command.command = 'refresh';
    command.confidence = 0.9;
  } else if (lowerText.includes('export') || lowerText.includes('download') || lowerText.includes('save') || lowerText.includes('تصدير') || lowerText.includes('تحميل')) {
    command.command = 'export';
    command.confidence = 0.85;
  } else if (lowerText.includes('delete') || lowerText.includes('remove') || lowerText.includes('حذف')) {
    command.command = 'delete';
    command.confidence = 0.80;
  } else if (lowerText.includes('sort') || lowerText.includes('order') || lowerText.includes('ترتيب')) {
    command.command = 'sort';
    command.confidence = 0.80;
  }

  res.json(command);
}));

export default router;

let genericPayloadSchema = z.record(z.unknown());

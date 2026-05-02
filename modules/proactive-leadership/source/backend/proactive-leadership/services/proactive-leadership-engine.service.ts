import { logger } from '../ports/logger.port';
// ============================================
// Proactive Leadership Engine — Enterprise Grade
// AI-driven proactive governance signal detection,
// initiative generation, and executive insight engine.
// Gathers multi-source data (risks, compliance gaps,
// overdue items, workload, deadlines, incidents),
// uses Claude AI as "chief governance advisor",
// and persists action items + executive insights.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port';
import { toErrorMessage } from '../../../utils/error';

import type { GenericRow } from '@dos/types';
import { detectProactiveSignals } from '../../governance-os/services/misc/proactive-signal-detection.service';
import { fireProactiveInitiative, adjustThresholdsDynamically } from './proactive-initiative-firing.service';
import { eventBus } from '../ports/events.port';
import { swallowDefault, EC, catchHandler, swallow } from '@dos/platform-core/resilience';

export interface ProactiveSignal {
  signalType: string;
  moduleCode: string;
  severity: string;
  title?: string;
  description?: string;
  data?: Record<string, unknown>;
  confidence?: number;
  recommendedAction?: string;
  predictedImpact?: string;
  evidence?: string[] | Record<string, unknown>;
  timeframe?: string;
}

export interface ProactiveCycleResult {
  signalsDetected: number;
  initiativesFired: number;
  insightsGenerated: number;
  errors: string[];
  tenantId?: string;
  details?: Record<string, unknown>;
  predictionsMade?: number;
  thresholdAdjustments?: number;
  cycleMs?: number;
}

// ── Filter / pagination types ──

export interface InsightFilters {
  type?: string;
  priority?: string;
  status?: string;
  days?: number;
  page?: number;
  pageSize?: number;
}

export interface PaginatedInsights {
  insights: GenericRow[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
}

export interface LeadershipDashboard {
  topPriorities: GenericRow[];
  riskTrajectory: string;
  complianceMomentum: { direction: string; delta: number };
  recentCycles: GenericRow[];
  signalBreakdown: GenericRow[];
  executiveSummary: string;
  boardAttentionItems: string[];
  overdueSummary: { total: number; critical: number; avgDaysOverdue: number };
  workloadBalance: { maxLoad: number; minLoad: number; imbalanceRatio: number };
}

// ── Multi-source data gatherer ──

interface MultiSourceData {
  activeRisks: GenericRow[];
  complianceGaps: GenericRow[];
  overdueItems: GenericRow[];
  teamWorkloads: GenericRow[];
  upcomingDeadlines: GenericRow[];
  recentIncidents: GenericRow[];
}

/**
 * Gather multi-source governance data in parallel for AI analysis.
 * Pulls from risks, compliance, remediation, teams, deadlines, and incidents.
 */
async function gatherMultiSourceData(tenantId: string, schema: string): Promise<MultiSourceData> {
  const [
    activeRisksRes,
    complianceGapsRes,
    overdueItemsRes,
    teamWorkloadsRes,
    upcomingDeadlinesRes,
    recentIncidentsRes,
  ] = await Promise.all([
    // Active risks with severity distribution and recent trend
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT r.risk_id, r.risk_title, r.severity, r.status, r.risk_category,
              r.created_at, r.updated_at,
              CASE WHEN r.updated_at > r.created_at THEN 'active' ELSE 'new' END AS trend
       FROM "${schema}".risks r
       WHERE r.tenant_id = $1
         AND r.status NOT IN ('closed', 'archived', 'mitigated')
       ORDER BY
         CASE r.severity WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END,
         r.created_at DESC
       LIMIT 50`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query risks' }),

    // Compliance gaps by domain — controls without full evidence coverage
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT c.framework_code, c.domain_code,
              COUNT(*) AS total_controls,
              COUNT(*) FILTER (WHERE c.status != 'compliant') AS non_compliant,
              ROUND(COUNT(*) FILTER (WHERE c.status = 'compliant')::numeric / GREATEST(COUNT(*), 1) * 100, 1) AS compliance_pct
       FROM "${schema}".controls c
       WHERE c.tenant_id = $1
       GROUP BY c.framework_code, c.domain_code
       HAVING COUNT(*) FILTER (WHERE c.status != 'compliant') > 0
       ORDER BY non_compliant DESC
       LIMIT 30`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query controls' }),

    // Overdue remediation / action items
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT pt.task_id, pt.title, pt.priority, pt.due_date, pt.status,
              pt.assigned_to, pt.entity_type,
              EXTRACT(EPOCH FROM (NOW() - pt.due_date)) / 86400 AS days_overdue
       FROM "${schema}".process_tasks pt
       WHERE pt.tenant_id = $1
         AND pt.status NOT IN ('completed', 'cancelled')
         AND pt.due_date < NOW()
       ORDER BY pt.due_date ASC
       LIMIT 40`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query process_tasks' }),

    // Team workload imbalances
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT t.team_id, t.team_name, t.team_code,
              COUNT(pt.task_id) FILTER (WHERE pt.status NOT IN ('completed', 'cancelled')) AS open_tasks,
              COUNT(pt.task_id) FILTER (WHERE pt.status = 'completed') AS completed_tasks,
              COUNT(pt.task_id) FILTER (WHERE pt.due_date < NOW() AND pt.status NOT IN ('completed', 'cancelled')) AS overdue_tasks
       FROM "${schema}".teams t
       LEFT JOIN "${schema}".process_tasks pt ON pt.team_id = t.team_id AND pt.tenant_id = $1
       WHERE t.tenant_id = $1 AND t.status = 'active'
       GROUP BY t.team_id, t.team_name, t.team_code
       ORDER BY open_tasks DESC
       LIMIT 20`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query teams' }),

    // Upcoming regulatory deadlines (next 90 days)
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT rd.deadline_id, rd.framework_code, rd.deadline_title, rd.due_date,
              rd.severity, rd.status,
              EXTRACT(EPOCH FROM (rd.due_date - NOW())) / 86400 AS days_until
       FROM "${schema}".regulatory_deadlines rd
       WHERE rd.tenant_id = $1
         AND rd.due_date BETWEEN NOW() AND NOW() + INTERVAL '90 days'
         AND rd.status != 'completed'
       ORDER BY rd.due_date ASC
       LIMIT 20`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query regulatory_deadlines' }),

    // Recent incident patterns (last 60 days)
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT gs.signal_type, gs.source_module, gs.severity,
              gs.confidence_score, gs.detected_at, gs.status,
              gs.recommended_action_type
       FROM "${schema}".governance_signals gs
       WHERE gs.tenant_id = $1
         AND gs.detected_at > NOW() - INTERVAL '60 days'
       ORDER BY gs.detected_at DESC
       LIMIT 30`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query governance_signals' }),
  ]);

  return {
    activeRisks: activeRisksRes.rows,
    complianceGaps: complianceGapsRes.rows,
    overdueItems: overdueItemsRes.rows,
    teamWorkloads: teamWorkloadsRes.rows,
    upcomingDeadlines: upcomingDeadlinesRes.rows,
    recentIncidents: recentIncidentsRes.rows,
  };
}

/**
 * Run a complete proactive leadership cycle for a tenant.
 *
 * 1. Gathers multi-source data in parallel (risks, compliance, overdue, workload, deadlines, incidents)
 * 2. Detects signals via DB-driven rules across all enabled modules
 * 3. Uses Claude AI as "chief governance advisor" for strategic analysis
 * 4. Creates action items in process_tasks and persists insights
 * 5. Returns cycle results with actionsGenerated, insights, priorities, cycleId
 */
export async function runProactiveLeadershipCycle(tenantId: string): Promise<ProactiveCycleResult> {
  const schema = tenantSchema(tenantId);
  const startMs = Date.now();
  const details: Record<string, unknown>[] = [];

  // 1. Load module coverage config
  const { loadProactiveModuleCoverage } = await import('./proactive-leadership-config-loader.service.js');
  const enabledModules = (await loadProactiveModuleCoverage(tenantId)).filter(m => m.enabled);
  if (enabledModules.length === 0) {
    return { tenantId, signalsDetected: 0, initiativesFired: 0, insightsGenerated: 0, errors: [], predictionsMade: 0, thresholdAdjustments: 0, cycleMs: Date.now() - startMs, details: {} };
  }

  // 2. Gather multi-source governance data in parallel
  const multiSourceData = await gatherMultiSourceData(tenantId, schema);

  // 3. Detect signals across all enabled modules using DB-driven rules
  let allSignals: ProactiveSignal[] = [];
  try {
    allSignals = await detectProactiveSignals(tenantId);
  } catch (err) {
    logger.error(`[proactive-engine] Signal detection failed for tenant=${tenantId}:`, toErrorMessage(err));
  }

  // 4. Fire initiatives from high-confidence signals
  let initiativesFired = 0;
  try {
    const highConfidenceSignals = allSignals.filter(s => (s.confidence ?? 0) >= 0.7);
    for (const signal of highConfidenceSignals) {
      const fired = await fireProactiveInitiative(tenantId, signal);
      if (fired) initiativesFired++;
    }
  } catch { /* best-effort */ }

  // 5. Auto-adjust thresholds based on signal history
  let adjustments = 0;
  try {
    const result = await adjustThresholdsDynamically(tenantId, allSignals);
    adjustments = result.length;
  } catch { /* best-effort */ }

  // 6. AI-powered "Chief Governance Advisor" analysis
  let predictionsMade = 0;
  const hasDataForAi = allSignals.length > 0 ||
    multiSourceData.activeRisks.length > 0 ||
    multiSourceData.complianceGaps.length > 0 ||
    multiSourceData.overdueItems.length > 0;

  if (hasDataForAi) {
    try {
      const { claudeJSON } = await import('../../../config/claude-client.js');

      type ProactiveLeadershipAiAnalysis = {
        predictions?: Array<{ module?: string; prediction?: string; confidence?: number; timeframe?: string; recommended_action?: string }>;
        strategic_priorities?: unknown[];
        emerging_risks?: unknown[];
        resource_reallocations?: unknown[];
        proactive_actions?: Array<Record<string, unknown>>;
        executive_summary_en?: string;
        executive_summary_ar?: string;
        risk_trajectory?: 'improving' | 'stable' | 'deteriorating';
        board_attention_items?: unknown[];
        compliance_momentum?: { direction?: 'accelerating' | 'steady' | 'decelerating'; delta?: number };
      };

      // Build a concise data snapshot for AI analysis
      const dataSnapshot = {
        signals: allSignals.slice(0, 20).map(s => ({
          type: s.signalType, module: s.moduleCode,
          severity: s.severity, confidence: s.confidence,
          action: s.recommendedAction,
        })),
        riskSummary: {
          total: multiSourceData.activeRisks.length,
          critical: multiSourceData.activeRisks.filter(r => r.severity === 'critical').length,
          high: multiSourceData.activeRisks.filter(r => r.severity === 'high').length,
        },
        complianceGaps: multiSourceData.complianceGaps.slice(0, 10).map(g => ({
          framework: g.framework_code, domain: g.domain_code,
          compliancePct: g.compliance_pct, nonCompliant: g.non_compliant,
        })),
        overdueCount: multiSourceData.overdueItems.length,
        overdueTopItems: multiSourceData.overdueItems.slice(0, 5).map(o => ({
          title: o.title, priority: o.priority, daysOverdue: Math.round(o.days_overdue),
        })),
        teamWorkloads: multiSourceData.teamWorkloads.slice(0, 10).map(t => ({
          team: t.team_name, open: t.open_tasks, overdue: t.overdue_tasks,
        })),
        upcomingDeadlines: multiSourceData.upcomingDeadlines.slice(0, 5).map(d => ({
          title: d.deadline_title, framework: d.framework_code,
          daysUntil: Math.round(d.days_until), severity: d.severity,
        })),
        recentIncidentCount: multiSourceData.recentIncidents.length,
      };

      const systemPrompt = `You are a Chief Governance Advisor for a Saudi organization operating under KSA regulatory frameworks (NCA-ECC, SAMA-CSF, PDPL, SDAIA, NDMO).
Analyze the governance data snapshot and provide proactive (not reactive) strategic leadership insights.

Respond with JSON:
{
  "predictions": [{"module": string, "prediction": string, "confidence": number, "timeframe": string, "recommended_action": string}],
  "strategic_priorities": [{"priority": string, "urgency": "immediate"|"this_week"|"this_month", "rationale": string, "owner_role": string}],
  "emerging_risks": [{"risk": string, "likelihood": number, "potential_impact": string, "prevention_action": string}],
  "resource_reallocations": [{"from_area": string, "to_area": string, "reason": string}],
  "proactive_actions": [{"action": string, "type": "process_task"|"notification"|"escalation", "priority": "critical"|"high"|"medium"|"low", "assignee_role": string, "due_within_days": number}],
  "executive_summary_en": string,
  "executive_summary_ar": string,
  "risk_trajectory": "improving"|"stable"|"deteriorating",
  "board_attention_items": [string],
  "compliance_momentum": {"direction": "accelerating"|"steady"|"decelerating", "delta": number}
}`;

      const userMessage = `Governance data snapshot for proactive analysis:\n${JSON.stringify(dataSnapshot, null, 2)}`;
      const prompt = `${systemPrompt}\n\n${userMessage}`;
      const aiAnalysis = await claudeJSON<ProactiveLeadershipAiAnalysis>(prompt, { maxTokens: 2048, temperature: 0.3 });
      if (!aiAnalysis) throw new Error('AI response was null');

      predictionsMade = aiAnalysis.predictions?.length || 0;

      // 7. Create proactive action items in process_tasks
      const proactiveActions: Array<Record<string, unknown>> = aiAnalysis.proactive_actions || [];
      for (const action of proactiveActions.slice(0, 10)) {
        try {
          await safeQuery(
            `INSERT INTO "${schema}".process_tasks
               (tenant_id, title, description, priority, status, entity_type, source,
                due_date, created_at, updated_at)
             VALUES ($1, $2, $3, $4, 'open', 'proactive_leadership', 'ai_advisor',
                     NOW() + ($5 || ' days')::interval, NOW(), NOW())`,
            [
              tenantId,
              `[Proactive] ${action.action}`.substring(0, 500),
              `AI-generated proactive action. Type: ${action.type}. Assignee role: ${action.assignee_role || 'governance_lead'}.`,
              action.priority || 'medium',
              String(action.due_within_days || 7),
            ],
          ).catch(catchHandler(EC.EVENT_BUS, {})); // Best-effort; table may lack some columns
        } catch { /* non-fatal */ }
      }

      // 8. Persist executive insights
      await safeQuery(
        `INSERT INTO "${schema}".proactive_leadership_insights
           (tenant_id, cycle_timestamp, signals_count, predictions_json,
            executive_summary_en, executive_summary_ar, risk_trajectory,
            strategic_priorities_json, board_attention_items_json,
            compliance_momentum_json, source_data_snapshot)
         VALUES ($1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          tenantId,
          allSignals.length,
          JSON.stringify(aiAnalysis.predictions || []),
          aiAnalysis.executive_summary_en || '',
          aiAnalysis.executive_summary_ar || '',
          aiAnalysis.risk_trajectory || 'stable',
          JSON.stringify(aiAnalysis.strategic_priorities || []),
          JSON.stringify(aiAnalysis.board_attention_items || []),
          JSON.stringify(aiAnalysis.compliance_momentum || { direction: 'steady', delta: 0 }),
          JSON.stringify(dataSnapshot),
        ],
      ).catch(() => {
        // Fallback: try minimal insert if extra columns don't exist yet
        safeQuery(
          `INSERT INTO "${schema}".proactive_leadership_insights
             (tenant_id, cycle_timestamp, signals_count, predictions_json,
              executive_summary_en, executive_summary_ar, risk_trajectory)
           VALUES ($1, NOW(), $2, $3, $4, $5, $6)`,
          [
            tenantId, allSignals.length,
            JSON.stringify(aiAnalysis.predictions || []),
            aiAnalysis.executive_summary_en || '',
            aiAnalysis.executive_summary_ar || '',
            aiAnalysis.risk_trajectory || 'stable',
          ],
        ).catch(catchHandler(EC.EVENT_BUS, {}));
      });
    } catch { /* AI insights are best-effort */ }
  }

  for (const sig of allSignals) {
    details.push({ signalType: sig.signalType, moduleCode: sig.moduleCode, action: sig.recommendedAction, confidence: sig.confidence });
  }

  const result: ProactiveCycleResult = {
    tenantId,
    signalsDetected: allSignals.length,
    initiativesFired,
    insightsGenerated: 0,
    errors: [],
    predictionsMade,
    thresholdAdjustments: adjustments,
    cycleMs: Date.now() - startMs,
    details: Object.fromEntries(details.map((d, i) => [String(i), d])),
  };

  // Log cycle result
  await safeQuery(
    `INSERT INTO "${schema}".proactive_leadership_cycles
       (tenant_id, signals_detected, initiatives_fired, predictions_made,
        threshold_adjustments, cycle_ms, completed_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
    [tenantId, result.signalsDetected, result.initiativesFired,
     result.predictionsMade, result.thresholdAdjustments, result.cycleMs],
  ).catch(catchHandler(EC.EVENT_BUS, {}));

  await swallow(EC.EVENT_BUS, eventBus.publish(({
      eventType: 'proactive.cycle_completed', tenantId,
      sourceService: 'proactive-leadership-engine',
      entityType: 'proactive_cycle', severity: 'info',
      payload: {
        signalsDetected: result.signalsDetected,
        initiativesFired: result.initiativesFired,
        predictionsMade: result.predictionsMade,
        thresholdAdjustments: result.thresholdAdjustments,
        cycleMs: result.cycleMs,
      },
    } as any)), { tenantId, operation: 'eventBus:proactive.cycle_completed' });

  for (const signal of allSignals.filter(s => s.severity === 'critical')) {
    await swallow(EC.EVENT_BUS, eventBus.publish(({
          eventType: 'proactive.critical_signal_detected', tenantId,
          sourceService: 'proactive-leadership-engine',
          entityType: signal.moduleCode, severity: 'critical',
          payload: {
            signalType: signal.signalType,
            moduleCode: signal.moduleCode,
            confidence: signal.confidence,
            title: signal.title,
            recommendedAction: signal.recommendedAction,
            predictedImpact: signal.predictedImpact,
          },
        } as any)), { tenantId, operation: 'eventBus:proactive.critical_signal_detected' });
  }

  return result;
}

/**
 * Get leadership insights with filtering and pagination.
 *
 * Supports filters by insight type, priority, status, and time range.
 * Returns paginated results with metadata (generated_at, confidence, source_data).
 */
export async function getLeadershipInsights(
  tenantId: string,
  filters: InsightFilters = {},
): Promise<PaginatedInsights> {
  const schema = tenantSchema(tenantId);
  const days = filters.days || 30;
  const page = Math.max(filters.page || 1, 1);
  const pageSize = Math.min(Math.max(filters.pageSize || 20, 1), 100);
  const offset = (page - 1) * pageSize;

  // Build dynamic WHERE clauses based on filters
  const conditions: string[] = [
    `tenant_id = $1`,
    `cycle_timestamp > NOW() - ($2 || ' days')::interval`,
  ];
  const params: unknown[] = [tenantId, days];
  let paramIdx = 3;

  if (filters.type) {
    conditions.push(`risk_trajectory = $${paramIdx}`);
    params.push(filters.type);
    paramIdx++;
  }
  if (filters.priority) {
    // Filter insights where predictions contain items with matching priority
    conditions.push(`predictions_json::text ILIKE $${paramIdx}`);
    params.push(`%${filters.priority}%`);
    paramIdx++;
  }
  if (filters.status) {
    conditions.push(`risk_trajectory = $${paramIdx}`);
    params.push(filters.status);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  // Count total matching items
  const countRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(
    `SELECT COUNT(*) AS total
     FROM "${schema}".proactive_leadership_insights
     WHERE ${whereClause}`,
    params,
  ), { tenantId: tenantId, operation: 'query proactive_leadership_insights' });
  const totalItems = parseInt((countRes as any).rows[0]?.total || '0', 10);

  // Fetch paginated results
  const insightsRes = await safeQuery(
    `SELECT insight_id, tenant_id, cycle_timestamp AS generated_at,
            signals_count, predictions_json, executive_summary_en,
            executive_summary_ar, risk_trajectory,
            strategic_priorities_json, board_attention_items_json,
            compliance_momentum_json, source_data_snapshot
     FROM "${schema}".proactive_leadership_insights
     WHERE ${whereClause}
     ORDER BY cycle_timestamp DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, pageSize, offset],
  ).catch(() => {
    // Fallback without newer columns
    return swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT *, cycle_timestamp AS generated_at
       FROM "${schema}".proactive_leadership_insights
       WHERE ${whereClause}
       ORDER BY cycle_timestamp DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, pageSize, offset],
    ), { tenantId: tenantId, operation: 'query proactive_leadership_insights' });
  });

  return {
    insights: insightsRes.rows.map((row: GenericRow) => ({
      ...row,
      predictions: typeof row.predictions_json === 'string'
        ? JSON.parse(row.predictions_json) : (row.predictions_json || []),
      strategicPriorities: typeof row.strategic_priorities_json === 'string'
        ? JSON.parse(row.strategic_priorities_json) : (row.strategic_priorities_json || []),
      boardAttentionItems: typeof row.board_attention_items_json === 'string'
        ? JSON.parse(row.board_attention_items_json) : (row.board_attention_items_json || []),
      complianceMomentum: typeof row.compliance_momentum_json === 'string'
        ? JSON.parse(row.compliance_momentum_json) : (row.compliance_momentum_json || {}),
    })),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.ceil(totalItems / pageSize),
    },
  };
}

/**
 * Get leadership summary dashboard for executive display.
 *
 * Returns:
 * - Top 5 strategic priorities
 * - Risk trajectory (improving / stable / deteriorating)
 * - Compliance momentum direction and delta
 * - Recent cycle performance trend
 * - Signal type breakdown
 * - Board attention items
 * - Overdue and workload summaries
 */
export async function getLeadershipDashboard(tenantId: string): Promise<LeadershipDashboard> {
  const schema = tenantSchema(tenantId);

  const [
    latestInsightRes,
    recentCyclesRes,
    signalBreakdownRes,
    overdueSummaryRes,
    workloadRes,
  ] = await Promise.all([
    // Latest AI-generated insight with priorities and board items
    safeQuery(
      `SELECT predictions_json, executive_summary_en, risk_trajectory,
              strategic_priorities_json, board_attention_items_json,
              compliance_momentum_json, cycle_timestamp
       FROM "${schema}".proactive_leadership_insights
       WHERE tenant_id = $1
       ORDER BY cycle_timestamp DESC
       LIMIT 1`,
      [tenantId],
    ).catch(() => {
      // Fallback without newer columns
      return swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
        `SELECT predictions_json, executive_summary_en, risk_trajectory,
                cycle_timestamp
         FROM "${schema}".proactive_leadership_insights
         WHERE tenant_id = $1
         ORDER BY cycle_timestamp DESC
         LIMIT 1`,
        [tenantId],
      ), { tenantId: tenantId, operation: 'query proactive_leadership_insights' });
    }),

    // Recent cycle performance (last 14 days)
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT DATE(completed_at) AS day,
              SUM(signals_detected) AS signals,
              SUM(initiatives_fired) AS initiatives,
              SUM(predictions_made) AS predictions,
              AVG(cycle_ms) AS avg_cycle_ms
       FROM "${schema}".proactive_leadership_cycles
       WHERE tenant_id = $1
         AND completed_at > NOW() - INTERVAL '14 days'
       GROUP BY DATE(completed_at)
       ORDER BY day DESC`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query proactive_leadership_cycles' }),

    // Signal type breakdown (last 30 days)
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
      `SELECT signal_type, severity,
              COUNT(*) AS cnt,
              AVG(confidence_score) AS avg_confidence
       FROM "${schema}".governance_signals
       WHERE tenant_id = $1
         AND detected_at > NOW() - INTERVAL '30 days'
       GROUP BY signal_type, severity
       ORDER BY cnt DESC`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query governance_signals' }),

    // Overdue summary
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, critical: 0, avg_days_overdue: 0 }]), safeQuery(
      `SELECT
         COUNT(*) AS total,
         COUNT(*) FILTER (WHERE priority = 'critical') AS critical,
         COALESCE(AVG(EXTRACT(EPOCH FROM (NOW() - due_date)) / 86400), 0) AS avg_days_overdue
       FROM "${schema}".process_tasks
       WHERE tenant_id = $1
         AND status NOT IN ('completed', 'cancelled')
         AND due_date < NOW()`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query process_tasks' }),

    // Workload balance
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ max_load: 0, min_load: 0, imbalance_ratio: 0 }]), safeQuery(
      `SELECT
         MAX(open_tasks) AS max_load,
         MIN(open_tasks) AS min_load,
         CASE WHEN MIN(open_tasks) > 0
              THEN ROUND(MAX(open_tasks)::numeric / MIN(open_tasks), 2)
              ELSE MAX(open_tasks)::numeric END AS imbalance_ratio
       FROM (
         SELECT COUNT(pt.task_id) FILTER (WHERE pt.status NOT IN ('completed', 'cancelled')) AS open_tasks
         FROM "${schema}".teams t
         LEFT JOIN "${schema}".process_tasks pt ON pt.team_id = t.team_id AND pt.tenant_id = $1
         WHERE t.tenant_id = $1 AND t.status = 'active'
         GROUP BY t.team_id
       ) team_loads`,
      [tenantId],
    ), { tenantId: tenantId, operation: 'query teams' }),
  ]);

  // Parse latest insight
  const latest = latestInsightRes.rows[0] || {};
  const predictions = typeof latest.predictions_json === 'string'
    ? JSON.parse(latest.predictions_json) : (latest.predictions_json || []);
  const strategicPriorities = typeof latest.strategic_priorities_json === 'string'
    ? JSON.parse(latest.strategic_priorities_json) : (latest.strategic_priorities_json || []);
  const boardAttentionItems = typeof latest.board_attention_items_json === 'string'
    ? JSON.parse(latest.board_attention_items_json) : (latest.board_attention_items_json || []);
  const complianceMomentum = typeof latest.compliance_momentum_json === 'string'
    ? JSON.parse(latest.compliance_momentum_json) : (latest.compliance_momentum_json || { direction: 'steady', delta: 0 });

  // Build top 5 priorities: merge AI strategic priorities with high-confidence predictions
  const topPriorities = (strategicPriorities.length > 0
    ? strategicPriorities
    : predictions.filter((p: GenericRow) => p.confidence >= 0.7).map((p: GenericRow) => ({
        priority: p.prediction,
        urgency: p.timeframe === 'immediate' ? 'immediate' : 'this_week',
        rationale: p.recommended_action,
        owner_role: 'governance_lead',
      }))
  ).slice(0, 5);

  const overdue = overdueSummaryRes.rows[0] || {};
  const workload = workloadRes.rows[0] || {};

  return {
    topPriorities,
    riskTrajectory: latest.risk_trajectory || 'any',
    complianceMomentum: {
      direction: complianceMomentum.direction || 'steady',
      delta: complianceMomentum.delta || 0,
    },
    recentCycles: recentCyclesRes.rows,
    signalBreakdown: signalBreakdownRes.rows,
    executiveSummary: latest.executive_summary_en || 'No insights generated yet. Run a leadership cycle to generate executive analysis.',
    boardAttentionItems: Array.isArray(boardAttentionItems) ? boardAttentionItems : [],
    overdueSummary: {

      total: parseInt(overdue.total || '0', 10),

      critical: parseInt(overdue.critical || '0', 10),

      avgDaysOverdue: Math.round(parseFloat(overdue.avg_days_overdue || '0')),
    },
    workloadBalance: {

      maxLoad: parseInt(workload.max_load || '0', 10),

      minLoad: parseInt(workload.min_load || '0', 10),

      imbalanceRatio: parseFloat(workload.imbalance_ratio || '0'),
    },
  };
}

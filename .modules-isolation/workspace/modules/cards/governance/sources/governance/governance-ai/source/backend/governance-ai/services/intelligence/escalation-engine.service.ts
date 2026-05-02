import { logger } from '../../ports/logger.port';
/**
 * Governance AI — Escalation Engine Service
 *
 * Scans for governance items requiring escalation across multiple dimensions:
 * high-severity signals, SLA-breached tasks, untreated critical risks, and
 * overdue remediation items. Determines escalation levels and targets via
 * RACI and team hierarchy, creates escalation records and notifications,
 * and provides board/executive attention summaries with AI-powered prioritization.
 *
 * Escalation ladder: team_lead -> department_head -> executive -> board
 *
 * Regulatory: NCA ECC 2-6 (incident escalation), SAMA CSF (board reporting),
 * ISO 31000 (risk escalation), EU AI Act Art. 13 (transparency).
 */
import { emptyResult, safeQuery, safeQueryWithClient, tenantSchema, withTransaction } from '../../ports/database.port';
import { claudeJSON } from '../../ports/ai.port';
import { toErrorMessage } from '@dos/module-sdk';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import { emitSignalEscalated } from '../../events/governance_ai.publishers';

// ─── Types ───────────────────────────────────────────────────────────────────

export type EscalationLevel = 'team_lead' | 'department_head' | 'executive' | 'board';

const ESCALATION_LEVEL_ORDER: EscalationLevel[] = [
  'team_lead', 'department_head', 'executive', 'board',
];

export interface EscalationScanResult {
  escalations_created: number;
  board_items_created: number;
  exec_items_created: number;
}

export interface EscalationCandidate {
  item_type: 'signal' | 'process_task' | 'risk' | 'remediation';
  item_id: string;
  title: string;
  severity: string;
  reason: string;
  target_level: EscalationLevel;
  age_hours?: number;
  domain?: string;
}

export interface EscalationScanDetailedResult {
  escalated: number;
  items: EscalationCandidate[];
  byLevel: Record<EscalationLevel, number>;
}

export interface BoardAttentionSummary {
  items: unknown[];
  riskSummary: string;
  complianceSummary: string;
  recommendedActions: string[];
  statusCounts: Record<string, number>;
  total: number;
}

export interface ExecutiveAttentionSummary {
  items: unknown[];
  prioritizedActions: string[];
  statusCounts: Record<string, number>;
  total: number;
}

// ─── Escalation Scan ─────────────────────────────────────────────────────────

/**
 * Scan for items requiring escalation across four dimensions:
 * 1. High-severity signals past age threshold
 * 2. SLA-breached process tasks
 * 3. Critical risks without treatment plans
 * 4. Overdue remediation items
 *
 * For each candidate, determines escalation level, checks deduplication,
 * resolves escalation target via RACI/team hierarchy, and creates
 * escalation records and notifications.
 */
export async function runEscalationScan(
  tenantId: string
): Promise<EscalationScanResult> {
  const schema = tenantSchema(tenantId);
  const result: EscalationScanResult = {
    escalations_created: 0,
    board_items_created: 0,
    exec_items_created: 0,
  };

  // ── Dimension 1: High-severity signals past age threshold ──────────────
  const signals = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT gs.*, gi.id AS issue_id, gi.governance_domain, gi.urgency, gi.issue_summary,
           gi.requires_authority_review,
           EXTRACT(EPOCH FROM (NOW() - gs.detected_at)) / 3600 AS age_hours
    FROM "${schema}".governance_signals gs
    JOIN "${schema}".governance_interpreted_issues gi ON gi.signal_id = gs.id
    WHERE gs.status IN ('interpreted','escalated')
      AND gs.tenant_id = $1
      AND (
        gs.severity IN ('critical','high')
        OR gs.board_attention_flag = TRUE
        OR gs.recommended_escalation_level >= 2
      )
    ORDER BY
      CASE gs.severity
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        ELSE 2
      END,
      gs.detected_at ASC
  `, [tenantId]), { tenantId: tenantId, operation: 'fallback query' });

  for (const sig of signals.rows) {

    const ageHours = parseFloat(sig.age_hours) || 0;

    const targetLevel = determineEscalationLevel(sig.severity, ageHours, sig.recommended_escalation_level);

    // Check if already escalated to this level
    const existingEsc = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT id, escalation_level FROM "${schema}".governance_escalation_events
      WHERE source_signal_id = $1 AND tenant_id = $2
      ORDER BY created_at DESC LIMIT 1
    `, [sig.id, tenantId]), { tenantId: tenantId, operation: 'query governance_escalation_events' });

    if (existingEsc.rows.length > 0) {
      const existingLevel = existingEsc.rows[0].escalation_level;
      const existingIdx = ESCALATION_LEVEL_ORDER.indexOf(existingLevel as EscalationLevel);
      const targetIdx = ESCALATION_LEVEL_ORDER.indexOf(targetLevel);
      // Skip if already at or above target level
      if (existingIdx >= targetIdx) continue;
    }

    const shouldBoard = sig.board_attention_flag
      || sig.severity === 'critical'
      || targetLevel === 'board';
    const shouldExec = sig.severity === 'critical'
      || sig.requires_authority_review
      || targetLevel === 'executive'
      || targetLevel === 'board';

    // Resolve escalation target via RACI and team hierarchy

    const escalationTarget = await resolveEscalationTarget(schema, tenantId, targetLevel, sig.governance_domain);

    // Create escalation event record
    await safeQuery(`
      INSERT INTO "${schema}".governance_escalation_events
        (tenant_id, source_signal_id, source_issue_id, escalation_level,
         escalation_target_type, board_attention_flag, executive_attention_flag, reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [
      tenantId, sig.id, sig.issue_id, targetLevel,
      shouldBoard ? 'board' : (shouldExec ? 'executive' : 'management'),
      shouldBoard, shouldExec,
      `Auto-escalated: severity=${sig.severity}, domain=${sig.governance_domain}, urgency=${sig.urgency}, age=${Math.round(ageHours)}h`,
    ]);
    result.escalations_created++;

    // Publish escalation event for cross-module integration
    emitSignalEscalated(tenantId, (sig as any).id, {
      escalationLevel: targetLevel,
      targetType: shouldBoard ? 'board' : (shouldExec ? 'executive' : 'management'),
      targetId: escalationTarget || '',
      reason: `Auto-escalated: severity=${sig.severity}, domain=${sig.governance_domain}, urgency=${sig.urgency}, age=${Math.round(ageHours)}h`,

      boardAttention: shouldBoard,

      executiveAttention: shouldExec,
    });

    // Create notification for escalation target
    if (escalationTarget) {
      await safeQuery(`
        INSERT INTO "${schema}".notification_queue
          (tenant_id, recipient_id, notification_type, subject, body_json, priority)
        VALUES ($1, $2, 'governance_escalation', $3, $4::jsonb, $5)
      `, [
        tenantId,
        escalationTarget,

        `Governance Escalation (${targetLevel}): ${sig.issue_summary?.substring(0, 200) || sig.signal_type}`,
        JSON.stringify({
          signal_id: sig.id,
          issue_id: sig.issue_id,
          severity: sig.severity,
          domain: sig.governance_domain,
          escalation_level: targetLevel,
        }),
        sig.severity === 'critical' ? 'urgent' : 'high',
      ]).catch(catchHandler(EC.EVENT_BUS, {}));
    }

    // Create board attention item if needed
    if (shouldBoard) {
      const existingBoard = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
        SELECT id FROM "${schema}".board_attention_items
        WHERE source_entity_id = $1 AND tenant_id = $2 AND status != 'closed' LIMIT 1
      `, [sig.id, tenantId]), { tenantId: tenantId, operation: 'query board_attention_items' });
      if (existingBoard.rows.length === 0) {
        await safeQuery(`
          INSERT INTO "${schema}".board_attention_items
            (tenant_id, title, summary, source_module, source_entity_type, source_entity_id,
             severity, rationale, traceability_json)
          VALUES ($1,$2,$3,$4,'signal',$5,$6,$7,$8)
        `, [
          tenantId,

          `Board Attention: ${sig.issue_summary?.substring(0, 400) || sig.signal_type}`,
          sig.issue_summary || '',
          sig.source_module,
          sig.id,
          sig.severity,
          `Escalated from AI signal detection. Domain: ${sig.governance_domain}. Urgency: ${sig.urgency}. Age: ${Math.round(ageHours)}h.`,
          JSON.stringify({ signal_id: sig.id, issue_id: sig.issue_id, domain: sig.governance_domain }),
        ]);
        result.board_items_created++;
      }
    }

    // Create executive attention item if needed
    if (shouldExec) {
      const existingExec = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
        SELECT id FROM "${schema}".executive_attention_items
        WHERE source_entity_id = $1 AND tenant_id = $2 AND status != 'closed' LIMIT 1
      `, [sig.id, tenantId]), { tenantId: tenantId, operation: 'query executive_attention_items' });
      if (existingExec.rows.length === 0) {
        await safeQuery(`
          INSERT INTO "${schema}".executive_attention_items
            (tenant_id, title, summary, source_module, source_entity_type, source_entity_id,
             severity, rationale, traceability_json)
          VALUES ($1,$2,$3,$4,'signal',$5,$6,$7,$8)
        `, [
          tenantId,

          `Executive Alert: ${sig.issue_summary?.substring(0, 400) || sig.signal_type}`,
          sig.issue_summary || '',
          sig.source_module,
          sig.id,
          sig.severity,
          `Critical governance issue requiring executive review. Domain: ${sig.governance_domain}. Age: ${Math.round(ageHours)}h.`,
          JSON.stringify({ signal_id: sig.id, issue_id: sig.issue_id, domain: sig.governance_domain }),
        ]);
        result.exec_items_created++;
      }
    }

    // Update signal status to escalated
    await safeQuery(`
      UPDATE "${schema}".governance_signals SET status = 'escalated', updated_at = NOW() WHERE id = $1
    `, [sig.id]).catch(catchHandler(EC.EVENT_BUS, {}));
  }

  // ── Dimension 2: SLA-breached process tasks ────────────────────────────
  const breachedTasks = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT pt.task_id, pt.title, pt.priority, pt.sla_due_at, pt.assigned_to,
           pt.entity_type, pt.entity_id, pt.escalation_level,
           EXTRACT(EPOCH FROM (NOW() - pt.sla_due_at)) / 3600 AS breach_hours
    FROM "${schema}".process_tasks pt
    WHERE pt.tenant_id = $1
      AND pt.status NOT IN ('completed', 'cancelled')
      AND pt.sla_due_at IS NOT NULL
      AND pt.sla_due_at < NOW()
      AND pt.escalation_level < 3
    ORDER BY pt.sla_due_at ASC
    LIMIT 50
  `, [tenantId]), { tenantId: tenantId, operation: 'query process_tasks' });

  for (const task of breachedTasks.rows) {
    const breachHours = parseFloat((task as any).breach_hours) || 0;

    const newLevel = Math.min(((task.escalation_level || 0) + 1 as any), 3);
    const targetLevel = ESCALATION_LEVEL_ORDER[Math.min(newLevel, ESCALATION_LEVEL_ORDER.length - 1)];

    // Check existing escalation for this task
    const existingTaskEsc = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT id FROM "${schema}".governance_escalation_events
      WHERE source_signal_id = $1 AND escalation_level = $2 AND tenant_id = $3 LIMIT 1
    `, [task.task_id, targetLevel, tenantId]), { tenantId: tenantId, operation: 'query governance_escalation_events' });
    if (existingTaskEsc.rows.length > 0) continue;

    await safeQuery(`
      INSERT INTO "${schema}".governance_escalation_events
        (tenant_id, source_signal_id, source_issue_id, escalation_level,
         escalation_target_type, board_attention_flag, executive_attention_flag, reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [
      tenantId, task.task_id, task.entity_id, targetLevel,
      newLevel >= 3 ? 'board' : (newLevel >= 2 ? 'executive' : 'management'),
      newLevel >= 3, newLevel >= 2,

      `SLA breach: task "${task.title?.substring(0, 200) || task.task_id}" overdue by ${Math.round(breachHours)}h. Priority: ${task.priority}.`,
    ]);

    // Publish escalation event for SLA-breached task
    emitSignalEscalated(tenantId, (task as any).task_id, {
      escalationLevel: targetLevel,
      targetType: newLevel >= 3 ? 'board' : (newLevel >= 2 ? 'executive' : 'management'),

      targetId: task.assigned_to || '',
      reason: `SLA breach: task overdue by ${Math.round(breachHours)}h. Priority: ${task.priority}.`,
      boardAttention: newLevel >= 3,
      executiveAttention: newLevel >= 2,
    });

    // Update task escalation level
    await safeQuery(`
      UPDATE "${schema}".process_tasks
      SET escalation_level = $2, updated_at = NOW()
      WHERE task_id = $1
    `, [task.task_id, newLevel]).catch(catchHandler(EC.EVENT_BUS, {}));

    result.escalations_created++;

    if (newLevel >= 3) {
      await createBoardItemIfNotExists(schema, tenantId, (task as any).task_id, 'process_task',

        `Board Attention: SLA Breach — ${task.title?.substring(0, 300) || 'Process task'}`,
        `Process task overdue by ${Math.round(breachHours)} hours. Priority: ${task.priority}.`,
        task.priority === 'critical' ? 'critical' : 'high',
        { task_id: task.task_id, breach_hours: Math.round(breachHours) });
      result.board_items_created++;
    }
  }

  // ── Dimension 3: Critical risks without treatment plans ────────────────
  const untreatedRisks = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT r.risk_id, r.title, r.risk_level, r.status, r.created_at,
           EXTRACT(EPOCH FROM (NOW() - r.created_at)) / 3600 AS age_hours
    FROM "${schema}".risks r
    WHERE r.tenant_id = $1
      AND r.deleted_at IS NULL
      AND r.risk_level IN ('critical', 'high')
      AND r.status NOT IN ('treated', 'accepted', 'closed', 'mitigated')
      AND NOT EXISTS (
        SELECT 1 FROM "${schema}".risk_treatment_plans rtp
        WHERE rtp.risk_id = r.risk_id AND rtp.deleted_at IS NULL
      )
      AND r.created_at < NOW() - INTERVAL '72 hours'
    LIMIT 30
  `, [tenantId]), { tenantId: tenantId, operation: 'query risks' });

  for (const risk of untreatedRisks.rows) {
    const ageHours = parseFloat((risk as any).age_hours) || 0;
    const targetLevel: EscalationLevel = risk.risk_level === 'critical' ? 'executive' : 'department_head';

    const existingRiskEsc = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT id FROM "${schema}".governance_escalation_events
      WHERE source_signal_id = $1 AND tenant_id = $2 LIMIT 1
    `, [risk.risk_id, tenantId]), { tenantId: tenantId, operation: 'query governance_escalation_events' });
    if (existingRiskEsc.rows.length > 0) continue;

    await safeQuery(`
      INSERT INTO "${schema}".governance_escalation_events
        (tenant_id, source_signal_id, source_issue_id, escalation_level,
         escalation_target_type, board_attention_flag, executive_attention_flag, reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [
      tenantId, risk.risk_id, risk.risk_id, targetLevel,
      risk.risk_level === 'critical' ? 'executive' : 'management',
      risk.risk_level === 'critical', risk.risk_level === 'critical',

      `Untreated ${risk.risk_level} risk: "${risk.title?.substring(0, 200) || risk.risk_id}" with no treatment plan after ${Math.round(ageHours)}h.`,
    ]);
    result.escalations_created++;

    // Publish escalation event for untreated risk
    emitSignalEscalated(tenantId, (risk as any).risk_id, {
      escalationLevel: targetLevel,
      targetType: risk.risk_level === 'critical' ? 'executive' : 'management',
      targetId: '',
      reason: `Untreated ${risk.risk_level} risk with no treatment plan after ${Math.round(ageHours)}h.`,
      boardAttention: risk.risk_level === 'critical',
      executiveAttention: risk.risk_level === 'critical',
    });

    if (risk.risk_level === 'critical') {
      await createExecItemIfNotExists(schema, tenantId, (risk as any).risk_id, 'risk',

        `Executive Alert: Untreated Critical Risk — ${risk.title?.substring(0, 300) || risk.risk_id}`,
        `Critical risk without treatment plan for ${Math.round(ageHours / 24)} days.`,
        'critical',
        { risk_id: risk.risk_id, age_days: Math.round(ageHours / 24) });
      result.exec_items_created++;
    }
  }

  // ── Dimension 4: Overdue remediation items ─────────────────────────────
  const overdueItems = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT gai.id, gai.title_en, gai.priority, gai.due_date, gai.assigned_to,
           EXTRACT(DAY FROM NOW() - gai.due_date)::int AS days_overdue
    FROM "${schema}".governance_action_items gai
    WHERE gai.deleted_at IS NULL
      AND gai.status NOT IN ('completed', 'closed', 'cancelled')
      AND gai.due_date IS NOT NULL
      AND gai.due_date < CURRENT_DATE
      AND gai.due_date < CURRENT_DATE - INTERVAL '7 days'
    ORDER BY gai.due_date ASC
    LIMIT 30
  `, [tenantId]), { tenantId: tenantId, operation: 'query governance_action_items' });

  for (const item of overdueItems.rows) {
    const daysOverdue = item.days_overdue || 0;
    const targetLevel: EscalationLevel = (daysOverdue as any) > 30 ? 'executive' : ((daysOverdue as any) > 14 ? 'department_head' : 'team_lead');

    const existingItemEsc = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT id FROM "${schema}".governance_escalation_events
      WHERE source_signal_id = $1 AND escalation_level = $2 AND tenant_id = $3 LIMIT 1
    `, [item.id, targetLevel, tenantId]), { tenantId: tenantId, operation: 'query governance_escalation_events' });
    if (existingItemEsc.rows.length > 0) continue;

    await safeQuery(`
      INSERT INTO "${schema}".governance_escalation_events
        (tenant_id, source_signal_id, source_issue_id, escalation_level,
         escalation_target_type, board_attention_flag, executive_attention_flag, reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
    `, [
      tenantId, item.id, item.id, targetLevel,
      (daysOverdue as any) > 30 ? 'executive' : 'management',
      (daysOverdue as any) > 60, (daysOverdue as any) > 30,

      `Overdue remediation: "${item.title_en?.substring(0, 200) || item.id}" is ${daysOverdue} days past due. Priority: ${item.priority}.`,
    ]);
    result.escalations_created++;

    // Publish escalation event for overdue remediation item
    emitSignalEscalated(tenantId, (item as any).id, {
      escalationLevel: targetLevel,
      targetType: (daysOverdue as any) > 30 ? 'executive' : 'management',

      targetId: item.assigned_to || '',
      reason: `Overdue remediation: ${daysOverdue} days past due. Priority: ${item.priority}.`,
      boardAttention: (daysOverdue as any) > 60,
      executiveAttention: (daysOverdue as any) > 30,
    });
  }

  return result;
}

// ─── Board Attention Summary ─────────────────────────────────────────────────

/**
 * Produce a board-level attention summary with AI-powered prioritization.
 * Queries all items escalated to board level (signals, risks, compliance gaps,
 * incidents) and uses Claude AI to prioritize and summarize for board consumption.
 */
export async function getBoardAttentionSummary(
  tenantId: string
): Promise<BoardAttentionSummary> {
  const schema = tenantSchema(tenantId);

  const [items, counts] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT bai.*, gs.signal_type, gs.severity AS signal_severity
      FROM "${schema}".board_attention_items bai
      LEFT JOIN "${schema}".governance_signals gs ON gs.id = bai.source_entity_id
      WHERE bai.tenant_id = $1 AND bai.status != 'closed'
      ORDER BY
        CASE bai.severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        bai.created_at DESC
      LIMIT 50
    `, [tenantId]), { tenantId: tenantId, operation: 'query board_attention_items' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT status, COUNT(*)::int AS count
      FROM "${schema}".board_attention_items
      WHERE tenant_id = $1
      GROUP BY status
    `, [tenantId]), { tenantId: tenantId, operation: 'query board_attention_items' }),
  ]);

  const statusCounts: Record<string, number> = {};

  for (const r of counts.rows) statusCounts[(r as any).status] = r.count;

  // Gather supplementary board-level data
  const [criticalRisks, complianceGaps] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0, titles: [] }]), safeQuery(`
      SELECT COUNT(*)::int AS count, array_agg(title ORDER BY created_at DESC) AS titles
      FROM "${schema}".risks
      WHERE tenant_id = $1 AND risk_level = 'critical' AND deleted_at IS NULL
        AND status NOT IN ('treated', 'accepted', 'closed')
    `, [tenantId]), { tenantId: tenantId, operation: 'query risks' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ count: 0 }]), safeQuery(`
      SELECT COUNT(*)::int AS count
      FROM "${schema}".controls
      WHERE deleted_at IS NULL AND test_status = 'failed'
    `, []), { tenantId: tenantId, operation: 'query risks' }),
  ]);

  // AI-powered board summary
  let riskSummary = `${criticalRisks.rows[0]?.count || 0} critical risks require attention.`;
  let complianceSummary = `${complianceGaps.rows[0]?.count || 0} controls currently in failed state.`;
  let recommendedActions: string[] = [];

  if (items.rows.length > 0) {
    try {
      const aiResult = await claudeJSON<{
        risk_summary: string;
        compliance_summary: string;
        recommended_actions: string[];
        priority_order: string[];
      }>({
        systemPrompt: `You are a board-level GRC advisor for a KSA-regulated organization. Summarize governance items requiring board attention. Be concise, action-oriented, and reference KSA regulatory obligations (NCA ECC, SAMA CSF, PDPL) where relevant.`,
        userMessage: buildBoardSummaryPrompt(items.rows, criticalRisks.rows[0], complianceGaps.rows[0]),
        maxTokens: 1024,
        temperature: 0.2,
        tenantId,
        agentId: 'governance-ai-escalation',
        decisionType: 'board_attention_summary',
      });
      riskSummary = aiResult.risk_summary || riskSummary;
      complianceSummary = aiResult.compliance_summary || complianceSummary;
      recommendedActions = aiResult.recommended_actions || [];
    } catch (err: unknown) {
      logger.error(`[escalation-engine] AI board summary failed: ${toErrorMessage(err)}`);
      // Fall through to rule-based summaries above
      recommendedActions = buildRuleBasedBoardActions(items.rows, criticalRisks.rows[0]?.count || 0);
    }
  }

  return {
    items: items.rows,
    riskSummary,
    complianceSummary,
    recommendedActions,
    statusCounts,
    total: items.rows.length,
  };
}

// ─── Executive Attention Summary ─────────────────────────────────────────────

/**
 * Produce an executive-level attention summary with broader scope than
 * board summary. Includes items at executive escalation level and
 * provides prioritized actions.
 */
export async function getExecutiveAttentionSummary(
  tenantId: string
): Promise<ExecutiveAttentionSummary> {
  const schema = tenantSchema(tenantId);

  const [items, counts] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT eai.*, gs.signal_type, gs.severity AS signal_severity
      FROM "${schema}".executive_attention_items eai
      LEFT JOIN "${schema}".governance_signals gs ON gs.id = eai.source_entity_id
      WHERE eai.tenant_id = $1 AND eai.status != 'closed'
      ORDER BY
        CASE eai.severity
          WHEN 'critical' THEN 0
          WHEN 'high' THEN 1
          WHEN 'medium' THEN 2
          ELSE 3
        END,
        eai.created_at DESC
      LIMIT 50
    `, [tenantId]), { tenantId: tenantId, operation: 'query executive_attention_items' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT status, COUNT(*)::int AS count
      FROM "${schema}".executive_attention_items
      WHERE tenant_id = $1
      GROUP BY status
    `, [tenantId]), { tenantId: tenantId, operation: 'query executive_attention_items' }),
  ]);

  const statusCounts: Record<string, number> = {};

  for (const r of counts.rows) statusCounts[(r as any).status] = r.count;

  // Build prioritized actions (AI or rule-based)
  let prioritizedActions: string[] = [];

  if (items.rows.length > 0) {
    try {
      const aiResult = await claudeJSON<{
        prioritized_actions: string[];
        executive_brief: string;
      }>({
        systemPrompt: `You are an executive GRC advisor for a KSA-regulated organization. Provide a prioritized list of actions for executive attention items. Focus on risk reduction, regulatory compliance, and operational continuity. Reference KSA regulations (NCA ECC, SAMA CSF, PDPL) where applicable.`,
        userMessage: buildExecSummaryPrompt(items.rows),
        maxTokens: 768,
        temperature: 0.2,
        tenantId,
        agentId: 'governance-ai-escalation',
        decisionType: 'executive_attention_summary',
      });
      prioritizedActions = aiResult.prioritized_actions || [];
    } catch (err: unknown) {
      logger.error(`[escalation-engine] AI exec summary failed: ${toErrorMessage(err)}`);
      prioritizedActions = buildRuleBasedExecActions(items.rows);
    }
  }

  return {
    items: items.rows,
    prioritizedActions,
    statusCounts,
    total: items.rows.length,
  };
}

// ─── Manual Escalation ───────────────────────────────────────────────────────

/**
 * Manually escalate a governance item to a target level with a stated reason.
 * Creates an escalation event, updates the item if applicable, and creates
 * board/executive attention items as needed.
 */
export async function escalateItem(
  tenantId: string,
  itemType: string,
  itemId: string,
  targetLevel: EscalationLevel,
  reason: string
): Promise<{ escalation_id: string }> {
  const schema = tenantSchema(tenantId);

  const shouldBoard = targetLevel === 'board';
  const shouldExec = targetLevel === 'executive' || targetLevel === 'board';

  const escalationId = await withTransaction(tenantId, async (client) => {
    const escRes = await safeQueryWithClient(`
      INSERT INTO "${schema}".governance_escalation_events
        (tenant_id, source_signal_id, source_issue_id, escalation_level,
         escalation_target_type, board_attention_flag, executive_attention_flag, reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id
    `, [
      tenantId, itemId, itemId, targetLevel,
      shouldBoard ? 'board' : (shouldExec ? 'executive' : 'management'),
      shouldBoard, shouldExec,
      `Manual escalation (${itemType}): ${reason}`,
    ], client);

    if (shouldBoard) {
      const existingBoard = await safeQueryWithClient(`
        SELECT id FROM "${schema}".board_attention_items
        WHERE source_entity_id = $1 AND tenant_id = $2 AND status != 'closed' LIMIT 1
      `, [itemId, tenantId], client);
      if (existingBoard.rows.length === 0) {
        await safeQueryWithClient(`
          INSERT INTO "${schema}".board_attention_items
            (tenant_id, title, summary, source_module, source_entity_type, source_entity_id,
             severity, rationale, traceability_json)
          VALUES ($1,$2,$3,'governance',$4,$5,$6,$7,$8)
        `, [
          tenantId, `Board Attention (Manual): ${reason.substring(0, 400)}`,
          reason, itemType, itemId, 'high',
          `Auto-escalated to board level.`, JSON.stringify({ item_type: itemType, item_id: itemId, manual: true }),
        ], client);
      }
    }

    if (shouldExec) {
      const existingExec = await safeQueryWithClient(`
        SELECT id FROM "${schema}".executive_attention_items
        WHERE source_entity_id = $1 AND tenant_id = $2 AND status != 'closed' LIMIT 1
      `, [itemId, tenantId], client);
      if (existingExec.rows.length === 0) {
        await safeQueryWithClient(`
          INSERT INTO "${schema}".executive_attention_items
            (tenant_id, title, summary, source_module, source_entity_type, source_entity_id,
             severity, rationale, traceability_json)
          VALUES ($1,$2,$3,'governance',$4,$5,$6,$7,$8)
        `, [
          tenantId, `Executive Alert (Manual): ${reason.substring(0, 400)}`,
          reason, itemType, itemId, 'high',
          `Auto-escalated to executive level.`, JSON.stringify({ item_type: itemType, item_id: itemId, manual: true }),
        ], client);
      }
    }

    await safeQueryWithClient(`
      INSERT INTO "${schema}".governance_signal_events
        (tenant_id, signal_id, event_type, event_payload_json)
      VALUES ($1, $2, 'manual_escalation', $3::jsonb)
    `, [
      tenantId, itemId,
      JSON.stringify({ target_level: targetLevel, reason, item_type: itemType }),
    ], client);

    return escRes.rows[0]?.id;
  });

  emitSignalEscalated(tenantId, itemId, {
    escalationLevel: targetLevel,
    targetType: shouldBoard ? 'board' : (shouldExec ? 'executive' : 'management'),
    targetId: itemId,
    reason: `Manual escalation (${itemType}): ${reason}`,
    boardAttention: shouldBoard,
    executiveAttention: shouldExec,
  });

  return { escalation_id: escalationId };
}

// ─── De-Escalation ───────────────────────────────────────────────────────────

/**
 * Resolve or de-escalate an escalated item. Updates the escalation event,
 * closes related board/executive attention items, and logs the de-escalation.
 */
export async function deescalateItem(
  tenantId: string,
  escalationId: string,
  userId: string,
  reason: string
): Promise<{ success: boolean }> {
  const schema = tenantSchema(tenantId);

  const escRes = await safeQuery(`
    SELECT * FROM "${schema}".governance_escalation_events
    WHERE id = $1 AND tenant_id = $2
  `, [escalationId, tenantId]);

  if (escRes.rows.length === 0) return { success: false };
  const esc = escRes.rows[0];

  await withTransaction(tenantId, async (client) => {
    await safeQueryWithClient(`
      UPDATE "${schema}".governance_escalation_events
      SET reason = reason || ' | DE-ESCALATED: ' || $2,
          updated_at = NOW()
      WHERE id = $1
    `, [escalationId, reason], client);

    if (esc.board_attention_flag) {
      await safeQueryWithClient(`
        UPDATE "${schema}".board_attention_items
        SET status = 'closed', updated_at = NOW()
        WHERE source_entity_id = $1 AND tenant_id = $2 AND status != 'closed'
      `, [esc.source_signal_id, tenantId], client);
    }

    if (esc.executive_attention_flag) {
      await safeQueryWithClient(`
        UPDATE "${schema}".executive_attention_items
        SET status = 'closed', updated_at = NOW()
        WHERE source_entity_id = $1 AND tenant_id = $2 AND status != 'closed'
      `, [esc.source_signal_id, tenantId], client);
    }

    await safeQueryWithClient(`
      INSERT INTO "${schema}".governance_signal_events
        (tenant_id, signal_id, event_type, event_payload_json)
      VALUES ($1, $2, 'deescalated', $3::jsonb)
    `, [
      tenantId, esc.source_signal_id,
      JSON.stringify({
        escalation_id: escalationId,
        deescalated_by: userId,
        reason,
        previous_level: esc.escalation_level,
      }),
    ], client);
  });

  return { success: true };
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/** Determine escalation level based on severity, age, and recommended level. */
function determineEscalationLevel(
  severity: string,
  ageHours: number,
  recommendedLevel: number
): EscalationLevel {
  // Board level: critical > 48h, or recommended >= 3
  if (severity === 'critical' && ageHours > 48) return 'board';
  if (recommendedLevel >= 3) return 'board';

  // Executive level: critical > 24h, or high > 72h, or recommended >= 2
  if (severity === 'critical' && ageHours > 24) return 'executive';
  if (severity === 'high' && ageHours > 72) return 'executive';
  if (recommendedLevel >= 2) return 'executive';

  // Department head: critical, or high > 24h, or recommended >= 1
  if (severity === 'critical') return 'department_head';
  if (severity === 'high' && ageHours > 24) return 'department_head';
  if (recommendedLevel >= 1) return 'department_head';

  return 'team_lead';
}

/**
 * Resolve the user ID to whom the escalation should be directed.
 * Checks RACI assignments and team hierarchy for the target level and domain.
 */
async function resolveEscalationTarget(
  schema: string,
  tenantId: string,
  level: EscalationLevel,
  domain?: string
): Promise<string | null> {
  try {
    // Try RACI-based resolution for the governance domain
    if (domain) {
      const raciRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
        SELECT user_id FROM "${schema}".raci_assignments
        WHERE scope_type = $1 AND role_type = 'accountable'
        ORDER BY created_at DESC LIMIT 1
      `, [domain]), { tenantId: tenantId, operation: 'query raci_assignments' });

      if (raciRes.rows[0]?.user_id) return raciRes.rows[0].user_id;
    }

    const roleRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT role_code FROM "${schema}".escalation_level_roles
      WHERE escalation_level = $1 AND is_active = TRUE
      ORDER BY priority ASC LIMIT 1
    `, [level]), { tenantId, operation: 'query escalation_level_roles' });
    const targetRole = roleRes.rows[0]?.role_code || level;

    const teamRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT tm.user_id
      FROM "${schema}".team_members tm
      JOIN "${schema}".teams t ON t.team_id = tm.team_id
      WHERE tm.role = $1 AND tm.status = 'active'
      ORDER BY tm.created_at ASC LIMIT 1
    `, [targetRole]), { tenantId: tenantId, operation: 'query team_members' });

    if (teamRes.rows[0]?.user_id) return teamRes.rows[0].user_id;
  } catch {
    // Best-effort resolution
  }
  return null;
}

/** Create a board attention item if one does not already exist. */
async function createBoardItemIfNotExists(
  schema: string, tenantId: string, entityId: string, entityType: string,
  title: string, summary: string, severity: string, traceability: Record<string, unknown>
): Promise<void> {
  const existing = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT id FROM "${schema}".board_attention_items
    WHERE source_entity_id = $1 AND tenant_id = $2 AND status != 'closed' LIMIT 1
  `, [entityId, tenantId]), { tenantId: tenantId, operation: 'query board_attention_items' });
  if (existing.rows.length > 0) return;

  await safeQuery(`
    INSERT INTO "${schema}".board_attention_items
      (tenant_id, title, summary, source_module, source_entity_type, source_entity_id,
       severity, rationale, traceability_json)
    VALUES ($1,$2,$3,'governance',$4,$5,$6,$7,$8)
  `, [
    tenantId, title, summary, entityType, entityId, severity,
    `Auto-escalated to board level.`, JSON.stringify(traceability),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));
}

/** Create an executive attention item if one does not already exist. */
async function createExecItemIfNotExists(
  schema: string, tenantId: string, entityId: string, entityType: string,
  title: string, summary: string, severity: string, traceability: Record<string, unknown>
): Promise<void> {
  const existing = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT id FROM "${schema}".executive_attention_items
    WHERE source_entity_id = $1 AND tenant_id = $2 AND status != 'closed' LIMIT 1
  `, [entityId, tenantId]), { tenantId: tenantId, operation: 'query executive_attention_items' });
  if (existing.rows.length > 0) return;

  await safeQuery(`
    INSERT INTO "${schema}".executive_attention_items
      (tenant_id, title, summary, source_module, source_entity_type, source_entity_id,
       severity, rationale, traceability_json)
    VALUES ($1,$2,$3,'governance',$4,$5,$6,$7,$8)
  `, [
    tenantId, title, summary, entityType, entityId, severity,
    `Auto-escalated to executive level.`, JSON.stringify(traceability),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));
}

/** Build AI prompt for board-level summary generation. */
function buildBoardSummaryPrompt(items: unknown[], risks: any, complianceGaps: any): string {
  const parts: string[] = [];
  parts.push('Summarize the following governance items requiring board attention.');
  parts.push('');
  parts.push(`## Board Attention Items (${items.length})`);
  for (const item of items.slice(0, 15)) {

    parts.push(`- [${item.severity}] ${item.title?.substring(0, 300) || 'Unnamed item'}`);

    if (item.summary) parts.push(`  Summary: ${item.summary.substring(0, 200)}`);
  }
  parts.push('');
  parts.push(`## Risk Context`);
  parts.push(`- Critical risks: ${risks?.count || 0}`);
  if (risks?.titles?.length > 0) {
    parts.push(`- Top risks: ${risks.titles.slice(0, 5).map((t: string) => t?.substring(0, 100)).join('; ')}`);
  }
  parts.push(`- Failed controls: ${complianceGaps?.count || 0}`);
  parts.push('');
  parts.push('## Required JSON Response');
  parts.push('{');
  parts.push('  "risk_summary": "2-3 sentence risk summary for board",');
  parts.push('  "compliance_summary": "2-3 sentence compliance summary for board",');
  parts.push('  "recommended_actions": ["action1", "action2", ...],');
  parts.push('  "priority_order": ["item_title_1", "item_title_2", ...]');
  parts.push('}');
  return parts.join('\n');
}

/** Build AI prompt for executive-level summary generation. */
function buildExecSummaryPrompt(items: unknown[]): string {
  const parts: string[] = [];
  parts.push('Provide prioritized actions for the following executive attention items.');
  parts.push('');
  parts.push(`## Executive Attention Items (${items.length})`);
  for (const item of items.slice(0, 20)) {

    parts.push(`- [${item.severity}] ${item.title?.substring(0, 300) || 'Unnamed item'}`);

    if (item.summary) parts.push(`  Summary: ${item.summary.substring(0, 200)}`);
  }
  parts.push('');
  parts.push('## Required JSON Response');
  parts.push('{');
  parts.push('  "prioritized_actions": ["action1", "action2", ...],');
  parts.push('  "executive_brief": "3-5 sentence executive brief"');
  parts.push('}');
  return parts.join('\n');
}

/** Rule-based board actions fallback when AI is unavailable. */
function buildRuleBasedBoardActions(items: unknown[], criticalRiskCount: number): string[] {
  const actions: string[] = [];

  const critical = items.filter((i: Record<string, unknown>) => i.severity === 'critical');
  if (critical.length > 0) {
    actions.push(`Review ${critical.length} critical severity items requiring immediate board attention.`);
  }
  if (criticalRiskCount > 0) {
    actions.push(`Address ${criticalRiskCount} critical risks without adequate treatment plans.`);
  }

  const high = items.filter((i: Record<string, unknown>) => i.severity === 'high');
  if (high.length > 0) {
    actions.push(`Prioritize ${high.length} high-severity governance items for resolution.`);
  }
  if (actions.length === 0) {
    actions.push('No critical items requiring immediate board action at this time.');
  }
  return actions;
}

/** Rule-based executive actions fallback when AI is unavailable. */
function buildRuleBasedExecActions(items: unknown[]): string[] {
  const actions: string[] = [];
  const bySeverity: Record<string, number> = {};
  for (const item of items) {

    bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;
  }
  if (bySeverity.critical) {
    actions.push(`Immediately address ${bySeverity.critical} critical governance issues.`);
  }
  if (bySeverity.high) {
    actions.push(`Schedule review of ${bySeverity.high} high-priority items within 48 hours.`);
  }
  if (bySeverity.medium) {
    actions.push(`Plan remediation for ${bySeverity.medium} medium-priority items within 7 days.`);
  }
  if (actions.length === 0) {
    actions.push('No items requiring immediate executive action at this time.');
  }
  return actions;
}

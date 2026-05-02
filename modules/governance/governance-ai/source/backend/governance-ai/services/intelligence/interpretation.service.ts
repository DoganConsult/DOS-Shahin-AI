import { logger } from '../../ports/logger.port';
/**
 * Governance AI — Signal Interpretation Service
 *
 * Interprets governance signals using Claude AI to determine root cause,
 * organizational impact, and recommended actions. Supports batch interpretation
 * of new signals, single-signal deep interpretation with cross-signal
 * correlation, interpretation history, and re-interpretation with fresh context.
 *
 * Regulatory: SDAIA explainability, EU AI Act Art. 13 (transparency),
 * NCA ECC 2-3-4 (risk assessment), ISO 42001 (AI governance).
 */
import { emptyResult, safeQuery, tenantSchema } from '../../ports/database.port';
import { claudeJSON, ClaudeCompletionOpts as _ClaudeCompletionOpts } from '../../ports/ai.port';
import {
  GovernanceDomain, Severity, Urgency, SIGNAL_DOMAIN_MAP, RESPONSE_PATTERNS,
} from '../../types/governance-ai.types';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import { emitSignalInterpreted } from '../../events/governance_ai.publishers';

// ─── Result Types ────────────────────────────────────────────────────────────

export interface InterpretationResult {
  issue_id: string;
  signal_id: string;
  governance_domain: GovernanceDomain;
  issue_type: string;
  issue_summary: string;
  urgency: Urgency;
  risk_level: Severity;
  requires_authority_review: boolean;
  requires_human_approval: boolean;
}

export interface DeepInterpretationResult {
  interpretation: {
    meaning: string;
    root_cause: string;
    potential_impact: string;
    recommended_actions: string[];
  };
  relatedSignals: Array<{ id: string; signal_type: string; severity: string; detected_at: string }>;
  suggestedActions: string[];
  confidence: number;
}

export interface InterpretationHistoryFilters {
  domain?: GovernanceDomain;
  urgency?: Urgency;
  severity?: Severity;
  from_date?: string;
  to_date?: string;
  limit?: number;
  offset?: number;
}

export interface BatchInterpretationResult {
  interpreted: number;
  signals: InterpretationResult[];
}

// ─── AI System Prompt ────────────────────────────────────────────────────────

const INTERPRETATION_SYSTEM_PROMPT = `You are an expert GRC (Governance, Risk, and Compliance) analyst for a regulated organization in Saudi Arabia. You interpret governance signals detected by automated monitoring systems.

Your analysis must consider:
- KSA regulatory context (NCA ECC, SAMA CSF, PDPL, NDMO)
- International standards (ISO 27001, ISO 31000, ISO 42001)
- Organizational risk appetite and governance maturity

Respond ONLY with valid JSON matching the requested schema.`;

// ─── Batch Interpretation ────────────────────────────────────────────────────

/**
 * Batch-interpret all unprocessed signals for a tenant.
 * Queries signals with status = 'new' or 'unprocessed', gathers context,
 * uses Claude AI for interpretation, stores results, and updates signal status.
 */
export async function interpretNewSignals(
  tenantId: string
): Promise<BatchInterpretationResult> {
  const schema = tenantSchema(tenantId);

  // Fetch unprocessed signals (new or explicitly unprocessed)
  const newSigs = await safeQuery(`
    SELECT id FROM "${schema}".governance_signals
    WHERE status IN ('new', 'unprocessed') AND tenant_id = $1
    ORDER BY
      CASE severity
        WHEN 'critical' THEN 0
        WHEN 'high' THEN 1
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 3
        ELSE 4
      END,
      detected_at ASC
    LIMIT 100
  `, [tenantId]);

  const results: InterpretationResult[] = [];

  for (const row of newSigs.rows) {
    try {
      const r = await interpretSignal(tenantId, row.id);
      if (r && 'issue_id' in r) {
        results.push(r as InterpretationResult);
      }
    } catch (err: unknown) {
      // Log but continue batch — one failure should not halt the batch
      logger.error(
        `[interpretation] Failed to interpret signal ${row.id} for tenant ${tenantId}: ${toErrorMessage(err)}`
      );
    }
  }

  return { interpreted: results.length, signals: results };
}

// ─── Single Signal Interpretation ────────────────────────────────────────────

/**
 * Interpret a single signal with AI-powered deep analysis.
 * Loads the signal, gathers related entity context and historical patterns,
 * correlates with related signals in the same domain and timeframe,
 * and uses Claude AI for comprehensive interpretation.
 */
export async function interpretSignal(
  tenantId: string, signalId: string
): Promise<DeepInterpretationResult | InterpretationResult | null> {
  const schema = tenantSchema(tenantId);

  // Load the signal
  const sigRes = await safeQuery(`
    SELECT * FROM "${schema}".governance_signals WHERE id = $1
  `, [signalId]);
  const sig = sigRes.rows[0];
  if (!sig) return null;

  const domain = (SIGNAL_DOMAIN_MAP[sig.signal_type] || 'control_oversight') as GovernanceDomain;
  const pattern = RESPONSE_PATTERNS[domain] || RESPONSE_PATTERNS.control_oversight;
  const payload = typeof sig.payload_json === 'string'
    ? JSON.parse(sig.payload_json)
    : sig.payload_json || {};

  // Gather related entity context
  const entityContext = await gatherEntityContext(schema, sig);

  // Load related signals in the same domain within the last 30 days
  const relatedRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT id, signal_type, severity, status, detected_at, payload_json
    FROM "${schema}".governance_signals
    WHERE tenant_id = $1
      AND id != $2
      AND (
        source_entity_id = $3
        OR signal_type = $4
      )
      AND detected_at > NOW() - INTERVAL '30 days'
      AND status NOT IN ('resolved', 'archived')
    ORDER BY detected_at DESC
    LIMIT 10
  `, [tenantId, signalId, sig.source_entity_id, sig.signal_type]), { tenantId: tenantId, operation: 'query governance_signals' });

  const relatedSignals = relatedRes.rows.map((r: GenericRow) => ({
    id: r.id,
    signal_type: r.signal_type,
    severity: r.severity,
    detected_at: r.detected_at,
  }));

  // Load historical interpretation patterns for the same signal type
  const historyRes = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
    SELECT gi.governance_domain, gi.urgency, gi.risk_level, gi.issue_summary,
           gi.interpretation_json
    FROM "${schema}".governance_interpreted_issues gi
    JOIN "${schema}".governance_signals gs ON gs.id = gi.signal_id
    WHERE gs.signal_type = $1 AND gi.tenant_id = $2
    ORDER BY gi.created_at DESC LIMIT 5
  `, [sig.signal_type, tenantId]), { tenantId: tenantId, operation: 'query governance_interpreted_issues' });

  // Attempt AI interpretation with Claude
  let aiInterpretation: {
    meaning: string;
    root_cause: string;
    potential_impact: string;
    recommended_actions: string[];
    confidence: number;
    urgency_override?: Urgency;
    severity_override?: Severity;
  } | null = null;

  try {
    aiInterpretation = await claudeJSON<{
      meaning: string;
      root_cause: string;
      potential_impact: string;
      recommended_actions: string[];
      confidence: number;
      urgency_override?: Urgency;
      severity_override?: Severity;
    }>({
      systemPrompt: INTERPRETATION_SYSTEM_PROMPT,
      userMessage: buildAiInterpretationPrompt(sig, domain, payload, entityContext, relatedSignals, historyRes.rows),
      maxTokens: 1024,
      temperature: 0.2,
      tenantId,
      agentId: 'governance-ai-interpretation',
      decisionType: 'signal_interpretation',
    });
  } catch (err: unknown) {
    logger.error(`[interpretation] AI call failed for signal ${signalId}: ${toErrorMessage(err)}`);
    // Fall through to rule-based interpretation
  }

  // Compute urgency and summary
  const urgency = aiInterpretation?.urgency_override
    || mapUrgency(sig.severity, sig.recommended_escalation_level);
  const riskLevel = aiInterpretation?.severity_override || sig.severity;
  const issueType = `${domain}::${sig.signal_type}`;
  const summary = aiInterpretation?.meaning
    || buildSummary(sig.signal_type, payload, domain);
  const confidence = aiInterpretation?.confidence ?? 0.7;

  // Determine affected entities
  const affectedControl = payload.control_id
    || (sig.source_entity_type === 'control' ? sig.source_entity_id : null);
  const affectedPolicy = sig.source_entity_type === 'policy' ? sig.source_entity_id : null;
  const affectedCommittee = sig.source_entity_type === 'committee' ? sig.source_entity_id : null;

  // Build full interpretation JSON (for traceability and explainability)
  const interpretationJson = {
    signal_type: sig.signal_type,
    domain,
    pattern,
    payload,
    ai_interpretation: aiInterpretation
      ? {
        meaning: aiInterpretation.meaning,
        root_cause: aiInterpretation.root_cause,
        potential_impact: aiInterpretation.potential_impact,
        recommended_actions: aiInterpretation.recommended_actions,
        confidence: aiInterpretation.confidence,
      }
      : null,
    related_signal_count: relatedSignals.length,
    historical_pattern_count: historyRes.rows.length,
    entity_context: entityContext ? { type: entityContext.type, name: entityContext.name } : null,
  };

  // Persist interpretation to governance_interpreted_issues
  const res = await safeQuery(`
    INSERT INTO "${schema}".governance_interpreted_issues
      (tenant_id, signal_id, governance_domain, issue_type, issue_summary,
       urgency, risk_level, affected_committee_id, affected_policy_id, affected_control_id,
       requires_authority_review, requires_human_approval, interpretation_json)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id
  `, [
    tenantId, signalId, domain, issueType, summary,
    urgency, riskLevel,
    affectedCommittee, affectedPolicy, affectedControl,
    pattern.requires_authority, pattern.requires_human,
    JSON.stringify(interpretationJson),
  ]);

  // Publish signal interpreted event for cross-module integration
  emitSignalInterpreted(tenantId, signalId, {
    issueId: res.rows[0]?.id,
    governanceDomain: domain,
    urgency,
    riskLevel,
    requiresAuthorityReview: pattern.requires_authority,
    requiresHumanApproval: pattern.requires_human,
    aiPowered: !!aiInterpretation,
  });

  // Update signal status to 'interpreted'
  await safeQuery(`
    UPDATE "${schema}".governance_signals
    SET status = 'interpreted', updated_at = NOW()
    WHERE id = $1
  `, [signalId]).catch(catchHandler(EC.EVENT_BUS, {}));

  // Log interpretation event for audit trail
  await safeQuery(`
    INSERT INTO "${schema}".governance_signal_events
      (tenant_id, signal_id, event_type, event_payload_json)
    VALUES ($1, $2, 'interpreted', $3::jsonb)
  `, [
    tenantId, signalId,
    JSON.stringify({
      issue_id: res.rows[0]?.id,
      domain,
      ai_powered: !!aiInterpretation,
      confidence,
      related_signals: relatedSignals.length,
    }),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));

  // Return deep interpretation result when AI was used
  if (aiInterpretation) {
    return {
      interpretation: {
        meaning: aiInterpretation.meaning,
        root_cause: aiInterpretation.root_cause,
        potential_impact: aiInterpretation.potential_impact,
        recommended_actions: aiInterpretation.recommended_actions,
      },
      relatedSignals,
      suggestedActions: aiInterpretation.recommended_actions,
      confidence,
    };
  }

  // Fallback: return standard interpretation result
  return {
    issue_id: res.rows[0]?.id,
    signal_id: signalId,
    governance_domain: domain,
    issue_type: issueType,
    issue_summary: summary,
    urgency,
    risk_level: riskLevel,
    requires_authority_review: pattern.requires_authority,
    requires_human_approval: pattern.requires_human,
  };
}

// ─── Interpretation History ──────────────────────────────────────────────────

/**
 * Query past interpretations with optional filtering by domain, urgency,
 * severity, and date range. Returns paginated results.
 */
export async function getInterpretationHistory(
  tenantId: string,
  filters?: InterpretationHistoryFilters
): Promise<{ items: unknown[]; total: number }> {
  const schema = tenantSchema(tenantId);
  const conditions: string[] = ['gi.tenant_id = $1'];
  const params: unknown[] = [tenantId];
  let paramIdx = 2;

  if (filters?.domain) {
    conditions.push(`gi.governance_domain = $${paramIdx++}`);
    params.push(filters.domain);
  }
  if (filters?.urgency) {
    conditions.push(`gi.urgency = $${paramIdx++}`);
    params.push(filters.urgency);
  }
  if (filters?.severity) {
    conditions.push(`gi.risk_level = $${paramIdx++}`);
    params.push(filters.severity);
  }
  if (filters?.from_date) {
    conditions.push(`gi.created_at >= $${paramIdx++}`);
    params.push(filters.from_date);
  }
  if (filters?.to_date) {
    conditions.push(`gi.created_at <= $${paramIdx++}`);
    params.push(filters.to_date);
  }

  const where = conditions.join(' AND ');
  const limit = Math.min(filters?.limit || 50, 200);
  const offset = filters?.offset || 0;

  const [items, countRes] = await Promise.all([
    swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
      SELECT gi.*, gs.signal_type, gs.source_module, gs.source_entity_type,
             gs.source_entity_id, gs.severity AS signal_severity, gs.detected_at
      FROM "${schema}".governance_interpreted_issues gi
      JOIN "${schema}".governance_signals gs ON gs.id = gi.signal_id
      WHERE ${where}
      ORDER BY gi.created_at DESC
      LIMIT $${paramIdx} OFFSET $${paramIdx + 1}
    `, [...params, limit, offset]), { tenantId: tenantId, operation: 'query governance_interpreted_issues' }),
    swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0 }]), safeQuery(`
      SELECT COUNT(*)::int AS total
      FROM "${schema}".governance_interpreted_issues gi
      WHERE ${where}
    `, params), { tenantId: tenantId, operation: 'query governance_interpreted_issues' }),
  ]);

  return {
    items: items.rows.map((r: GenericRow) => ({
      ...r,
      interpretation_json: typeof r.interpretation_json === 'string'
        ? JSON.parse(r.interpretation_json) : r.interpretation_json,
    })),
    total: countRes.rows[0]?.total || 0,
  };
}

// ─── Re-Interpretation ───────────────────────────────────────────────────────

/**
 * Re-interpret a signal with fresh context. Resets the signal status to
 * allow a new interpretation pass with the latest context and AI analysis.
 * Useful when conditions have changed or additional context is available.
 */
export async function reinterpretSignal(
  tenantId: string, signalId: string
): Promise<DeepInterpretationResult | InterpretationResult | null> {
  const schema = tenantSchema(tenantId);

  // Verify the signal exists
  const sigCheck = await safeQuery(`
    SELECT id, status FROM "${schema}".governance_signals WHERE id = $1 AND tenant_id = $2
  `, [signalId, tenantId]);
  if (sigCheck.rows.length === 0) return null;

  // Archive existing interpretations for this signal (soft-archive for audit)
  await safeQuery(`
    UPDATE "${schema}".governance_interpreted_issues
    SET urgency = urgency
    WHERE signal_id = $1 AND tenant_id = $2
  `, [signalId, tenantId]).catch(catchHandler(EC.EVENT_BUS, {}));

  // Note: we keep old interpretations for traceability but create a fresh one.
  // Reset signal status so it gets re-interpreted
  await safeQuery(`
    UPDATE "${schema}".governance_signals
    SET status = 'new', updated_at = NOW()
    WHERE id = $1
  `, [signalId]).catch(catchHandler(EC.EVENT_BUS, {}));

  // Log re-interpretation event
  await safeQuery(`
    INSERT INTO "${schema}".governance_signal_events
      (tenant_id, signal_id, event_type, event_payload_json)
    VALUES ($1, $2, 'reinterpretation_requested', $3::jsonb)
  `, [
    tenantId, signalId,
    JSON.stringify({ reason: 'manual_reinterpretation', timestamp: new Date().toISOString() }),
  ]).catch(catchHandler(EC.EVENT_BUS, {}));

  // Run fresh interpretation
  return interpretSignal(tenantId, signalId);
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

/**
 * Gather context for the source entity referenced by the signal.
 * Queries the relevant tenant table based on entity type.
 */
async function gatherEntityContext(
  schema: string,
  sig: any
): Promise<{ type: string; name: string; details: Record<string, unknown> } | null> {
  const entityType = sig.source_entity_type;
  const entityId = sig.source_entity_id;
  if (!entityType || !entityId) return null;

  try {
    switch (entityType) {
      case 'control': {
        const res = await safeQuery(`
          SELECT control_id, title, owner, test_status, framework_id, risk_level
          FROM "${schema}".controls
          WHERE control_id = $1 AND deleted_at IS NULL
        `, [entityId]);
        const c = res.rows[0];
        if (!c) return null;
        return { type: 'control', name: c.title || entityId, details: c };
      }
      case 'incident': {
        const res = await safeQuery(`
          SELECT incident_id, title, severity, status, root_cause, created_at
          FROM "${schema}".incidents
          WHERE incident_id = $1 AND deleted_at IS NULL
        `, [entityId]);
        const i = res.rows[0];
        if (!i) return null;
        return { type: 'incident', name: i.title || entityId, details: i };
      }
      case 'policy': {
        const res = await safeQuery(`
          SELECT policy_id, title, status, owner, next_review_date
          FROM "${schema}".policies
          WHERE policy_id = $1 AND deleted_at IS NULL
        `, [entityId]);
        const p = res.rows[0];
        if (!p) return null;
        return { type: 'policy', name: p.title || entityId, details: p };
      }
      case 'exception': {
        const res = await safeQuery(`
          SELECT exception_id, title, risk_level, expiry_date
          FROM "${schema}".exceptions
          WHERE exception_id = $1 AND deleted_at IS NULL
        `, [entityId]);
        const e = res.rows[0];
        if (!e) return null;
        return { type: 'exception', name: e.title || entityId, details: e };
      }
      case 'committee': {
        const res = await safeQuery(`
          SELECT team_id, name_en, committee_type
          FROM "${schema}".teams
          WHERE team_id = $1 AND committee_type IS NOT NULL
        `, [entityId]);
        const t = res.rows[0];
        if (!t) return null;
        return { type: 'committee', name: t.name_en || entityId, details: t };
      }
      default:
        return null;
    }
  } catch {
    return null;
  }
}

/**
 * Build the AI prompt for deep signal interpretation.
 * Includes signal data, entity context, related signals, and historical patterns.
 */
function buildAiInterpretationPrompt(
  sig: any,
  domain: GovernanceDomain,
  payload: Record<string, unknown>,
  entityContext: { type: string; name: string; details: Record<string, unknown> } | null,
  relatedSignals: Array<{ id: string; signal_type: string; severity: string; detected_at: string }>,
  historicalPatterns: unknown[]
): string {
  const parts: string[] = [];

  parts.push(`Interpret this governance signal and provide actionable analysis.`);
  parts.push('');
  parts.push(`## Signal Details`);
  parts.push(`- Type: ${sig.signal_type}`);
  parts.push(`- Domain: ${domain}`);
  parts.push(`- Severity: ${sig.severity}`);
  parts.push(`- Confidence: ${sig.confidence_score}`);
  parts.push(`- Detected at: ${sig.detected_at}`);
  parts.push(`- Source: ${sig.source_module} / ${sig.source_entity_type} / ${sig.source_entity_id}`);

  if (Object.keys(payload).length > 0) {
    parts.push('');
    parts.push(`## Signal Payload`);
    parts.push(JSON.stringify(payload, null, 2));
  }

  if (entityContext) {
    parts.push('');
    parts.push(`## Source Entity Context`);
    parts.push(`- Entity: ${entityContext.type} — "${entityContext.name}"`);
    parts.push(JSON.stringify(entityContext.details, null, 2));
  }

  if (relatedSignals.length > 0) {
    parts.push('');
    parts.push(`## Related Signals (${relatedSignals.length})`);
    for (const rs of relatedSignals.slice(0, 5)) {
      parts.push(`- ${rs.signal_type} (${rs.severity}) detected ${rs.detected_at}`);
    }
  }

  if (historicalPatterns.length > 0) {
    parts.push('');
    parts.push(`## Historical Patterns (${historicalPatterns.length} previous interpretations of this signal type)`);
    for (const hp of historicalPatterns.slice(0, 3)) {

      parts.push(`- Domain: ${hp.governance_domain}, Urgency: ${hp.urgency}, Summary: ${hp.issue_summary?.substring(0, 200)}`);
    }
  }

  parts.push('');
  parts.push(`## Required JSON Response`);
  parts.push(`{`);
  parts.push(`  "meaning": "What does this signal mean for the organization? (2-3 sentences)",`);
  parts.push(`  "root_cause": "What is the likely root cause? (2-3 sentences)",`);
  parts.push(`  "potential_impact": "What is the potential impact if not addressed? (2-3 sentences)",`);
  parts.push(`  "recommended_actions": ["action1", "action2", ...],`);
  parts.push(`  "confidence": 0.0-1.0,`);
  parts.push(`  "urgency_override": null | "immediate" | "high" | "medium" | "low",`);
  parts.push(`  "severity_override": null | "critical" | "high" | "medium" | "low"`);
  parts.push(`}`);

  return parts.join('\n');
}

/** Map severity and escalation level to urgency classification. */
function mapUrgency(severity: string, escalationLevel: number): Urgency {
  if (severity === 'critical' || escalationLevel >= 2) return 'immediate';
  if (severity === 'high' || escalationLevel >= 1) return 'high';
  if (severity === 'medium') return 'medium';
  return 'low';
}

/** Build a rule-based summary when AI is unavailable. */
function buildSummary(signalType: string, payload: Record<string, unknown>, domain: string): string {
  const title = payload.title || payload.finding_title || payload.committee_name || payload.owner || '';
  const summaries: Record<string, string> = {
    failed_control: `Control "${title}" has failed testing and requires remediation.`,
    repeated_control_failure: `Control "${title}" has failed ${payload.failure_count || 'multiple'} times in ${payload.window || '90d'}.`,
    incident_over_sla: `Incident "${title}" has exceeded SLA (${payload.hours_elapsed || '?'}h elapsed, severity: ${payload.severity || '?'}).`,
    incident_no_root_cause: `Resolved incident "${title}" lacks root cause analysis documentation.`,
    overdue_policy_review: `Policy "${title}" is ${payload.days_overdue || '?'} days past its review date.`,
    expired_exception: `Exception "${title}" (risk: ${payload.risk_level || '?'}) has expired and requires review.`,
    repeated_audit_finding: `Audit finding "${title}" has recurred ${payload.recurrence_count || '?'} times.`,
    stale_evidence: `Evidence "${title}" has expired and may affect linked controls.`,
    missed_quorum: `Committee "${title}" has missed quorum ${payload.missed_count || '?'} times in ${payload.window || '180d'}.`,
    delayed_decision: `Decision "${title}" is ${payload.days_overdue || '?'} days overdue for implementation.`,
    owner_overload: `User "${title}" has ${payload.open_count || '?'} open governance actions (threshold: ${payload.threshold || 15}).`,
  };
  return summaries[signalType] || `${domain} issue detected: ${signalType} for ${title || 'any entity'}.`;
}

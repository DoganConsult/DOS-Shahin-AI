import { safeQuery, tenantSchema } from '../../ports/database.port';
import type { GenericRow } from '../../ports/platform.port';

export interface AgentPerformanceMetric {
  metric_id: string;
  agent_id: string;
  metric_type: string;
  metric_value: number;
  measurement_period_start: string;
  measurement_period_end: string;
  trend?: string;
}

export interface AgentBiasDetection {
  detection_id: string;
  agent_id: string;
  protected_attribute: string;
  bias_metric: string;
  metric_value: number;
  threshold_exceeded: boolean;
  violation_severity: 'low' | 'medium' | 'high' | 'critical';
  remediation_status: 'open' | 'in_progress' | 'resolved' | 'false_positive' | 'accepted_risk';
}

export interface AgentTrustScore {
  trust_score_id: string;
  agent_id: string;
  accuracy_score: number;
  fairness_score: number;
  explainability_score: number;
  human_override_rate: number;
  error_recovery_score: number;
  composite_trust_score: number;
  trust_level: 'untrusted' | 'low' | 'moderate' | 'high' | 'very_high';
}

/**
 * Record performance metric for an agent
 */
export async function recordAgentPerformanceMetric(
  tenantId: string,
  agentId: string,
  metric: {
    metric_type: string;
    metric_value: number;
    measurement_period_start: string;
    measurement_period_end: string;
    context?: Record<string, unknown>;
    baseline_value?: number;
  }
): Promise<AgentPerformanceMetric> {
  const schema = tenantSchema(tenantId);

  // Calculate deviation and trend
  let deviation: number | null = null;
  let trend: 'improving' | 'stable' | 'degrading' | 'volatile' | null = null;
  if (metric.baseline_value !== undefined) {
    deviation = metric.metric_value - metric.baseline_value;
    const percentChange = Math.abs(deviation / metric.baseline_value);
    if (percentChange < 0.05) trend = 'stable';
    else if (deviation > 0 && metric.metric_type.includes('accuracy')) trend = 'improving';
    else if (deviation < 0 && metric.metric_type.includes('accuracy')) trend = 'degrading';
    else if (percentChange > 0.2) trend = 'volatile';
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".ai_agent_performance_metrics 
     (agent_id, metric_type, metric_value, measurement_period_start, measurement_period_end,
      context, baseline_value, deviation_from_baseline, trend)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING *`,
    [
      agentId,
      metric.metric_type,
      metric.metric_value,
      metric.measurement_period_start,
      metric.measurement_period_end,
      JSON.stringify(metric.context || {}),
      metric.baseline_value || null,
      deviation,
      trend
    ]
  );

  return result.rows[0];
}

/**
 * Get agent performance metrics
 */
export async function getAgentPerformanceMetrics(
  tenantId: string,
  agentId: string,
  metricType?: string,
  startDate?: string,
  endDate?: string
): Promise<AgentPerformanceMetric[]> {
  const schema = tenantSchema(tenantId);
  let query = `SELECT * FROM "${schema}".ai_agent_performance_metrics WHERE agent_id = $1`;
  const params: unknown[] = [agentId];
  let idx = 2;

  if (metricType) {
    query += ` AND metric_type = $${idx++}`;
    params.push(metricType);
  }
  if (startDate) {
    query += ` AND measurement_period_start >= $${idx++}`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND measurement_period_end <= $${idx++}`;
    params.push(endDate);
  }

  query += ` ORDER BY recorded_at DESC`;

  const result = await safeQuery(query, params);
  return result.rows;
}

/** Shadow mode metrics for AI cockpit (Feature 11) */
export interface ShadowModeMetrics {
  agentId: string;
  accuracy: number;
  falsePositiveRate: number;
  falseNegativeRate: number;
  totalResolved: number;
  periodStart: string;
  periodEnd: string;
  recordedAt: string;
}

/**
 * Get shadow mode validation metrics for an agent (proposal vs human decision accuracy).
 */
export async function getShadowModeMetrics(
  tenantId: string,
  agentId?: string,
  startDate?: string,
  endDate?: string
): Promise<ShadowModeMetrics[]> {
  const schema = tenantSchema(tenantId);
  let query = `SELECT agent_id, metric_value AS accuracy,
       (context->>'falsePositiveRate')::numeric AS false_positive_rate,
       (context->>'falseNegativeRate')::numeric AS false_negative_rate,
       (context->>'totalResolved')::int AS total_resolved,
       measurement_period_start AS period_start, measurement_period_end AS period_end,
       recorded_at
     FROM "${schema}".ai_agent_performance_metrics
     WHERE metric_type = 'accuracy' AND context->>'source' = 'shadow'`;
  const params: unknown[] = [];
  let idx = 1;
  if (agentId) {
    query += ` AND agent_id = $${idx++}`;
    params.push(agentId);
  }
  if (startDate) {
    query += ` AND measurement_period_start >= $${idx++}`;
    params.push(startDate);
  }
  if (endDate) {
    query += ` AND measurement_period_end <= $${idx++}`;
    params.push(endDate);
  }
  query += ` ORDER BY recorded_at DESC LIMIT 90`;

  const result = await safeQuery(query, params);
  return result.rows.map((r: GenericRow) => ({
    agentId: r.agent_id,
    accuracy: Number(r.accuracy),
    falsePositiveRate: Number(r.false_positive_rate) || 0,
    falseNegativeRate: Number(r.false_negative_rate) || 0,
    totalResolved: Number(r.total_resolved) || 0,
    periodStart: r.period_start,
    periodEnd: r.period_end,
    recordedAt: r.recorded_at,
  }));
}

/**
 * Detect bias in agent outputs
 */
export async function detectAgentBias(
  tenantId: string,
  agentId: string,
  detection: {
    protected_attribute: string;
    attribute_value?: string;
    bias_metric: string;
    metric_value: number;
    threshold: number;
    sample_size?: number;
    comparison_group?: string;
  }
): Promise<AgentBiasDetection> {
  const schema = tenantSchema(tenantId);

  const thresholdExceeded = Math.abs(detection.metric_value - 0.5) > detection.threshold; // Assuming 0.5 is fair
  let violationSeverity: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (thresholdExceeded) {
    const deviation = Math.abs(detection.metric_value - 0.5);
    if (deviation > 0.3) violationSeverity = 'critical';
    else if (deviation > 0.2) violationSeverity = 'high';
    else if (deviation > 0.1) violationSeverity = 'medium';
    else violationSeverity = 'low';
  }

  const result = await safeQuery(
    `INSERT INTO "${schema}".ai_agent_bias_detection 
     (agent_id, protected_attribute, attribute_value, bias_metric, metric_value, threshold,
      threshold_exceeded, violation_severity, sample_size, comparison_group, remediation_status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'open')
     RETURNING *`,
    [
      agentId,
      detection.protected_attribute,
      detection.attribute_value || null,
      detection.bias_metric,
      detection.metric_value,
      detection.threshold,
      thresholdExceeded,
      violationSeverity,
      detection.sample_size || null,
      detection.comparison_group || null
    ]
  );

  return result.rows[0];
}

/**
 * Get bias detections
 */
export async function getAgentBiasDetections(
  tenantId: string,
  agentId?: string,
  remediationStatus?: string
): Promise<AgentBiasDetection[]> {
  const schema = tenantSchema(tenantId);
  let query = `SELECT * FROM "${schema}".ai_agent_bias_detection WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;

  if (agentId) {
    query += ` AND agent_id = $${idx++}`;
    params.push(agentId);
  }
  if (remediationStatus) {
    query += ` AND remediation_status = $${idx++}`;
    params.push(remediationStatus);
  }

  query += ` ORDER BY detected_at DESC`;

  const result = await safeQuery(query, params);
  return result.rows;
}

/**
 * Update bias remediation status
 */
export async function updateBiasRemediation(
  tenantId: string,
  detectionId: string,
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive' | 'accepted_risk',
  remediatedBy: string,
  remediationNotes?: string,
  remediationActions?: unknown[]
): Promise<boolean> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `UPDATE "${schema}".ai_agent_bias_detection 
     SET remediation_status = $1, remediated_by = $2, remediation_notes = $3,
         remediation_actions = $4, remediated_at = CASE WHEN $1 IN ('resolved', 'false_positive', 'accepted_risk') THEN NOW() ELSE NULL END,
         updated_at = NOW()
     WHERE detection_id = $5
     RETURNING detection_id`,
    [status, remediatedBy, remediationNotes || null, JSON.stringify(remediationActions || []), detectionId]
  );
  return result.rows.length > 0;
}

/**
 * Calculate and store agent trust score
 */
export async function calculateAgentTrustScore(
  tenantId: string,
  agentId: string,
  scores: {
    accuracy_score: number;
    fairness_score: number;
    explainability_score: number;
    human_override_rate: number;
    error_recovery_score: number;
  },
  context?: Record<string, unknown>
): Promise<AgentTrustScore> {
  const schema = tenantSchema(tenantId);

  // Composite trust score: weighted average
  const compositeTrust = (
    scores.accuracy_score * 0.3 +
    scores.fairness_score * 0.25 +
    scores.explainability_score * 0.2 +
    (1 - scores.human_override_rate) * 0.15 + // Lower override rate = higher trust
    scores.error_recovery_score * 0.1
  );

  // Determine trust level
  let trustLevel: 'untrusted' | 'low' | 'moderate' | 'high' | 'very_high';
  if (compositeTrust >= 0.9) trustLevel = 'very_high';
  else if (compositeTrust >= 0.75) trustLevel = 'high';
  else if (compositeTrust >= 0.6) trustLevel = 'moderate';
  else if (compositeTrust >= 0.4) trustLevel = 'low';
  else trustLevel = 'untrusted';

  const result = await safeQuery(
    `INSERT INTO "${schema}".ai_agent_trust_scores 
     (agent_id, accuracy_score, fairness_score, explainability_score, human_override_rate,
      error_recovery_score, composite_trust_score, trust_level, context, scored_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
     RETURNING *`,
    [
      agentId,
      scores.accuracy_score,
      scores.fairness_score,
      scores.explainability_score,
      scores.human_override_rate,
      scores.error_recovery_score,
      compositeTrust,
      trustLevel,
      JSON.stringify(context || {})
    ]
  );

  return result.rows[0];
}

/**
 * Get latest trust scores for agents
 */
export async function getAgentTrustScores(
  tenantId: string,
  agentId?: string
): Promise<AgentTrustScore[]> {
  const schema = tenantSchema(tenantId);
  let query = `SELECT DISTINCT ON (agent_id) * 
               FROM "${schema}".ai_agent_trust_scores 
               WHERE 1=1`;
  const params: unknown[] = [];
  let idx = 1;

  if (agentId) {
    query += ` AND agent_id = $${idx++}`;
    params.push(agentId);
  }

  query += ` ORDER BY agent_id, scored_at DESC`;

  const result = await safeQuery(query, params);
  return result.rows;
}

/**
 * Record human override
 */
export async function recordHumanOverride(
  tenantId: string,
  override: {
    agent_id: string;
    decision_id?: string;
    workflow_execution_id?: string;
    ai_decision: any;
    human_decision: any;
    override_reason: string;
    override_outcome: 'accepted' | 'rejected' | 'modified' | 'pending';
    overridden_by: string;
  }
): Promise<unknown> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".ai_human_overrides 
     (agent_id, decision_id, workflow_execution_id, ai_decision, human_decision,
      override_reason, override_outcome, overridden_by, overridden_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
     RETURNING *`,
    [
      override.agent_id,
      override.decision_id || null,
      override.workflow_execution_id || null,
      JSON.stringify(override.ai_decision),
      JSON.stringify(override.human_decision),
      override.override_reason,
      override.override_outcome,
      override.overridden_by
    ]
  );
  return result.rows[0];
}

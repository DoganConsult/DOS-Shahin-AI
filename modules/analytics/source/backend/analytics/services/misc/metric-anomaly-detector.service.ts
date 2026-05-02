import { logger } from '../../ports/logger.port';
/**
 * Metric Anomaly Detector Service
 * Priority 16: Anomaly Detection on GRC Metrics
 *
 * Computes rolling mean + standard deviation for key GRC metrics over 30 days.
 * When current value deviates >2σ, creates ai_observation with type='anomaly'.
 * Runs hourly as a lightweight job.
 */

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { computeKPIs } from '../analytics/analytics-kpi.service';
import { recordObservation, type ObservationInput } from '../../../ai/services/observability/ai-observation.service';

import { recordSignal } from '../../../ai/services/cockpit/ai-cockpit-signal.service';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
import { getProvisionedTenants } from '../../ports/platform.port';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MetricAnomaly {
  metricCode: string;
  metricName: string;
  currentValue: number;
  rollingMean: number;
  rollingStdDev: number;
  deviation: number; // in standard deviations
  severity: 'warning' | 'critical';
  observationId?: string;
}

export interface AnomalyDetectionResult {
  tenantId: string;
  anomaliesDetected: MetricAnomaly[];
  metricsChecked: number;
  errors: string[];
}

// ── Metric Definitions ──────────────────────────────────────────────────────

interface MetricDefinition {
  code: string;
  name: string;
  signalCode: string; // signal_code in cockpit_signal
  computeCurrent: (kpis: Awaited<ReturnType<typeof computeKPIs>>, tenantId: string) => Promise<number>;
  thresholdMultiplier: number; // default 2.0 for 2σ, can be adjusted per metric
  severityThreshold: number; // deviation > this triggers 'critical' instead of 'warning'
}

const METRIC_DEFINITIONS: MetricDefinition[] = [
  {
    code: 'compliance_score',
    name: 'Compliance Score',
    signalCode: 'metric.compliance_score',
    computeCurrent: async (kpis) => kpis.complianceScore,
    thresholdMultiplier: 2.0,
    severityThreshold: 3.0, // >3σ = critical
  },
  {
    code: 'risk_score',
    name: 'Risk Score',
    signalCode: 'metric.risk_score',
    computeCurrent: async (kpis) => kpis.riskScore,
    thresholdMultiplier: 2.0,
    severityThreshold: 3.0,
  },
  {
    code: 'evidence_coverage',
    name: 'Evidence Coverage',
    signalCode: 'metric.evidence_coverage',
    computeCurrent: async (kpis) => kpis.evidenceCoverage,
    thresholdMultiplier: 2.0,
    severityThreshold: 3.0,
  },
  {
    code: 'remediation_closure_rate',
    name: 'Remediation Closure Rate',
    signalCode: 'metric.remediation_closure_rate',
    computeCurrent: async (kpis) => kpis.remediationClosureRate,
    thresholdMultiplier: 2.0,
    severityThreshold: 3.0,
  },
  {
    code: 'vendor_health_score',
    name: 'Vendor Health Score',
    signalCode: 'metric.vendor_health_score',
    computeCurrent: async (kpis) => kpis.vendorHealthScore,
    thresholdMultiplier: 2.0,
    severityThreshold: 3.0,
  },
];

// ── Core Detection Logic ──────────────────────────────────────────────────────

/**
 * Compute rolling statistics (mean, std dev) for a metric over the last 30 days.
 */
async function computeRollingStatistics(
  tenantId: string,
  signalCode: string,
  days: number = 30
): Promise<{ mean: number; stdDev: number; sampleCount: number } | null> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT
         AVG(signal_value)::numeric AS mean,
         STDDEV_POP(signal_value)::numeric AS std_dev,
         COUNT(*)::int AS sample_count
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1
         AND signal_code = $2
         AND signal_value IS NOT NULL
         AND recorded_at >= NOW() - ($3 || ' days')::interval`,
      [tenantId, signalCode, days]
    );

    const row = getFirstRow(result)!;
    if (!row || row.sample_count < 3) {
      // Need at least 3 samples for meaningful statistics
      return null;
    }

    const mean = parseFloat(row.mean || '0');
    const stdDev = parseFloat(row.std_dev || '0');

    return {
      mean,
      stdDev: stdDev || 0, // If all values are the same, stdDev = 0
      sampleCount: parseInt(row.sample_count, 10),
    };
  } catch (err) {
    logger.warn(`[MetricAnomalyDetector] Failed to compute rolling stats for ${signalCode}:`, toErrorMessage(err));
    return null;
  }
}

/**
 * Get current value for a metric by computing KPIs or querying recent signal.
 */
async function getCurrentMetricValue(
  tenantId: string,
  metric: MetricDefinition
): Promise<number | null> {
  try {
    // Try to get from recent cockpit_signal first (if available)
    const schema = tenantSchema(tenantId);
    const signalResult = await safeQuery(
      `SELECT signal_value
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1 AND signal_code = $2
       ORDER BY recorded_at DESC LIMIT 1`,
      [tenantId, metric.signalCode]
    );

    if (signalResult.rows.length > 0 && getFirstRow(signalResult)?.signal_value != null) {
      return parseFloat(getFirstRow(signalResult)?.signal_value);
    }

    // Fallback: compute from KPIs
    const kpis = await computeKPIs(tenantId);
    const currentValue = await metric.computeCurrent(kpis, tenantId);

    // Store in cockpit_signal for future reference
    await recordSignal(tenantId, {
      signalCode: metric.signalCode,
      signalType: 'metric',
      signalValue: currentValue,
      severity: 'info',
      context: { source: 'metric-anomaly-detector', computedAt: new Date().toISOString() },
    });

    return currentValue;
  } catch (err) {
    logger.warn(`[MetricAnomalyDetector] Failed to get current value for ${metric.code}:`, toErrorMessage(err));
    return null;
  }
}

/**
 * Compute incident count for the last 24 hours.
 */
async function getIncidentCount24h(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(
      `SELECT COUNT(*)::int AS count
       FROM "${schema}".incidents
       WHERE created_at >= NOW() - INTERVAL '24 hours'`,
      []
    );
    return parseInt(getFirstRow(result)?.count || '0', 10);
  } catch {
    return 0;
  }
}

/**
 * Compute evidence rejection rate for the last 24 hours.
 */
async function getEvidenceRejectionRate24h(tenantId: string): Promise<number> {
  const schema = tenantSchema(tenantId);
  try {
    const [totalResult, rejectedResult] = await Promise.all([
      safeQuery(
        `SELECT COUNT(*)::int AS count
         FROM "${schema}".evidence_reviews
         WHERE reviewed_at >= NOW() - INTERVAL '24 hours'`,
        []
      ),
      safeQuery(
        `SELECT COUNT(*)::int AS count
         FROM "${schema}".evidence_reviews
         WHERE reviewed_at >= NOW() - INTERVAL '24 hours'
           AND outcome = 'rejected'`,
        []
      ),
    ]);

    const total = parseInt(getFirstRow(totalResult)?.count || '0', 10);
    const rejected = parseInt(getFirstRow(rejectedResult)?.count || '0', 10);

    if (total === 0) return 0;
    return (rejected / total) * 100; // percentage
  } catch {
    return 0;
  }
}

/**
 * Detect anomalies for a single metric.
 */
async function detectMetricAnomaly(
  tenantId: string,
  metric: MetricDefinition
): Promise<MetricAnomaly | null> {
  // Get current value
  const currentValue = await getCurrentMetricValue(tenantId, metric);
  if (currentValue === null) {
    return null;
  }

  // Compute rolling statistics
  const stats = await computeRollingStatistics(tenantId, metric.signalCode, 30);
  if (!stats || stats.stdDev === 0) {
    // Not enough history or no variance — skip
    return null;
  }

  // Calculate deviation in standard deviations
  const deviation = Math.abs(currentValue - stats.mean) / (stats.stdDev || 1);

  // Check if deviation exceeds threshold
  if (deviation < metric.thresholdMultiplier) {
    return null; // No anomaly
  }

  // Determine severity
  const severity = deviation >= metric.severityThreshold ? 'critical' : 'warning';

  return {
    metricCode: metric.code,
    metricName: metric.name,
    currentValue,
    rollingMean: stats.mean,
    rollingStdDev: stats.stdDev,
    deviation,
    severity,
  };
}

/**
 * Detect anomalies for additional metrics (incident count, evidence rejection rate).
 * These are computed differently (24h counts/rates) rather than from KPIs.
 */
async function detectAdditionalMetricAnomalies(tenantId: string): Promise<MetricAnomaly[]> {
  const anomalies: MetricAnomaly[] = [];
  const schema = tenantSchema(tenantId);

  // ── Incident Count Anomaly ────────────────────────────────────────────────
  try {
    const currentIncidents = await getIncidentCount24h(tenantId);
    const incidentStats = await safeQuery(
      `SELECT
         AVG(signal_value)::numeric AS mean,
         STDDEV_POP(signal_value)::numeric AS std_dev,
         COUNT(*)::int AS sample_count
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1
         AND signal_code = 'metric.incident_count_24h'
         AND signal_value IS NOT NULL
         AND recorded_at >= NOW() - INTERVAL '30 days'`,
      [tenantId]
    );

    const row = getFirstRow(incidentStats)!;
    if (row && parseInt(row.sample_count, 10) >= 3) {
      const mean = parseFloat(row.mean || '0');
      const stdDev = parseFloat(row.std_dev || '0') || 1;
      const deviation = Math.abs(currentIncidents - mean) / stdDev;

      if (deviation >= 2.0) {
        anomalies.push({
          metricCode: 'incident_count_24h',
          metricName: 'Incident Count (24h)',
          currentValue: currentIncidents,
          rollingMean: mean,
          rollingStdDev: stdDev,
          deviation,
          severity: deviation >= 3.0 ? 'critical' : 'warning',
        });
      }
    }

    // Store current value for future reference
    await recordSignal(tenantId, {
      signalCode: 'metric.incident_count_24h',
      signalType: 'metric',
      signalValue: currentIncidents,
      severity: 'info',
      context: { source: 'metric-anomaly-detector', computedAt: new Date().toISOString() },
    });
  } catch (err) {
    logger.warn(`[MetricAnomalyDetector] Failed to detect incident count anomaly:`, toErrorMessage(err));
  }

  // ── Evidence Rejection Rate Anomaly ───────────────────────────────────────
  try {
    const currentRejectionRate = await getEvidenceRejectionRate24h(tenantId);
    const rejectionStats = await safeQuery(
      `SELECT
         AVG(signal_value)::numeric AS mean,
         STDDEV_POP(signal_value)::numeric AS std_dev,
         COUNT(*)::int AS sample_count
       FROM "${schema}".cockpit_signal
       WHERE tenant_id = $1
         AND signal_code = 'metric.evidence_rejection_rate_24h'
         AND signal_value IS NOT NULL
         AND recorded_at >= NOW() - INTERVAL '30 days'`,
      [tenantId]
    );

    const row = getFirstRow(rejectionStats)!;
    if (row && parseInt(row.sample_count, 10) >= 3) {
      const mean = parseFloat(row.mean || '0');
      const stdDev = parseFloat(row.std_dev || '0') || 1;
      const deviation = Math.abs(currentRejectionRate - mean) / stdDev;

      if (deviation >= 2.0) {
        anomalies.push({
          metricCode: 'evidence_rejection_rate_24h',
          metricName: 'Evidence Rejection Rate (24h)',
          currentValue: currentRejectionRate,
          rollingMean: mean,
          rollingStdDev: stdDev,
          deviation,
          severity: deviation >= 3.0 ? 'critical' : 'warning',
        });
      }
    }

    // Store current value for future reference
    await recordSignal(tenantId, {
      signalCode: 'metric.evidence_rejection_rate_24h',
      signalType: 'metric',
      signalValue: currentRejectionRate,
      severity: 'info',
      context: { source: 'metric-anomaly-detector', computedAt: new Date().toISOString() },
    });
  } catch (err) {
    logger.warn(`[MetricAnomalyDetector] Failed to detect evidence rejection rate anomaly:`, toErrorMessage(err));
  }

  return anomalies;
}

/**
 * Main detection function: detects anomalies across all defined metrics.
 */
export async function detectMetricAnomalies(tenantId: string): Promise<AnomalyDetectionResult> {
  const anomalies: MetricAnomaly[] = [];
  const errors: string[] = [];

  // ── Detect anomalies for KPI-based metrics ────────────────────────────────
  for (const metric of METRIC_DEFINITIONS) {
    try {
      const anomaly = await detectMetricAnomaly(tenantId, metric);
      if (anomaly) {
        anomalies.push(anomaly);
      }
    } catch (err) {
      errors.push(`Failed to detect anomaly for ${metric.code}: ${toErrorMessage(err)}`);
    }
  }

  // ── Detect anomalies for additional metrics (incident count, rejection rate) ──
  try {
    const additionalAnomalies = await detectAdditionalMetricAnomalies(tenantId);
    anomalies.push(...additionalAnomalies);
  } catch (err) {
    errors.push(`Failed to detect additional metric anomalies: ${toErrorMessage(err)}`);
  }

  // ── Create ai_observations for each anomaly ────────────────────────────────
  for (const anomaly of anomalies) {
    try {
      const observationInput: ObservationInput = {
        tenantId,
        observationType: 'anomaly',
        title: `Anomaly detected: ${anomaly.metricName}`,
        description: `Current value (${anomaly.currentValue.toFixed(2)}) deviates ${anomaly.deviation.toFixed(2)}σ from 30-day mean (${anomaly.rollingMean.toFixed(2)} ± ${anomaly.rollingStdDev.toFixed(2)}).`,
        severity: anomaly.severity,
        confidence: Math.min(95, 50 + (anomaly.deviation * 10)), // Higher deviation = higher confidence
        evidenceJson: {
          metricCode: anomaly.metricCode,
          metricName: anomaly.metricName,
          currentValue: anomaly.currentValue,
          rollingMean: anomaly.rollingMean,
          rollingStdDev: anomaly.rollingStdDev,
          deviation: anomaly.deviation,
          thresholdMultiplier: 2.0,
          detectedAt: new Date().toISOString(),
        },
      };

      const observation = await recordObservation(observationInput);
      if (observation) {
        anomaly.observationId = observation.observation_id;
      }
    } catch (err) {
      errors.push(`Failed to create observation for ${anomaly.metricCode}: ${toErrorMessage(err)}`);
    }
  }

  return {
    tenantId,
    anomaliesDetected: anomalies,
    metricsChecked: METRIC_DEFINITIONS.length + 2, // +2 for incident count and rejection rate
    errors,
  };
}

/**
 * Batch detection across all provisioned tenants (for job execution).
 */
export async function detectMetricAnomaliesForAllTenants(): Promise<{
  totalTenants: number;
  totalAnomalies: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let totalAnomalies = 0;
  let tenants: Array<{ tenant_id: string; settings?: Record<string, unknown> }> = [];
  try {
    tenants = await getProvisionedTenants();
  } catch (err) {
    errors.push(`Failed to list provisioned tenants: ${toErrorMessage(err)}`);
    return { totalTenants: 0, totalAnomalies: 0, errors };
  }

  for (const t of tenants) {
    const tenantId = t.tenant_id;
    if (!tenantId) continue;
    try {
      const result = await detectMetricAnomalies(tenantId);
      totalAnomalies += result.anomaliesDetected.length;
      errors.push(...result.errors.map((e) => `[${tenantId}] ${e}`));
    } catch (err) {
      errors.push(`[${tenantId}] ${toErrorMessage(err)}`);
    }
  }

  return {
    totalTenants: tenants.length,
    totalAnomalies,
    errors,
  };
}

import { logger } from '../../ports/logger.port';
// ============================================
// Shahin — Analytics Health Service
// Composite tenant health score computation
// ============================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { eventBus } from '../../ports/events.port';
async function detectSoDConflicts(tenantId: string): Promise<Record<string, unknown>[]> { try { const { safeQuery, tenantSchema } = await import('../../../../config/database.js'); const schema = tenantSchema(tenantId); return (await safeQuery(`SELECT role_code_a, role_code_b, conflict_level FROM "${schema}".sod_rules WHERE is_active=TRUE AND conflict_level='block' LIMIT 50`)).rows; } catch { return []; } }
import { getAgentTrustScores } from "../../../ai/services/observability/ai-agent-performance.service";
import { generateAuditReadiness } from "../../../reporting/services/report/report-generator.service";

import { recordSignal, getSignalHistory } from "../../../ai/services/cockpit/ai-cockpit-signal.service";
import { getFirstRow } from '@dos/db';
import { computeKPIs } from './analytics-kpi.service';

/**
 * Compute Tenant Health Score (Composite Platform Metric)
 *
 * Aggregates platform-wide governance maturity into a single composite score (0-100).
 * Weights:
 * - Compliance posture: 25%
 * - Risk management maturity: 20%
 * - Evidence freshness: 15%
 * - Audit readiness: 15%
 * - Process task closure rate: 10%
 * - Agent effectiveness: 10%
 * - SoD compliance: 5%
 *
 * Stores the score as a cockpit signal and alerts if score drops >10 points in 7 days.
 *
 * @param tenantId - Tenant ID
 * @returns Composite health score (0-100) and component breakdown
 */
export async function computeTenantHealthScore(
  tenantId: string
): Promise<{
  healthScore: number;
  components: {
    compliancePosture: number;
    riskMaturity: number;
    evidenceFreshness: number;
    auditReadiness: number;
    taskClosureRate: number;
    agentEffectiveness: number;
    sodCompliance: number;
  };
  previousScore?: number;
  scoreChange?: number;
  alertTriggered?: boolean;
}> {
  const schema = tenantSchema(tenantId);

  try {
    // 1. Compliance Posture (25%)
    const kpis = await computeKPIs(tenantId);
    const compliancePosture = kpis.complianceScore || 0;

    // 2. Risk Management Maturity (20%)
    // Convert risk score (0-100, where 100 = highest risk) to maturity (0-100, where 100 = best maturity)
    // Lower risk score = higher maturity
    const riskScore = kpis.riskScore || 0;
    const riskMaturity = Math.max(0, 100 - riskScore);

    // 3. Evidence Freshness (15%)
    // Compute % of evidence that is not expired and within freshness window (e.g., <90 days old)
    const evidenceResult = await safeQuery(
      `SELECT
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE expiry_date IS NULL OR expiry_date > NOW())::int AS not_expired,
         COUNT(*) FILTER (
           WHERE expiry_date IS NULL OR expiry_date > NOW()
           AND collected_at > NOW() - INTERVAL '90 days'
         )::int AS fresh
       FROM "${schema}".evidence
       WHERE status != 'deleted'`
    );
    const totalEvidence = parseInt(getFirstRow(evidenceResult)?.total || '0', 10);
    const freshEvidence = parseInt(getFirstRow(evidenceResult)?.fresh || '0', 10);
    const evidenceFreshness = totalEvidence > 0 ? (freshEvidence / totalEvidence) * 100 : 0;

    // 4. Audit Readiness (15%)
    const auditReadinessReport = await generateAuditReadiness(tenantId, {});

    const auditReadiness = auditReadinessReport.readinessScore || 0;

    // 5. Process Task Closure Rate (10%)
    const taskClosureRate = (kpis.remediationClosureRate || 0) * 100; // Already 0-1, convert to 0-100

    // 6. Agent Effectiveness (10%)
    // Get average composite trust score across all agents
    const agentTrustScores = await getAgentTrustScores(tenantId);
    let agentEffectiveness = 0;
    if (agentTrustScores.length > 0) {
      const avgTrustScore = agentTrustScores.reduce((sum: number, score: any) => {
        return sum + (parseFloat(score.composite_trust_score?.toString() || '0') || 0);
      }, 0) / agentTrustScores.length;
      agentEffectiveness = Math.max(0, Math.min(100, avgTrustScore * 100)); // Convert 0-1 to 0-100
    } else {
      // No agents yet - default to neutral (50)
      agentEffectiveness = 50;
    }

    // 7. SoD Compliance (5%)
    // Compute as: 100 - (conflicts / total users) * 100
    // If no conflicts, score is 100. If many conflicts relative to users, score decreases.
    let sodCompliance = 100; // Default to perfect if no users/conflicts
    try {
      const sodResult = await detectSoDConflicts(tenantId);
      const conflictCount = (sodResult as any).conflicts?.length ?? sodResult.length ?? 0;

      // Get total active users in tenant
      const userCountResult = await safeQuery(
        `SELECT COUNT(DISTINCT user_id)::int AS total_users
         FROM "${schema}".enterprise_user_role_assignments
         WHERE is_active = TRUE
           AND (valid_to IS NULL OR valid_to > NOW())`
      );
      const totalUsers = parseInt(getFirstRow(userCountResult)?.total_users || '0', 10);

      if (totalUsers > 0) {
        // Compute compliance: 100 - (conflicts / users) * 100, but cap at 0
        const conflictRate = (conflictCount / totalUsers) * 100;
        sodCompliance = Math.max(0, 100 - conflictRate);
      }
    } catch (err: unknown) {
      // SoD detection failed - default to neutral (50) to not penalize health score
      logger.warn(`[Analytics] SoD compliance calculation failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
      sodCompliance = 50;
    }

    // Combine with weights
    const healthScore = Math.round(
      (compliancePosture * 0.25) +
      (riskMaturity * 0.20) +
      (evidenceFreshness * 0.15) +
      (auditReadiness * 0.15) +
      (taskClosureRate * 0.10) +
      (agentEffectiveness * 0.10) +
      (sodCompliance * 0.05)
    );

    // Store as cockpit signal
    await recordSignal(tenantId, {
      signalCode: 'tenant_health_score',
      signalType: 'health',
      signalValue: healthScore,
      severity: healthScore >= 80 ? 'info' : healthScore >= 60 ? 'warning' : 'critical',
      context: {
        components: {
          compliancePosture,
          riskMaturity,
          evidenceFreshness,
          auditReadiness,
          taskClosureRate,
          agentEffectiveness,
          sodCompliance,
        },
        computedAt: new Date().toISOString(),
      },
    });

    // Check for score drop >10 points in 7 days
    const signalHistory = await getSignalHistory(tenantId, 'tenant_health_score', 100);

    let previousScore: number | undefined;
    let scoreChange: number | undefined;
    let alertTriggered = false;

    if (signalHistory.length > 1) {
      // Sort by timestamp descending (most recent first)
      const sortedHistory = [...signalHistory].sort((a, b) => {
        const timeA = new Date(a.recorded_at || 0).getTime();
        const timeB = new Date(b.recorded_at || 0).getTime();
        return timeB - timeA;
      });

      // Get the second most recent (previous score)
      if (sortedHistory.length >= 2) {
        previousScore = parseFloat(sortedHistory[1].signal_value?.toString() || '0') || 0;
        scoreChange = healthScore - previousScore;

        if (scoreChange < -10) {
          alertTriggered = true;

          // Create alert observation
          try {
            const { recordObservation } = await import('../../../ai/services/observability/ai-observation.service.js');
            await recordObservation({
              tenantId,
              observationType: 'anomaly',
              entityType: 'tenant',
              entityId: tenantId,
              title: 'Tenant Health Score Drop Detected',
              description: `Tenant health score dropped by ${Math.abs(scoreChange)} points (from ${previousScore} to ${healthScore}) in the past 7 days. This indicates a significant decline in governance maturity.`,
              severity: 'high',
              metadata: {
                previousScore,
                currentScore: healthScore,
                scoreChange,
                components: {
                  compliancePosture,
                  riskMaturity,
                  evidenceFreshness,
                  auditReadiness,
                  taskClosureRate,
                  agentEffectiveness,
                  sodCompliance,
                },
              },
            });
          } catch (err: unknown) {
            logger.warn(`[Analytics] Failed to create health score drop observation: ${err instanceof Error ? err.message : String(err)}`);
          }

          // Publish event
          eventBus.publish(({
                      eventType: 'tenant.health_score_dropped',
                      tenantId,
                      sourceService: 'analytics',
                      severity: 'warning',
                      payload: {
                        previousScore,
                        currentScore: healthScore,
                        scoreChange,
                        threshold: -10,
                      },
                    } as any));
        }
      }
    }

    // Publish health score computed event
    eventBus.publish(({
          eventType: 'tenant.health_score_computed',
          tenantId,
          sourceService: 'analytics',
          severity: 'info',
          payload: {
            healthScore,
            components: {
              compliancePosture,
              riskMaturity,
              evidenceFreshness,
              auditReadiness,
              taskClosureRate,
              agentEffectiveness,
              sodCompliance,
            },
            previousScore,
            scoreChange,
            alertTriggered,
          },
        } as any));

    return {
      healthScore,
      components: {
        compliancePosture,
        riskMaturity,
        evidenceFreshness,
        auditReadiness,
        taskClosureRate,
        agentEffectiveness,
        sodCompliance,
      },
      previousScore,
      scoreChange,
      alertTriggered,
    };
  } catch (err: unknown) {
    logger.error(`[Analytics] Tenant health score computation failed for tenant ${tenantId}: ${err instanceof Error ? err.message : String(err)}`);
    // Return default score on error to prevent breaking downstream consumers
    return {
      healthScore: 0,
      components: {
        compliancePosture: 0,
        riskMaturity: 0,
        evidenceFreshness: 0,
        auditReadiness: 0,
        taskClosureRate: 0,
        agentEffectiveness: 0,
        sodCompliance: 0,
      },
    };
  }
}

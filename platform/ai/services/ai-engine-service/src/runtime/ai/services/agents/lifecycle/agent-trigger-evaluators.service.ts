// @ts-nocheck
import { logger } from '../../../ports/logger.port';
// ============================================
// Agent-Specific Trigger Evaluators
// Per-agent functions that evaluate tenant data
// and return ProactiveTrigger arrays for each
// agent domain (A01-A12).
// ============================================

import { safeQuery, tenantSchema } from '../../../ports/database.port';
import { toErrorMessage } from '@dos/module-sdk';
import {
  type ProactiveTrigger,
  evaluateEvidenceExpiry,
  evaluateRiskEscalation,
  evaluateComplianceTrend,
} from '../../../../governance-os/services/misc/proactive-signal-evaluators.service';
import { estimateRemediationTime } from '../../analytics/services/misc/predictive-analytics.service';

// ── Agent-Specific Trigger Evaluators ────────────────────────────────────────

/**
 * A01 (Onboarding): New tenant created, incomplete onboarding detected
 */
async function evaluateA01Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    // Check for incomplete onboarding
    const incomplete = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM tenants
       WHERE tenant_id = $1
         AND (org_type IS NULL OR primary_sector_id IS NULL OR grc_maturity_level IS NULL)`,
      [tenantId]
    );

    if (Number(incomplete.rows[0]?.n ?? 0) > 0) {
      triggers.push({
        agentId: 'A01',
        tenantId,
        triggerType: 'threshold',
        signalType: 'onboarding_incomplete',
        urgency: 'high',
        reason: 'Onboarding profile incomplete - missing critical fields',
        triggeredAt: new Date().toISOString(),
      });
    }

    // Check for missing frameworks
    const missingFrameworks = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".frameworks WHERE deleted_at IS NULL`
    );

    if (Number(missingFrameworks.rows[0]?.n ?? 0) === 0) {
      triggers.push({
        agentId: 'A01',
        tenantId,
        triggerType: 'threshold',
        signalType: 'missing_frameworks',
        urgency: 'critical',
        reason: 'No frameworks configured - workspace not provisioned',
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A01 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A02 (Identity): MFA not enforced, stale access reviews, role drift
 */
async function evaluateA02Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    // Check MFA enforcement
    const mfaNotEnforced = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM users
       WHERE tenant_id = $1
         AND (mfa_enabled = FALSE OR mfa_enabled IS NULL)
         AND role != 'viewer'`,
      [tenantId]
    );

    if (Number(mfaNotEnforced.rows[0]?.n ?? 0) > 0) {
      triggers.push({
        agentId: 'A02',
        tenantId,
        triggerType: 'threshold',
        signalType: 'mfa_not_enforced',
        urgency: 'high',
        reason: `${mfaNotEnforced.rows[0]?.n} users without MFA enabled`,
        threshold: 0,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Check stale access reviews (if access_reviews table exists)
    try {
      const staleReviews = await safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".access_reviews
         WHERE last_reviewed_at < NOW() - INTERVAL '90 days'
           OR last_reviewed_at IS NULL`
      );

      if (Number(staleReviews.rows[0]?.n ?? 0) > 0) {
        triggers.push({
          agentId: 'A02',
          tenantId,
          triggerType: 'threshold',
          signalType: 'stale_access_reviews',
          urgency: 'medium',
          reason: `${staleReviews.rows[0]?.n} access reviews overdue`,
          threshold: 30,
          triggeredAt: new Date().toISOString(),
        });
      }
    } catch {
      // Table may not exist, skip
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A02 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A03 (Framework): Unmapped controls, framework updates available
 */
async function evaluateA03Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    const unmapped = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".ucf_controls
       WHERE mapped_frameworks IS NULL OR mapped_frameworks = '[]'::jsonb`
    );

    const unmappedCount = Number(unmapped.rows[0]?.n ?? 0);
    if (unmappedCount >= 10) {
      triggers.push({
        agentId: 'A03',
        tenantId,
        triggerType: 'threshold',
        signalType: 'unmapped_controls',
        urgency: unmappedCount > 50 ? 'high' : 'medium',
        reason: `${unmappedCount} controls unmapped to frameworks`,
        threshold: 10,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A03 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A04 (Control): Controls missing evidence, maturity gaps detected
 */
async function evaluateA04Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    const missingEvidence = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".ucf_controls c
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".evidence e
         WHERE e.linked_entity_id = c.id
       )`
    );

    const missingCount = Number(missingEvidence.rows[0]?.n ?? 0);
    if (missingCount >= 5) {
      triggers.push({
        agentId: 'A04',
        tenantId,
        triggerType: 'threshold',
        signalType: 'controls_missing_evidence',
        urgency: missingCount > 20 ? 'high' : 'medium',
        reason: `${missingCount} controls missing evidence`,
        threshold: 5,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A04 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A05 (Evidence): Evidence expiring, freshness violations, coverage gaps
 */
async function evaluateA05Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    // Predictive: evidence expiry
    const expiryEval = await evaluateEvidenceExpiry(tenantId, 7);
    if (expiryEval.shouldTrigger) {
      triggers.push({
        agentId: 'A05',
        tenantId,
        triggerType: 'predictive',
        signalType: 'evidence_expiry',
        urgency: expiryEval.expiredCount > 0 ? 'critical' : 'high',
        reason: `${expiryEval.expiringCount} expiring, ${expiryEval.expiredCount} expired`,
        predictedValue: expiryEval.expiringCount + expiryEval.expiredCount,
        threshold: 7,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Coverage gaps
    const coverageGaps = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".ucf_controls c
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".evidence e
         WHERE e.linked_entity_id = c.id AND e.status != 'archived'
       )`
    );

    const gapCount = Number(coverageGaps.rows[0]?.n ?? 0);
    if (gapCount >= 5) {
      triggers.push({
        agentId: 'A05',
        tenantId,
        triggerType: 'threshold',
        signalType: 'evidence_coverage_gaps',
        urgency: gapCount > 20 ? 'high' : 'medium',
        reason: `${gapCount} controls without evidence coverage`,
        threshold: 5,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A05 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A06 (Remediation): Gaps overdue, remediation velocity declining
 */
async function evaluateA06Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    // Overdue gaps
    const overdue = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".compliance_gaps
       WHERE status = 'open' AND due_date < NOW()`
    );

    const overdueCount = Number(overdue.rows[0]?.n ?? 0);
    if (overdueCount > 0) {
      triggers.push({
        agentId: 'A06',
        tenantId,
        triggerType: 'threshold',
        signalType: 'gaps_overdue',
        urgency: overdueCount > 10 ? 'critical' : 'high',
        reason: `${overdueCount} compliance gaps overdue`,
        threshold: 0,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Predictive: remediation velocity
    const velocity = await estimateRemediationTime(tenantId, 'high');
    if (velocity.estimatedDays > 30 && velocity.sampleSize > 5) {
      triggers.push({
        agentId: 'A06',
        tenantId,
        triggerType: 'predictive',
        signalType: 'remediation_velocity_low',
        urgency: 'medium',
        reason: `High-severity remediation taking ${velocity.estimatedDays} days on average`,
        predictedValue: velocity.estimatedDays,
        confidence: velocity.sampleSize > 10 ? 0.8 : 0.5,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A06 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A07 (Risk): Risk scores escalating, KRI thresholds breached
 */
async function evaluateA07Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    // Predictive: risk escalation
    const escalationEval = await evaluateRiskEscalation(tenantId, 0.5);
    if (escalationEval.shouldTrigger) {
      triggers.push({
        agentId: 'A07',
        tenantId,
        triggerType: 'predictive',
        signalType: 'risk_escalation',
        urgency: escalationEval.escalations.length > 5 ? 'critical' : 'high',
        reason: `${escalationEval.escalations.length} risks with high escalation probability`,
        predictedValue: escalationEval.escalations.length,
        confidence: escalationEval.escalations[0]?.probability ?? 0.5,
        threshold: 0.5,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Unscored risks
    const unscored = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".risks
       WHERE risk_score IS NULL AND status != 'closed'`
    );

    const unscoredCount = Number(unscored.rows[0]?.n ?? 0);
    if (unscoredCount > 0) {
      triggers.push({
        agentId: 'A07',
        tenantId,
        triggerType: 'threshold',
        signalType: 'unscored_risks',
        urgency: unscoredCount > 10 ? 'high' : 'medium',
        reason: `${unscoredCount} risks without scores`,
        threshold: 0,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A07 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A08 (Policy): Policies expiring, approval delays, regulatory misalignment
 */
async function evaluateA08Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    // Policies expiring
    const expiring = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".policies
       WHERE review_date IS NOT NULL
         AND review_date <= NOW() + INTERVAL '30 days'
         AND status = 'approved'`
    );

    const expiringCount = Number(expiring.rows[0]?.n ?? 0);
    if (expiringCount > 0) {
      triggers.push({
        agentId: 'A08',
        tenantId,
        triggerType: 'predictive',
        signalType: 'policies_expiring',
        urgency: expiringCount > 10 ? 'high' : 'medium',
        reason: `${expiringCount} policies expiring within 30 days`,
        predictedValue: expiringCount,
        threshold: 30,
        triggeredAt: new Date().toISOString(),
      });
    }

    // Approval delays
    const delayed = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".policies
       WHERE status = 'pending_approval'
         AND created_at < NOW() - INTERVAL '7 days'`
    );

    const delayedCount = Number(delayed.rows[0]?.n ?? 0);
    if (delayedCount > 0) {
      triggers.push({
        agentId: 'A08',
        tenantId,
        triggerType: 'threshold',
        signalType: 'approval_delays',
        urgency: delayedCount > 5 ? 'high' : 'medium',
        reason: `${delayedCount} policies pending approval > 7 days`,
        threshold: 7,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A08 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A09 (Vendor): Vendor contracts expiring, SLA violations, risk score changes
 */
async function evaluateA09Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    // Contract expiry
    const expiring = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".vendors
       WHERE contract_end_date IS NOT NULL
         AND contract_end_date <= NOW() + INTERVAL '60 days'
         AND contract_end_date > NOW()
         AND status = 'active'`
    );

    const expiringCount = Number(expiring.rows[0]?.n ?? 0);
    if (expiringCount > 0) {
      triggers.push({
        agentId: 'A09',
        tenantId,
        triggerType: 'predictive',
        signalType: 'vendor_contract_expiry',
        urgency: expiringCount > 5 ? 'high' : 'medium',
        reason: `${expiringCount} vendor contracts expiring within 60 days`,
        predictedValue: expiringCount,
        threshold: 60,
        triggeredAt: new Date().toISOString(),
      });
    }

    // SLA violations
    try {
      const slaBreaches = await safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".vendor_sla_measurements
         WHERE is_breached = TRUE
           AND period_end > NOW() - INTERVAL '30 days'`
      );

      const breachCount = Number(slaBreaches.rows[0]?.n ?? 0);
      if (breachCount > 0) {
        triggers.push({
          agentId: 'A09',
          tenantId,
          triggerType: 'threshold',
          signalType: 'sla_violations',
          urgency: breachCount > 5 ? 'critical' : 'high',
          reason: `${breachCount} vendor SLA breaches in last 30 days`,
          threshold: 0,
          triggeredAt: new Date().toISOString(),
        });
      }
    } catch {
      // Table may not exist
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A09 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A10 (Audit): Audit cycles due, certification expiring, report generation needed
 */
async function evaluateA10Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    // Report schedules due
    const reportsDue = await safeQuery(
      `SELECT COUNT(*)::int AS n FROM "${schema}".report_schedules
       WHERE enabled = TRUE
         AND (last_run_at IS NULL OR last_run_at < NOW() - INTERVAL '7 days')`
    );

    const dueCount = Number(reportsDue.rows[0]?.n ?? 0);
    if (dueCount > 0) {
      triggers.push({
        agentId: 'A10',
        tenantId,
        triggerType: 'threshold',
        signalType: 'reports_due',
        urgency: dueCount > 5 ? 'high' : 'medium',
        reason: `${dueCount} report schedules overdue`,
        threshold: 7,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A10 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A11 (Reporting): Executive reports due, compliance posture changes
 */
async function evaluateA11Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];

  try {
    // Predictive: compliance posture changes
    const complianceEval = await evaluateComplianceTrend(tenantId);
    if (complianceEval.shouldTrigger && complianceEval.trend === 'declining') {
      triggers.push({
        agentId: 'A11',
        tenantId,
        triggerType: 'predictive',
        signalType: 'compliance_posture_declining',
        urgency: complianceEval.currentScore - complianceEval.predictedScore > 10 ? 'critical' : 'high',
        reason: `Compliance score declining: ${complianceEval.currentScore} → ${complianceEval.predictedScore} (${complianceEval.confidence} confidence)`,
        predictedValue: complianceEval.predictedScore,
        confidence: complianceEval.confidence,
        triggeredAt: new Date().toISOString(),
      });
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A11 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

/**
 * A12 (Integration): Integration failures, sync errors, connector health issues
 */
async function evaluateA12Triggers(tenantId: string): Promise<ProactiveTrigger[]> {
  const triggers: ProactiveTrigger[] = [];
  const schema = tenantSchema(tenantId);

  try {
    // Check for integration errors (if integration_logs table exists)
    try {
      const errors = await safeQuery(
        `SELECT COUNT(*)::int AS n FROM "${schema}".integration_logs
         WHERE status = 'error'
           AND created_at > NOW() - INTERVAL '24 hours'`
      );

      const errorCount = Number(errors.rows[0]?.n ?? 0);
      if (errorCount > 5) {
        triggers.push({
          agentId: 'A12',
          tenantId,
          triggerType: 'threshold',
          signalType: 'integration_failures',
          urgency: errorCount > 20 ? 'critical' : 'high',
          reason: `${errorCount} integration errors in last 24 hours`,
          threshold: 5,
          triggeredAt: new Date().toISOString(),
        });
      }
    } catch {
      // Table may not exist
    }
  } catch (err: unknown) {
    logger.warn(`[ProactiveMonitor] A12 evaluation failed: ${toErrorMessage(err)}`);
  }

  return triggers;
}

// ── Agent trigger evaluator map ──────────────────────────────────────────────

/**
 * Maps agent IDs to their trigger evaluator functions.
 * Used by monitorTenant() to iterate over all agents.
 */
export const AGENT_TRIGGER_EVALUATORS: Record<string, (tenantId: string) => Promise<ProactiveTrigger[]>> = {
  A01: evaluateA01Triggers,
  A02: evaluateA02Triggers,
  A03: evaluateA03Triggers,
  A04: evaluateA04Triggers,
  A05: evaluateA05Triggers,
  A06: evaluateA06Triggers,
  A07: evaluateA07Triggers,
  A08: evaluateA08Triggers,
  A09: evaluateA09Triggers,
  A10: evaluateA10Triggers,
  A11: evaluateA11Triggers,
  A12: evaluateA12Triggers,
};

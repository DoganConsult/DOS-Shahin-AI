// ============================================
// Shahin — Governance Maturity Auto-Assessment Service
// Feature 50: Auto-assess maturity dimensions from platform data
// Compares against Qiyas model to produce auto-generated maturity assessment
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { computeMaturityLevel as _computeMaturityLevel, recordMaturityAssessment, MaturityCriteria, MaturityLevel } from '../../../ports/platform.port';
import { toErrorMessage as _toErrorMessage } from "@dos/module-sdk";
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC } from '@dos/platform-core/resilience';

export interface AutoMaturityAssessmentResult {
  assessmentId?: string;
  level: MaturityLevel;
  aggregate: number;
  criteria: MaturityCriteria;
  dimensionScores: {
    policyMaturity: number;
    riskMaturity: number;
    controlMaturity: number;
    evidenceMaturity: number;
    auditMaturity: number;
  };
  dimensionDetails: {
    policy: {
      totalPolicies: number;
      approvedCount: number;
      approvalRate: number;
      reviewFreshness: number;
      score: number;
    };
    risk: {
      totalRisks: number;
      completeness: number;
      treatmentCoverage: number;
      kriTracking: number;
      score: number;
    };
    control: {
      totalControls: number;
      implementationRate: number;
      testingFrequency: number;
      effectivenessAverage: number;
      score: number;
    };
    evidence: {
      totalEvidence: number;
      automationRate: number;
      qualityAverage: number;
      freshness: number;
      score: number;
    };
    audit: {
      totalFindings: number;
      closureRate: number;
      capaEffectiveness: number;
      score: number;
    };
  };
  assessedAt: string;
  frameworkCode?: string;
}

/**
 * Auto-assess governance maturity from real platform data.
 * Scores maturity dimensions: Policy, Risk, Control, Evidence, Audit.
 * Maps to MaturityCriteria and computes overall maturity level.
 * 
 * @param tenantId - Tenant identifier
 * @param frameworkCode - Optional framework code for framework-specific assessment
 * @returns AutoMaturityAssessmentResult with dimension scores and overall maturity
 */
export async function autoAssessMaturity(
  tenantId: string,
  frameworkCode?: string
): Promise<AutoMaturityAssessmentResult> {
  const schema = tenantSchema(tenantId);

  // ============================================
  // 1. Policy Maturity = policy count × approval rate × review freshness
  // ============================================
  const policyResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, approved: 0, review_scheduled: 0, recently_reviewed: 0 }]), safeQuery(
    `SELECT 
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE approval_status = 'approved' OR status = 'approved' OR status = 'published')::int AS approved,
       COUNT(*) FILTER (WHERE next_review_date IS NOT NULL AND next_review_date >= NOW())::int AS review_scheduled,
       COUNT(*) FILTER (WHERE next_review_date IS NOT NULL AND next_review_date >= NOW() - INTERVAL '90 days')::int AS recently_reviewed
     FROM "${schema}".policies
     WHERE deleted_at IS NULL`
  ), { tenantId: tenantId, operation: 'query policies' });

  const policyRow = getFirstRow(policyResult) || {};

  const totalPolicies = Number(policyRow.total || 0);

  const approvedCount = Number(policyRow.approved || 0);
  const approvalRate = totalPolicies > 0 ? (approvedCount / totalPolicies) * 100 : 0;
  
  // Review freshness: % of policies with scheduled reviews or recently reviewed
  const reviewFreshness = totalPolicies > 0 

    ? ((Number(policyRow.review_scheduled || 0) + Number(policyRow.recently_reviewed || 0)) / totalPolicies) * 100
    : 0;

  // Policy maturity score: normalized to 0-100
  // Factor: policy count (min 5 for baseline), approval rate, review freshness
  const policyCountFactor = Math.min(100, (totalPolicies / 10) * 100); // 10+ policies = 100%
  const policyMaturity = (policyCountFactor * 0.3 + approvalRate * 0.4 + reviewFreshness * 0.3);

  // ============================================
  // 2. Risk Maturity = risk register completeness × treatment coverage × KRI tracking
  // ============================================
  const riskResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, complete: 0, treated: 0, has_kri: 0 }]), safeQuery(
    `SELECT 
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE owner IS NOT NULL AND owner != '' AND category IS NOT NULL AND treatment_plan IS NOT NULL)::int AS complete,
       COUNT(*) FILTER (WHERE treatment_status IS NOT NULL AND treatment_status != 'untreated')::int AS treated,
       COUNT(*) FILTER (WHERE kri_config IS NOT NULL AND kri_config != '{}'::jsonb)::int AS has_kri
     FROM "${schema}".risks
     WHERE status != 'closed'`
  ), { tenantId: tenantId, operation: 'query risks' });

  const riskRow = getFirstRow(riskResult) || {};

  const totalRisks = Number(riskRow.total || 0);

  const completeness = totalRisks > 0 ? (Number(riskRow.complete || 0) / totalRisks) * 100 : 0;

  const treatmentCoverage = totalRisks > 0 ? (Number(riskRow.treated || 0) / totalRisks) * 100 : 0;

  const kriTracking = totalRisks > 0 ? (Number(riskRow.has_kri || 0) / totalRisks) * 100 : 0;

  // Risk maturity score
  const riskMaturity = (completeness * 0.4 + treatmentCoverage * 0.4 + kriTracking * 0.2);

  // ============================================
  // 3. Control Maturity = implementation rate × testing frequency × effectiveness scores
  // ============================================
  // Note: effectiveness_score may not exist on controls table directly
  // We compute average from control_effectiveness_scores table if available, otherwise use effectiveness column or default to 0
  const controlResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, implemented: 0, automated_testing: 0, recently_tested: 0, avg_effectiveness: 0 }]), safeQuery(
    `SELECT 
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE status = 'implemented' OR status = 'active')::int AS implemented,
       COUNT(*) FILTER (WHERE test_frequency IS NOT NULL AND test_frequency != 'manual' AND test_frequency != '')::int AS automated_testing,
       COUNT(*) FILTER (WHERE last_tested_at IS NOT NULL AND last_tested_at >= NOW() - INTERVAL '90 days')::int AS recently_tested,
       COALESCE(
         (SELECT AVG(overall_score * 100.0)::numeric FROM "${schema}".control_effectiveness_scores WHERE deleted_at IS NULL AND overall_score IS NOT NULL),
         AVG(CASE WHEN effectiveness IS NOT NULL THEN effectiveness::numeric ELSE NULL END),
         0
       ) AS avg_effectiveness
     FROM "${schema}".controls
     WHERE deleted_at IS NULL`
  ), { tenantId: tenantId, operation: 'query control_effectiveness_scores' });

  const controlRow = getFirstRow(controlResult) || {};

  const totalControls = Number(controlRow.total || 0);

  const implementationRate = totalControls > 0 ? (Number(controlRow.implemented || 0) / totalControls) * 100 : 0;
  
  // Testing frequency: % with automated testing OR recently tested
  const testingFrequency = totalControls > 0

    ? ((Number(controlRow.automated_testing || 0) + Number(controlRow.recently_tested || 0)) / totalControls) * 100
    : 0;

  const effectivenessAverage = Number(controlRow.avg_effectiveness || 0);

  // Control maturity score
  const controlMaturity = (implementationRate * 0.4 + testingFrequency * 0.3 + effectivenessAverage * 0.3);

  // ============================================
  // 4. Evidence Maturity = collection automation rate × quality scores × freshness
  // ============================================
  const evidenceResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult([{ total: 0, automated: 0, tier_a: 0, tier_b: 0, tier_c: 0, fresh: 0, recently_collected: 0 }]), safeQuery(
    `SELECT 
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE source_type IN ('system-generated', 'connector', 'pipeline'))::int AS automated,
       COUNT(*) FILTER (WHERE quality_tier = 'A')::int AS tier_a,
       COUNT(*) FILTER (WHERE quality_tier = 'B')::int AS tier_b,
       COUNT(*) FILTER (WHERE quality_tier = 'C')::int AS tier_c,
       COUNT(*) FILTER (WHERE expiry_date IS NULL OR expiry_date >= NOW())::int AS fresh,
       COUNT(*) FILTER (WHERE collected_at >= NOW() - INTERVAL '90 days')::int AS recently_collected
     FROM "${schema}".evidence
     WHERE deleted_at IS NULL`
  ), { tenantId: tenantId, operation: 'query evidence' });

  const evidenceRow = getFirstRow(evidenceResult) || {};

  const totalEvidence = Number(evidenceRow.total || 0);

  const automationRate = totalEvidence > 0 ? (Number(evidenceRow.automated || 0) / totalEvidence) * 100 : 0;
  
  // Quality average: Tier A = 100, Tier B = 70, Tier C = 40, no tier = 0

  const tierA = Number(evidenceRow.tier_a || 0);

  const tierB = Number(evidenceRow.tier_b || 0);

  const tierC = Number(evidenceRow.tier_c || 0);
  const qualityAverage = totalEvidence > 0
    ? ((tierA * 100 + tierB * 70 + tierC * 40) / totalEvidence)
    : 0;
  
  // Freshness: % with valid expiry OR recently collected
  const freshness = totalEvidence > 0

    ? ((Number(evidenceRow.fresh || 0) + Number(evidenceRow.recently_collected || 0)) / totalEvidence) * 100
    : 0;

  // Evidence maturity score
  const evidenceMaturity = (automationRate * 0.3 + qualityAverage * 0.4 + freshness * 0.3);

  // ============================================
  // 5. Audit Maturity = finding closure rate × CAPA effectiveness
  // ============================================
  let auditMaturity = 0;
  let totalFindings = 0;
  let closureRate = 0;
  let capaEffectiveness = 0;

  try {
    // Finding closure rate (table is 'findings', not 'audit_findings')
    const findingsResult = await safeQuery(
      `SELECT 
         COUNT(*)::int AS total,
         COUNT(*) FILTER (WHERE status = 'closed' OR status = 'resolved')::int AS closed
       FROM "${schema}".findings
       WHERE deleted_at IS NULL`
    );
    const findingsRow = getFirstRow(findingsResult) || {};
    totalFindings = Number(findingsRow.total || 0);
    closureRate = totalFindings > 0 ? (Number(findingsRow.closed || 0) / totalFindings) * 100 : 0;

    // CAPA effectiveness: check if remediation_plans table exists (from audit module)
    // Fallback to remediation_tasks if remediation_plans doesn't exist
    try {
      const capaResult = await safeQuery(
        `SELECT 
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status IN ('completed', 'closed', 'resolved'))::int AS effective
         FROM "${schema}".remediation_plans
         WHERE deleted_at IS NULL`
      );
      const capaRow = getFirstRow(capaResult) || {};
      const totalCapa = Number(capaRow.total || 0);
      capaEffectiveness = totalCapa > 0 ? (Number(capaRow.effective || 0) / totalCapa) * 100 : 0;
    } catch {
      // CAPA table may not exist, use remediation_tasks as proxy
      const remediationResult = await safeQuery(
        `SELECT 
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status = 'completed')::int AS completed
         FROM "${schema}".remediation_tasks`
      );
      const remRow = getFirstRow(remediationResult) || {};
      const totalRem = Number(remRow.total || 0);
      capaEffectiveness = totalRem > 0 ? (Number(remRow.completed || 0) / totalRem) * 100 : 0;
    }

    // Audit maturity score
    auditMaturity = (closureRate * 0.6 + capaEffectiveness * 0.4);
  } catch {
    // Audit tables may not exist, default to 0
    auditMaturity = 0;
  }

  // ============================================
  // Map to MaturityCriteria interface
  // ============================================
  // Map the 5 dimensions to the 4 MaturityCriteria fields:
  // - complianceScore: Control maturity (primary compliance indicator)
  // - riskScore: Risk maturity (inverted: lower risk maturity = higher risk score)
  // - evidenceCoverage: Evidence maturity
  // - processMaturity: Average of Policy + Audit maturity (governance processes)

  const criteria: MaturityCriteria = {
    complianceScore: Math.round(controlMaturity * 100) / 100,
    riskScore: Math.round((100 - riskMaturity) * 100) / 100, // Invert: lower risk maturity = higher risk score
    evidenceCoverage: Math.round(evidenceMaturity * 100) / 100,
    processMaturity: Math.round(((policyMaturity + auditMaturity) / 2) * 100) / 100,
  };

  // Compute overall maturity level
  const { level, aggregate, assessmentId } = await recordMaturityAssessment(tenantId, criteria);

  return {
    assessmentId,
    level,
    aggregate,
    criteria,
    dimensionScores: {
      policyMaturity: Math.round(policyMaturity * 100) / 100,
      riskMaturity: Math.round(riskMaturity * 100) / 100,
      controlMaturity: Math.round(controlMaturity * 100) / 100,
      evidenceMaturity: Math.round(evidenceMaturity * 100) / 100,
      auditMaturity: Math.round(auditMaturity * 100) / 100,
    },
    dimensionDetails: {
      policy: {
        totalPolicies,
        approvedCount,
        approvalRate: Math.round(approvalRate * 100) / 100,
        reviewFreshness: Math.round(reviewFreshness * 100) / 100,
        score: Math.round(policyMaturity * 100) / 100,
      },
      risk: {
        totalRisks,
        completeness: Math.round(completeness * 100) / 100,
        treatmentCoverage: Math.round(treatmentCoverage * 100) / 100,
        kriTracking: Math.round(kriTracking * 100) / 100,
        score: Math.round(riskMaturity * 100) / 100,
      },
      control: {
        totalControls,
        implementationRate: Math.round(implementationRate * 100) / 100,
        testingFrequency: Math.round(testingFrequency * 100) / 100,
        effectivenessAverage: Math.round(effectivenessAverage * 100) / 100,
        score: Math.round(controlMaturity * 100) / 100,
      },
      evidence: {
        totalEvidence,
        automationRate: Math.round(automationRate * 100) / 100,
        qualityAverage: Math.round(qualityAverage * 100) / 100,
        freshness: Math.round(freshness * 100) / 100,
        score: Math.round(evidenceMaturity * 100) / 100,
      },
      audit: {
        totalFindings,
        closureRate: Math.round(closureRate * 100) / 100,
        capaEffectiveness: Math.round(capaEffectiveness * 100) / 100,
        score: Math.round(auditMaturity * 100) / 100,
      },
    },
    assessedAt: new Date().toISOString(),
    frameworkCode,
  };
}

/**
 * Get auto-assessment history for a tenant.
 */
export async function getAutoAssessmentHistory(
  tenantId: string,
  limit: number = 10
): Promise<Array<{ assessmentId: string; level: string; aggregate: number; assessedAt: string }>> {
  const schema = tenantSchema(tenantId);
  
  const result = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(
    `SELECT assessment_id, level, aggregate, assessed_at
     FROM "${schema}".maturity_assessments
     ORDER BY assessed_at DESC
     LIMIT $1`,
    [limit]
  ), { tenantId: tenantId, operation: 'query maturity_assessments' });

  return result.rows.map((row: GenericRow) => ({
    assessmentId: row.assessment_id,
    level: row.level,
    aggregate: Number(row.aggregate || 0),
    assessedAt: row.assessed_at instanceof Date ? row.assessed_at.toISOString() : String(row.assessed_at),
  }));
}

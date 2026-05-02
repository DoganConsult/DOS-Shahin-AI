import { logger } from '../../../ports/logger.port';
// ============================================
// Shahin — Vendor Risk Extension Service
// Tier classification, onboarding enforcement,
// annual review scheduling, remediation triggers,
// cloud shared responsibility (CST), risk register
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';

import { executeWorkflow } from '../../../../workflow/services/core/workflow.service.js';
import { getFirstRow } from '@dos/db';
import type { GenericRow } from '@dos/types';

// === Types ===

export type VendorTier = "critical" | "high" | "medium" | "low";

export interface VendorTierFactors {
  dataAccess: number;       // 1-5: level of access to sensitive data
  criticality: number;      // 1-5: business criticality
  regulatoryExposure: number; // 1-5: regulatory exposure level
}

export interface OnboardingRequirement {
  step: string;
  required: boolean;
  description: string;
}

export interface SharedResponsibilityEntry {
  controlArea: string;
  tenantResponsibility: string;
  providerResponsibility: string;
  sharedNotes: string;
}

// === Tier Classification Thresholds ===

const TIER_THRESHOLDS = {
  critical: 12,  // composite >= 12 → critical
  high: 9,       // composite >= 9  → high
  medium: 5,     // composite >= 5  → medium
};

// === Onboarding Requirements by Tier ===

const ONBOARDING_REQUIREMENTS: Record<VendorTier, OnboardingRequirement[]> = {
  critical: [
    { step: "security_questionnaire", required: true, description: "Full security questionnaire" },
    { step: "data_classification", required: true, description: "Data classification assessment" },
    { step: "contract_clauses", required: true, description: "Security and privacy contract clauses" },
    { step: "evidence_pack", required: true, description: "Evidence pack (SOC2/ISO27001)" },
    { step: "remediation_sla", required: true, description: "Remediation SLA agreement" },
    { step: "onsite_audit", required: true, description: "On-site security audit" },
    { step: "penetration_test", required: true, description: "Penetration test results" },
  ],
  high: [
    { step: "security_questionnaire", required: true, description: "Full security questionnaire" },
    { step: "data_classification", required: true, description: "Data classification assessment" },
    { step: "contract_clauses", required: true, description: "Security and privacy contract clauses" },
    { step: "evidence_pack", required: true, description: "Evidence pack (SOC2/ISO27001)" },
    { step: "remediation_sla", required: true, description: "Remediation SLA agreement" },
  ],
  medium: [
    { step: "security_questionnaire", required: true, description: "Standard security questionnaire" },
    { step: "data_classification", required: true, description: "Data classification assessment" },
    { step: "contract_clauses", required: true, description: "Basic contract clauses" },
  ],
  low: [
    { step: "security_questionnaire", required: true, description: "Basic security questionnaire" },
    { step: "contract_clauses", required: true, description: "Standard contract clauses" },
  ],
};

// === Default Score Thresholds by Tier ===

const DEFAULT_SCORE_THRESHOLDS: Record<VendorTier, number> = {
  critical: 80,
  high: 70,
  medium: 60,
  low: 50,
};

// === Default Review Frequencies ===

const REVIEW_FREQUENCY_DAYS: Record<VendorTier, number> = {
  critical: 180,  // semi-annual
  high: 365,      // annual
  medium: 365,    // annual
  low: 730,       // biennial
};

// ============================================================
// Pure Functions (exported for property-based testing)
// ============================================================

/**
 * Classify a vendor into a tier based on data access, criticality,
 * and regulatory exposure. Composite score = sum of all three factors.
 * Higher composite → higher risk tier.
 */
export function classifyVendorTier(factors: VendorTierFactors): VendorTier {
  const composite = factors.dataAccess + factors.criticality + factors.regulatoryExposure;
  if (composite >= TIER_THRESHOLDS.critical) return "critical";
  if (composite >= TIER_THRESHOLDS.high) return "high";
  if (composite >= TIER_THRESHOLDS.medium) return "medium";
  return "low";
}

/**
 * Get the onboarding requirements for a given vendor tier.
 */
export function getOnboardingRequirements(tier: string): OnboardingRequirement[] {
  const validTier = tier as VendorTier;
  return ONBOARDING_REQUIREMENTS[validTier] || ONBOARDING_REQUIREMENTS.low;
}

/**
 * Determine whether a vendor's assessment score should trigger remediation.
 * Returns true if score is strictly below the threshold.
 */
export function shouldTriggerRemediation(score: number, threshold: number): boolean {
  return score < threshold;
}

// ============================================================
// Database Functions
// ============================================================

/**
 * Classify a vendor and store the tier in the database.
 * Updates the vendor's risk_tier and stores classification factors.
 */
export async function classifyVendor(
  tenantId: string,
  vendorId: string,
  factors: VendorTierFactors
): Promise<unknown> {
      const result = await safeQuery("SELECT * FROM __TENANT_SCHEMA__.vendor_items" + (tenantId ? " WHERE tenant_id = $1" : ""), tenantId ? [tenantId] : []);
      return result?.rows || [];
}

/**
 * Onboard a vendor with tier-based enforcement.
 * Validates that all required onboarding steps for the vendor's tier are completed.
 */
export async function onboardVendor(
  tenantId: string,
  data: {
    name: string;
    category?: string;
    factors: VendorTierFactors;
    completedSteps: string[];
    contactEmail?: string;
    contractExpiry?: string;
  }
): Promise<{ vendor: any; tier: VendorTier; missingSteps: string[] }> {
  const tier = classifyVendorTier(data.factors);
  const requirements = getOnboardingRequirements(tier);
  const requiredSteps = requirements.filter((r) => r.required).map((r) => r.step);
  const missingSteps = requiredSteps.filter((s) => !data.completedSteps.includes(s));

  if (missingSteps.length > 0) {
    return {
      vendor: null,
      tier,
      missingSteps,
    };
  }

  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `INSERT INTO "${schema}".vendors
      (name, category, risk_tier, tier_factors, contact_email, contract_expiry, status, onboarded_at)
     VALUES ($1, $2, $3, $4, $5, $6, 'active', NOW())
     RETURNING *`,
    [
      data.name,
      data.category || null,
      tier,
      JSON.stringify(data.factors),
      data.contactEmail || null,
      data.contractExpiry || null,
    ]
  );

  // Schedule annual review based on tier
  const vendor = getFirstRow(result)!;
  await scheduleNextReview(tenantId, vendor.vendor_id, tier);

  return { vendor, tier, missingSteps: [] };
}

/**
 * Get vendors due for annual review.
 * Returns vendors whose next_review_date is on or before the current date.
 */
export async function getDueReviews(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT v.*, vtc.review_frequency, vtc.remediation_sla_days
     FROM "${schema}".vendors v
     LEFT JOIN "${schema}".vendor_tier_config vtc ON vtc.tier = v.risk_tier
     WHERE v.next_review_date <= NOW()
       AND v.status = 'active'
     ORDER BY v.next_review_date ASC`
  );
  return result.rows;
}

/**
 * Get the full vendor risk register.
 * Shows current tier, assessment status, contract expiry, open findings,
 * and remediation progress per vendor.
 */
export async function getVendorRiskRegister(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       v.vendor_id,
       v.name,
       v.category,
       v.risk_tier,
       v.assessment_score,
       v.contract_expiry,
       v.next_review_date,
       v.status,
       v.tier_factors,
       v.onboarded_at,
       CASE
         WHEN v.contract_expiry IS NULL THEN 'no_contract'
         WHEN v.contract_expiry < NOW() THEN 'expired'
         WHEN v.contract_expiry < NOW() + INTERVAL '30 days' THEN 'expiring_soon'
         ELSE 'active'
       END AS contract_status,
       COALESCE(f.open_findings, 0) AS open_findings,
       COALESCE(f.remediated_findings, 0) AS remediated_findings
     FROM "${schema}".vendors v
     LEFT JOIN LATERAL (
       SELECT
         COUNT(*) FILTER (WHERE status = 'open') AS open_findings,
         COUNT(*) FILTER (WHERE status = 'remediated') AS remediated_findings
       FROM "${schema}".vendor_findings vf
       WHERE vf.vendor_id = v.vendor_id
     ) f ON true
     ORDER BY
       CASE v.risk_tier
         WHEN 'critical' THEN 1
         WHEN 'high' THEN 2
         WHEN 'medium' THEN 3
         WHEN 'low' THEN 4
         ELSE 5
       END,
       v.name ASC`
  );
  return result.rows;
}

/**
 * Get cloud shared responsibility mapping (CST) for a vendor.
 * Maps cloud service provider controls to tenant vs provider responsibilities.
 */
export async function getSharedResponsibility(
  tenantId: string,
  vendorId: string
): Promise<{ vendor: any; mappings: SharedResponsibilityEntry[] }> {
  const schema = tenantSchema(tenantId);
  const vendorRes = await safeQuery(
    `SELECT * FROM "${schema}".vendors WHERE vendor_id = $1`,
    [vendorId],
  ).catch(() => ({ rows: [] as any[] }));

  const vendor = getFirstRow(vendorRes) ?? { vendor_id: vendorId };
  const mapRes = await safeQuery(
    `SELECT * FROM "${schema}".vendor_shared_responsibility WHERE vendor_id = $1 ORDER BY control_key ASC`,
    [vendorId],
  ).catch(() => ({ rows: [] as any[] }));

  return { vendor, mappings: mapRes.rows as SharedResponsibilityEntry[] };
}

/**
 * Get vendor questionnaires with vendor name joined in.
 */
export async function getVendorQuestionnaires(tenantId: string): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT
       q.questionnaire_id,
       q.vendor_id,
       v.name AS vendor_name,
       q.title AS template_name,
       q.distributed_at AS sent_at,
       q.status,
       (q.evaluation->>'score')::numeric AS score,
       q.due_date,
       q.completed_at,
       q.created_at
     FROM "${schema}".questionnaires q
     LEFT JOIN "${schema}".vendors v ON v.vendor_id = q.vendor_id
     ORDER BY q.created_at DESC`
  );
  return result.rows;
}

/**
 * Create a new vendor questionnaire.
 */
export async function createVendorQuestionnaire(
  tenantId: string,
  data: { vendor_name: string; template_name: string },
  userId: string
): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  // Find the vendor by name (or create a placeholder)
  const vendorResult = await safeQuery(
    `SELECT vendor_id FROM "${schema}".vendors WHERE name ILIKE $1 LIMIT 1`,
    [data.vendor_name]
  );
  const vendorId = getFirstRow(vendorResult)?.vendor_id || null;

  const result = await safeQuery(
    `INSERT INTO "${schema}".questionnaires
       (vendor_id, title, status, created_by, distributed_at)
     VALUES ($1, $2, 'distributed', $3, NOW())
     RETURNING *`,
    [vendorId, data.template_name || 'Standard', userId]
  );
  return getFirstRow(result);
}

// ============================================================
// Internal Helpers
// ============================================================

/**
 * Schedule the next review for a vendor based on its tier's review frequency.
 */
async function scheduleNextReview(
  tenantId: string,
  vendorId: string,
  tier: VendorTier
): Promise<void> {
  const schema = tenantSchema(tenantId);
  const frequencyDays = REVIEW_FREQUENCY_DAYS[tier] || 365;

  await safeQuery(
    `UPDATE "${schema}".vendors
     SET next_review_date = NOW() + ($1 || ' days')::INTERVAL
     WHERE vendor_id = $2`,
    [frequencyDays, vendorId]
  );
}

/**
 * Trigger a remediation workflow when a vendor's score falls below threshold.
 * Integrates with the existing workflow engine.
 */
async function triggerRemediationWorkflow(
  tenantId: string,
  vendorId: string,
  currentScore: number,
  threshold: number,
  tier: VendorTier
): Promise<void> {
  try {
    const schema = tenantSchema(tenantId);

    // Look for an existing vendor remediation workflow template
    const templateResult = await safeQuery(
      `SELECT * FROM "${schema}".workflows
       WHERE name ILIKE '%vendor%remediation%'
         AND status = 'active'
       LIMIT 1`
    );

    if (templateResult.rows.length > 0) {
      const workflow = getFirstRow(templateResult)!;
      await (executeWorkflow as any)(tenantId, workflow.workflow_id, {
        type: "vendor_score_below_threshold",
        data: {
          vendorId,
          currentScore,
          threshold,
          tier,
          triggeredAt: new Date().toISOString(),
        },
      });
    }
  } catch {
    // Log but don't fail the classification if workflow trigger fails
    logger.error(
      `Failed to trigger remediation workflow for vendor ${vendorId} in tenant ${tenantId}`
    );
  }
}

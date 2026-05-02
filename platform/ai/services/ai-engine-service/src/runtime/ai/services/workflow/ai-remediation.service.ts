// ============================================================================
// AGRC-OS -- AI Remediation Plan Generator
// Rule-based remediation plan generation from gap analysis results.
// Analyzes non-compliant controls and produces structured, prioritized
// remediation steps grouped by domain.
// ============================================================================

import { safeQuery, tenantSchema } from '../../ports/database.port';
import { getFirstRow } from '@dos/db';

// ── Types ──────────────────────────────────────────────────────────────────

export interface RemediationStep {
  controlId: string;
  controlCode: string;
  controlTitle: string;
  domain: string;
  domainCode: string;
  currentStatus: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  estimatedEffortDays: number;
  suggestedOwnerRole: string;
  steps: string[];
  evidenceRequired: string[];
}

export interface RemediationPlan {
  frameworkCode: string;
  tenantId: string;
  generatedAt: string;
  totalGaps: number;
  remediationSteps: RemediationStep[];
  estimatedTotalDays: number;
  priorityBreakdown: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  domainBreakdown: Array<{
    domain: string;
    domainCode: string;
    gapCount: number;
    estimatedDays: number;
  }>;
}

// ── Remediation Templates ──────────────────────────────────────────────────
// Rule-based templates keyed by control characteristics.

/** Map criticality level to remediation priority */
function mapCriticalityToPriority(
  criticality: string | null,
  hasEvidence: boolean,
): RemediationStep['priority'] {
  if (criticality === 'critical' || criticality === 'mandatory') return 'critical';
  if (criticality === 'high') return hasEvidence ? 'medium' : 'high';
  if (criticality === 'medium') return 'medium';
  return 'low';
}

/** Estimate effort in days based on control type and evidence gaps */
function estimateEffort(
  criticality: string | null,
  missingEvidenceCount: number,
  automationPossible: boolean,
): number {
  let baseDays = 3;

  if (criticality === 'critical' || criticality === 'mandatory') baseDays = 7;
  else if (criticality === 'high') baseDays = 5;
  else if (criticality === 'medium') baseDays = 3;
  else baseDays = 2;

  // Add days per missing evidence item
  baseDays += missingEvidenceCount * 1;

  // Automation reduces effort
  if (automationPossible) {
    baseDays = Math.max(1, Math.ceil(baseDays * 0.6));
  }

  return baseDays;
}

/** Determine the suggested owner role based on domain characteristics */
function suggestOwnerRole(domainCode: string, criticality: string | null): string {
  // Domain-based role mapping
  const domainRoleMap: Record<string, string> = {
    'GOV': 'compliance_officer',
    'GOVERNANCE': 'compliance_officer',
    'RM': 'risk_manager',
    'RISK': 'risk_manager',
    'AM': 'it_asset_manager',
    'ASSET': 'it_asset_manager',
    'HR': 'hr_manager',
    'IA': 'auditor',
    'AUDIT': 'auditor',
    'BC': 'bcp_coordinator',
    'BCP': 'bcp_coordinator',
    'DRP': 'bcp_coordinator',
    'IM': 'incident_manager',
    'INCIDENT': 'incident_manager',
    'PM': 'project_manager',
    'VM': 'vulnerability_manager',
    'VULN': 'vulnerability_manager',
    'AC': 'it_security_manager',
    'ACCESS': 'it_security_manager',
    'CS': 'it_security_manager',
    'CRYPTO': 'it_security_manager',
    'NS': 'network_security_manager',
    'NETWORK': 'network_security_manager',
    'TP': 'vendor_manager',
    'VENDOR': 'vendor_manager',
    'THIRD_PARTY': 'vendor_manager',
    'DM': 'data_privacy_officer',
    'DATA': 'data_privacy_officer',
    'PRIVACY': 'data_privacy_officer',
    'OT': 'ot_security_manager',
    'CLOUD': 'cloud_security_architect',
    'CM': 'change_manager',
    'CHANGE': 'change_manager',
  };

  // Try exact match first, then prefix match
  const upper = (domainCode || '').toUpperCase();
  if (domainRoleMap[upper]) return domainRoleMap[upper];

  for (const [key, role] of Object.entries(domainRoleMap)) {
    if (upper.startsWith(key) || upper.includes(key)) return role;
  }

  // Critical controls default to compliance officer
  if (criticality === 'critical' || criticality === 'mandatory') {
    return 'compliance_officer';
  }

  return 'control_owner';
}

/** Generate remediation steps based on control type and evidence gaps */
function generateSteps(
  controlTitle: string,
  currentStatus: string,
  missingEvidenceCount: number,
  automationPossible: boolean,
): string[] {
  const steps: string[] = [];

  // Step 1: Assessment
  if (currentStatus === 'not_assessed' || !currentStatus) {
    steps.push(`Perform initial assessment of control: ${controlTitle}`);
    steps.push('Document the current implementation state and any partial measures in place');
  } else if (currentStatus === 'non_compliant') {
    steps.push(`Review current non-compliant state of control: ${controlTitle}`);
    steps.push('Identify root causes for non-compliance and document gaps');
  } else if (currentStatus === 'partially_compliant') {
    steps.push(`Review partially compliant control: ${controlTitle}`);
    steps.push('Identify remaining gaps to achieve full compliance');
  }

  // Step 2: Implementation
  steps.push('Define implementation plan with clear milestones and responsible parties');
  steps.push('Implement required technical and/or procedural controls');

  // Step 3: Evidence
  if (missingEvidenceCount > 0) {
    steps.push(`Collect ${missingEvidenceCount} missing evidence item(s) to demonstrate compliance`);
    steps.push('Upload evidence artifacts and map them to control requirements');
  }

  // Step 4: Automation opportunity
  if (automationPossible) {
    steps.push('Evaluate automation options to reduce manual monitoring burden');
    steps.push('Configure automated evidence collection where applicable');
  }

  // Step 5: Validation
  steps.push('Conduct internal validation to confirm control effectiveness');
  steps.push('Schedule periodic review to maintain ongoing compliance');

  return steps;
}

// ── Main Generator ─────────────────────────────────────────────────────────

/**
 * Generate a structured remediation plan for a given framework.
 * Analyzes gap analysis results (non-compliant/not-assessed controls)
 * and produces prioritized, domain-grouped remediation steps.
 *
 * No LLM call needed -- uses rule-based templates based on control type
 * and evidence requirements.
 */
export async function generateRemediationPlan(
  tenantId: string,
  frameworkCode: string,
): Promise<RemediationPlan> {
      throw new Error("Not implemented: Stubbed during microservice extraction");
}

// ============================================
// Shahin — Governance Constitution Service
// AGRC-OS Layer 1: Risk appetite, authority
// matrix, and escalation threshold management.
// Machine-readable governance config per tenant.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../../ports/database.port';
import type {
  RiskAppetiteEntry,
  AuthorityMatrixRule,
  GovernanceConstitution,
} from '@dos/types';
import type { GenericRow } from '@dos/types';

// Tables are created by database.ts bootstrap + migration 125.
// No inline DDL needed.

// ── Risk Appetite CRUD ─────────────────────────────────────────────────────

export async function getRiskAppetite(tenantId: string): Promise<RiskAppetiteEntry[]> {
  const schema = tenantSchema(tenantId);
  const result = await safeQuery(
    `SELECT * FROM "${schema}".governance_risk_appetite ORDER BY category`
  );
  return result.rows.map(rowToAppetite);
}

export async function upsertRiskAppetite(
  tenantId: string,
  entries: RiskAppetiteEntry[]
): Promise<RiskAppetiteEntry[]> {
  const schema = tenantSchema(tenantId);

  for (const e of entries) {
    await safeQuery(
      `INSERT INTO "${schema}".governance_risk_appetite
         (category, max_residual_score, acceptance_requires_role, review_cadence_days, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (category) DO UPDATE SET
         max_residual_score = $2,
         acceptance_requires_role = $3,
         review_cadence_days = $4,
         updated_at = NOW()`,
      [e.category, e.maxResidualScore, e.acceptanceRequiresRole, e.reviewCadenceDays]
    );
  }
  return getRiskAppetite(tenantId);
}


// ── Authority Matrix CRUD ──────────────────────────────────────────────────

export async function getAuthorityMatrix(tenantId: string): Promise<AuthorityMatrixRule[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".authority_matrix ORDER BY decision_type, min_criticality`
  );
  return result.rows.map(rowToAuthority);
}

export async function upsertAuthorityMatrix(
  tenantId: string,
  rules: AuthorityMatrixRule[]
): Promise<AuthorityMatrixRule[]> {
  const schema = tenantSchema(tenantId);


  for (const r of rules) {
    if (r.ruleId) {
      await safeQuery(
        `UPDATE "${schema}".authority_matrix SET
           decision_type = $1, min_criticality = $2,
           required_approver_role = $3, escalation_timeout_hours = $4
         WHERE rule_id = $5`,
        [r.decisionType, r.minCriticality, r.requiredApproverRole, r.escalationTimeoutHours, r.ruleId]
      );
    } else {
      await safeQuery(
        `INSERT INTO "${schema}".authority_matrix
           (decision_type, min_criticality, required_approver_role, escalation_timeout_hours)
         VALUES ($1, $2, $3, $4)`,
        [r.decisionType, r.minCriticality, r.requiredApproverRole, r.escalationTimeoutHours]
      );
    }
  }
  return getAuthorityMatrix(tenantId);
}

export async function deleteAuthorityMatrixRule(
  tenantId: string,
  ruleId: string
): Promise<void> {
  const schema = tenantSchema(tenantId);

  await safeQuery(`DELETE FROM "${schema}".authority_matrix WHERE rule_id = $1`, [ruleId]);
}

// ── Escalation Thresholds CRUD ─────────────────────────────────────────────

export async function getEscalationThresholds(
  tenantId: string
): Promise<{ level: number; timeoutHours: number; notifyRole: string }[]> {
  const schema = tenantSchema(tenantId);

  const result = await safeQuery(
    `SELECT * FROM "${schema}".escalation_thresholds ORDER BY level`
  );
  return result.rows.map((r: GenericRow) => ({
    level: r.level,
    timeoutHours: r.timeout_hours,
    notifyRole: r.notify_role,
  }));
}

export async function upsertEscalationThresholds(
  tenantId: string,
  thresholds: { level: number; timeoutHours: number; notifyRole: string }[]
): Promise<{ level: number; timeoutHours: number; notifyRole: string }[]> {
  const schema = tenantSchema(tenantId);


  for (const t of thresholds) {
    await safeQuery(
      `INSERT INTO "${schema}".escalation_thresholds (level, timeout_hours, notify_role, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (level) DO UPDATE SET
         timeout_hours = $2, notify_role = $3, updated_at = NOW()`,
      [t.level, t.timeoutHours, t.notifyRole]
    );
  }
  return getEscalationThresholds(tenantId);
}

// ── Get full constitution ──────────────────────────────────────────────────

export async function getConstitution(tenantId: string): Promise<GovernanceConstitution> {
  const [riskAppetite, authorityMatrix, escalationThresholds] = await Promise.all([
    getRiskAppetite(tenantId),
    getAuthorityMatrix(tenantId),
    getEscalationThresholds(tenantId),
  ]);
  return { riskAppetite, authorityMatrix, escalationThresholds };
}

// ── Authority check: who must approve? ─────────────────────────────────────

export async function resolveApprover(
  tenantId: string,
  decisionType: string,
  criticality: string
): Promise<{ requiredRole: string; timeoutHours: number } | null> {
  const matrix = await getAuthorityMatrix(tenantId);

  const CRITICALITY_ORDER = ['low', 'medium', 'high', 'critical'];
  const critLevel = CRITICALITY_ORDER.indexOf(criticality);

  // Find the matching rule: decision_type matches AND min_criticality <= actual criticality
  const matching = matrix
    .filter(r => r.decisionType === decisionType)
    .filter(r => CRITICALITY_ORDER.indexOf(r.minCriticality) <= critLevel)
    .sort((a, b) =>
      CRITICALITY_ORDER.indexOf(b.minCriticality) - CRITICALITY_ORDER.indexOf(a.minCriticality)
    );

  if (matching.length === 0) return null;

  return {
    requiredRole: matching[0].requiredApproverRole,
    timeoutHours: matching[0].escalationTimeoutHours,
  };
}

// ── Check risk against appetite ────────────────────────────────────────────

export async function checkRiskAgainstAppetite(
  tenantId: string,
  category: string,
  residualScore: number
): Promise<{ withinAppetite: boolean; maxAllowed: number; requiredRole: string | null }> {
  const appetite = await getRiskAppetite(tenantId);
  const entry = appetite.find(a => a.category === category);

  if (!entry) {
    // No appetite defined for this category — allow by default
    return { withinAppetite: true, maxAllowed: -1, requiredRole: null };
  }

  return {
    withinAppetite: residualScore <= entry.maxResidualScore,
    maxAllowed: entry.maxResidualScore,
    requiredRole: residualScore > entry.maxResidualScore ? entry.acceptanceRequiresRole : null,
  };
}

// ── Seed default constitution ──────────────────────────────────────────────

export async function seedDefaultConstitution(
  tenantId: string,
  agrcOsConfig?: { riskAppetite?: string; escalationLevel?: string; enforcementMode?: string },
): Promise<void> {
  const appetite = await getRiskAppetite(tenantId);
  if (appetite.length > 0) return; // already seeded

  // ── Risk appetite scores driven by onboarding riskAppetite answer ─────────
  const preset = agrcOsConfig?.riskAppetite || 'moderate';
  const appetiteMultiplier = preset === 'conservative' ? 0.6 : preset === 'aggressive' ? 1.4 : 1.0;
  const cadenceMultiplier = preset === 'conservative' ? 0.5 : preset === 'aggressive' ? 2.0 : 1.0;

  await upsertRiskAppetite(tenantId, [
    { category: 'operational', maxResidualScore: Math.round(50 * appetiteMultiplier), acceptanceRequiresRole: 'risk_manager', reviewCadenceDays: Math.round(90 * cadenceMultiplier) },
    { category: 'compliance', maxResidualScore: Math.round(30 * appetiteMultiplier), acceptanceRequiresRole: 'compliance_officer', reviewCadenceDays: Math.round(60 * cadenceMultiplier) },
    { category: 'financial', maxResidualScore: Math.round(40 * appetiteMultiplier), acceptanceRequiresRole: 'owner', reviewCadenceDays: Math.round(90 * cadenceMultiplier) },
    { category: 'strategic', maxResidualScore: Math.round(60 * appetiteMultiplier), acceptanceRequiresRole: 'owner', reviewCadenceDays: Math.round(180 * cadenceMultiplier) },
    { category: 'reputational', maxResidualScore: Math.round(25 * appetiteMultiplier), acceptanceRequiresRole: 'owner', reviewCadenceDays: Math.round(60 * cadenceMultiplier) },
  ]);

  // ── Authority matrix — tighter approvals for conservative, looser for aggressive ──
  const lowApprover = preset === 'conservative' ? 'compliance_officer' : 'risk_manager';
  const highApprover = 'owner';
  const baseSla = preset === 'conservative' ? 24 : preset === 'aggressive' ? 72 : 48;

  await upsertAuthorityMatrix(tenantId, [
    { ruleId: '', decisionType: 'risk_acceptance', minCriticality: 'low', requiredApproverRole: lowApprover, escalationTimeoutHours: baseSla * 1.5 },
    { ruleId: '', decisionType: 'risk_acceptance', minCriticality: 'high', requiredApproverRole: highApprover, escalationTimeoutHours: baseSla },
    { ruleId: '', decisionType: 'exception_approval', minCriticality: 'low', requiredApproverRole: lowApprover, escalationTimeoutHours: baseSla },
    { ruleId: '', decisionType: 'exception_approval', minCriticality: 'critical', requiredApproverRole: highApprover, escalationTimeoutHours: Math.max(baseSla / 2, 12) },
    { ruleId: '', decisionType: 'policy_change', minCriticality: 'medium', requiredApproverRole: 'compliance_officer', escalationTimeoutHours: baseSla },
    { ruleId: '', decisionType: 'vendor_onboarding', minCriticality: 'high', requiredApproverRole: lowApprover, escalationTimeoutHours: baseSla },
  ]);

  // ── Escalation thresholds — SLA driven by escalation_level preference ─────
  const escLevel = agrcOsConfig?.escalationLevel || 'high';
  const escBaseSla = escLevel === 'all' ? 12 : escLevel === 'medium' ? 18 : escLevel === 'critical' ? 48 : 24;

  await upsertEscalationThresholds(tenantId, [
    { level: 1, timeoutHours: escBaseSla, notifyRole: 'admin' },
    { level: 2, timeoutHours: escBaseSla * 2, notifyRole: 'compliance_officer' },
    { level: 3, timeoutHours: escBaseSla * 3, notifyRole: 'owner' },
  ]);
}

// ── Constitution Validation ─────────────────────────────────────────────────

export interface ConstitutionValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const VALID_ROLES = ['owner', 'admin', 'compliance_officer', 'risk_manager', 'auditor', 'viewer', 'it_security_officer', 'ciso'];
const VALID_CRITICALITIES = ['low', 'medium', 'high', 'critical'];

export async function validateConstitution(tenantId: string): Promise<ConstitutionValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const [appetite, matrix, escalation] = await Promise.all([
    getRiskAppetite(tenantId),
    getAuthorityMatrix(tenantId),
    getEscalationThresholds(tenantId),
  ]);

  // Risk appetite validation: scores 0-100
  for (const a of appetite) {
    if (a.maxResidualScore < 0 || a.maxResidualScore > 100) {
      errors.push(`Risk appetite "${a.category}": max score ${a.maxResidualScore} must be 0-100`);
    }
    if (!VALID_ROLES.includes(a.acceptanceRequiresRole)) {
      warnings.push(`Risk appetite "${a.category}": role "${a.acceptanceRequiresRole}" not in standard RBAC roles`);
    }
    if (a.reviewCadenceDays < 1) {
      errors.push(`Risk appetite "${a.category}": review cadence must be >= 1 day`);
    }
  }

  // Escalation levels must be sequential (1, 2, 3...)
  const levels = escalation.map(e => e.level).sort((a, b) => a - b);
  for (let i = 0; i < levels.length; i++) {
    if (levels[i] !== i + 1) {
      errors.push(`Escalation levels must be sequential starting from 1. Found gap at level ${levels[i]}`);
      break;
    }
  }
  // Escalation timeouts should increase with level
  for (let i = 1; i < escalation.length; i++) {
    const sorted = [...escalation].sort((a, b) => a.level - b.level);
    if (sorted[i].timeoutHours <= sorted[i - 1].timeoutHours) {
      warnings.push(`Escalation level ${sorted[i].level} timeout (${sorted[i].timeoutHours}h) should be greater than level ${sorted[i - 1].level} (${sorted[i - 1].timeoutHours}h)`);
    }
  }

  // Authority matrix: no gaps in decision types
  const decisionTypes = [...new Set(matrix.map(r => r.decisionType))];
  for (const dt of decisionTypes) {
    const rules = matrix.filter(r => r.decisionType === dt);
    const coveredCriticalities = rules.map(r => r.minCriticality);
    if (!coveredCriticalities.some(c => c === 'low')) {
      warnings.push(`Authority matrix "${dt}": no rule covers "low" criticality — defaults may apply`);
    }
    for (const rule of rules) {
      if (!VALID_CRITICALITIES.includes(rule.minCriticality)) {
        errors.push(`Authority matrix "${dt}": invalid criticality "${rule.minCriticality}"`);
      }
      if (!VALID_ROLES.includes(rule.requiredApproverRole)) {
        warnings.push(`Authority matrix "${dt}": role "${rule.requiredApproverRole}" not in standard RBAC roles`);
      }
    }
  }

  // Must have at least one risk appetite entry
  if (appetite.length === 0) {
    warnings.push('No risk appetite entries defined — constitution is incomplete');
  }
  if (escalation.length === 0) {
    warnings.push('No escalation thresholds defined — escalation chain is empty');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ── Row mappers ────────────────────────────────────────────────────────────

function rowToAppetite(row: Record<string, unknown>): RiskAppetiteEntry {
  return {

    category: row.category,
    maxResidualScore: parseFloat((row as any).max_residual_score),

    acceptanceRequiresRole: row.acceptance_requires_role,

    reviewCadenceDays: row.review_cadence_days,
  };
}

function rowToAuthority(row: Record<string, unknown>): AuthorityMatrixRule {
  return {

    ruleId: row.rule_id,

    decisionType: row.decision_type,

    minCriticality: row.min_criticality,

    requiredApproverRole: row.required_approver_role,

    escalationTimeoutHours: row.escalation_timeout_hours,
  };
}

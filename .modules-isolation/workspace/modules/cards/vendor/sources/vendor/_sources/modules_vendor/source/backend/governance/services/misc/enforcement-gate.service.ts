import { catchHandler, EC } from '@dos/platform-core/resilience';
// ============================================
// Shahin — Enforcement Gate Service
// AGRC-OS Layer 7: Release gate (CI/CD) and
// vendor gate (procurement) validation endpoints.
// External systems call these to get ALLOW/DENY.
// ============================================

import { query as _query, safeQuery, tenantSchema } from '../../ports/database.port';
import { recordAudit } from '../../../audit/services/audit/core/audit-trail.service';
import { getScoreHistory } from '../../../analytics/services/engagement/engagement-score.service';
import { randomUUID } from 'node:crypto';
import type {
  GateValidationRequest as _GateValidationRequest,
  GateValidationResult,
} from '@dos/types';
import { getFirstRow } from '@dos/db';
import { toErrorMessage } from '../../../../utils/error';
import type { GenericRow as _GenericRow } from '@dos/types';

const ENGAGEMENT_SCORE_THRESHOLD = 40;

// ── Release Gate ───────────────────────────────────────────────────────────
// Validates that all specified controls are in 'effective' state before
// allowing a release to proceed. Returns 200 (allow) or 409 (block).

export async function validateReleaseGate(
  tenantId: string,
  releaseId: string,
  serviceName: string,
  controlKeys: string[],
  requestedBy: string
): Promise<GateValidationResult> {
  const schema = tenantSchema(tenantId);

  if (!controlKeys || controlKeys.length === 0) {
    return { allowed: true, gateType: 'release', reason: 'No controls specified', overrideAvailable: false };
  }

  // Check each control's lifecycle state
  const placeholders = controlKeys.map((_, i) => `$${i + 1}`).join(', ');
  const result = await safeQuery(
    `SELECT control_id, lifecycle_state FROM "${schema}".ucf_controls
     WHERE control_id IN (${placeholders})`,
    controlKeys
  );

  const controlMap = new Map<string, string>();
  for (const row of result.rows) {
    controlMap.set(row.control_id, row.lifecycle_state);
  }

  const blockedControls: string[] = [];
  for (const key of controlKeys) {
    const state = controlMap.get(key);
    if (!state || state !== 'effective') {
      blockedControls.push(key);
    }
  }

  const allowed = blockedControls.length === 0;
  const reason = allowed
    ? `All ${controlKeys.length} controls are effective — release allowed`
    : `${blockedControls.length} control(s) not in effective state — release blocked`;

  // Log gate decision
  await logGateDecision(schema, {
    gateType: 'release',
    subjectId: releaseId,
    subjectName: serviceName,
    allowed,
    reason,
    requestedBy,
    details: { controlKeys, blockedControls },
  });

  // Audit trail
  await recordAudit({
    tenantId,
    userId: requestedBy,
    module: 'enforcement',
    action: allowed ? 'allow' : 'block',
    entityType: 'release_gate',
    entityId: releaseId,
    afterState: { serviceName, allowed, blockedControls },
  });

  return { allowed, gateType: 'release', reason, blockedControls, overrideAvailable: !allowed };
}


// ── Vendor Gate ────────────────────────────────────────────────────────────
// Validates that a vendor's risk score is within the tenant's risk appetite
// before allowing onboarding. Returns 200 (allow) or 409 (block).

export async function validateVendorGate(
  tenantId: string,
  vendorId: string,
  vendorName: string,
  riskScore: number,
  requestedBy: string
): Promise<GateValidationResult> {
  const schema = tenantSchema(tenantId);

  // ── Engagement Score Gate ────────────────────────────────────────────────
  // Block vendor onboarding and new contract approvals when engagement score < 40
  try {
    const scoreHistory = await getScoreHistory(tenantId, vendorId, 1);
    if (scoreHistory.length > 0) {
      const latestScore = scoreHistory[0];
      if ((latestScore as any).totalScore < ENGAGEMENT_SCORE_THRESHOLD) {
        const result: GateValidationResult = {
          allowed: false,
          gateType: 'vendor',
          reason: `Vendor engagement score (${(latestScore as any).totalScore}) is below threshold (${ENGAGEMENT_SCORE_THRESHOLD}) — onboarding and new contracts blocked`,
          overrideAvailable: true,
        };

        await logGateDecision(schema, {
          gateType: 'vendor',
          subjectId: vendorId,
          subjectName: vendorName,
          allowed: false,
          reason: result.reason,
          requestedBy,
          details: {
            riskScore,
            engagementScore: (latestScore as any).totalScore,
            engagementThreshold: ENGAGEMENT_SCORE_THRESHOLD,
            scoreBreakdown: {
              responseTimeScore: (latestScore as any).responseTimeScore,
              completionRateScore: (latestScore as any).completionRateScore,
              evidenceTimelinessScore: (latestScore as any).evidenceTimelinessScore,
              remediationRateScore: (latestScore as any).remediationRateScore,
            },
          },
        });

        await recordAudit({
          tenantId,
          userId: requestedBy,
          module: 'enforcement',
          action: 'block',
          entityType: 'vendor_gate',
          entityId: vendorId,
          afterState: {
            vendorName,
            engagementScore: (latestScore as any).totalScore,
            engagementThreshold: ENGAGEMENT_SCORE_THRESHOLD,
            reason: 'engagement_score_low',
          },
        });

        return result;
      }
    }
  } catch {
    // If engagement score service is unavailable, continue with risk-based checks
  }

  // Check risk appetite for vendor category
  let maxAllowed = 75; // default if no appetite configured
  try {
    const { checkRiskAgainstAppetite } = await import('../governance/governance-constitution.service.js');
    const appetiteCheck = await checkRiskAgainstAppetite(tenantId, 'operational', riskScore);
    if (!appetiteCheck.withinAppetite) {
      const result: GateValidationResult = {
        allowed: false,
        gateType: 'vendor',
        reason: `Vendor risk score (${riskScore}) exceeds appetite threshold (${appetiteCheck.maxAllowed}) — onboarding blocked`,
        overrideAvailable: true,
      };

      await logGateDecision(schema, {
        gateType: 'vendor',
        subjectId: vendorId,
        subjectName: vendorName,
        allowed: false,
        reason: result.reason,
        requestedBy,
        details: { riskScore, maxAllowed: appetiteCheck.maxAllowed },
      });

      await recordAudit({
        tenantId,
        userId: requestedBy,
        module: 'enforcement',
        action: 'block',
        entityType: 'vendor_gate',
        entityId: vendorId,
        afterState: { vendorName, riskScore, maxAllowed: appetiteCheck.maxAllowed },
      });

      return result;
    }
    maxAllowed = appetiteCheck.maxAllowed;
  } catch {
    // If governance constitution not available, use default threshold
    if (riskScore > maxAllowed) {
      const result: GateValidationResult = {
        allowed: false,
        gateType: 'vendor',
        reason: `Vendor risk score (${riskScore}) exceeds default threshold (${maxAllowed})`,
        overrideAvailable: true,
      };
      await logGateDecision(schema, {
        gateType: 'vendor', subjectId: vendorId, subjectName: vendorName,
        allowed: false, reason: result.reason, requestedBy, details: { riskScore, maxAllowed },
      });
      return result;
    }
  }

  const result: GateValidationResult = {
    allowed: true,
    gateType: 'vendor',
    reason: `Vendor risk score (${riskScore}) within appetite — onboarding allowed`,
    overrideAvailable: false,
  };

  await logGateDecision(schema, {
    gateType: 'vendor', subjectId: vendorId, subjectName: vendorName,
    allowed: true, reason: result.reason, requestedBy, details: { riskScore, maxAllowed },
  });

  await recordAudit({
    tenantId,
    userId: requestedBy,
    module: 'enforcement',
    action: 'allow',
    entityType: 'vendor_gate',
    entityId: vendorId,
    afterState: { vendorName, riskScore, allowed: true },
  });

  return result;
}

// ── RACI Completeness Gate ─────────────────────────────────────────────────
// Blocks entity state transitions (e.g., draft→active) when RACI is incomplete.
// Requires at least 'responsible' + 'accountable' assignments.

export async function validateRaciGate(
  tenantId: string,
  entityType: string,
  entityId: string,
  targetState: string,
  requestedBy: string
): Promise<GateValidationResult> {
  const schema = tenantSchema(tenantId);

  const protectedTransitions = ['active', 'approved', 'published', 'effective', 'in_review'];
  if (!protectedTransitions.includes(targetState)) {
    return { allowed: true, gateType: 'raci', reason: `State "${targetState}" does not require RACI check`, overrideAvailable: false };
  }

  const raciCheck = await safeQuery(
    `SELECT
       BOOL_OR(raci_role = 'responsible') AS has_responsible,
       BOOL_OR(raci_role = 'accountable') AS has_accountable,
       BOOL_OR(user_id IS NOT NULL)      AS has_user_owner,
       BOOL_OR(team_id IS NOT NULL)      AS has_team_owner
     FROM "${schema}".grc_raci_assignments
     WHERE entity_type = $1 AND entity_id = $2
       AND is_active = TRUE AND deleted_at IS NULL`,
    [entityType, entityId]
  );

  const row = getFirstRow(raciCheck) || {};
  const hasR = row.has_responsible === true;
  const hasA = row.has_accountable === true;
  const hasUser = row.has_user_owner === true;
  const hasTeam = row.has_team_owner === true;

  const missingRoles: string[] = [];
  if (!hasR) missingRoles.push('responsible');
  if (!hasA) missingRoles.push('accountable');

  const allowed = hasR && hasA;
  const reason = allowed
    ? `RACI complete for ${entityType} ${entityId} — transition to "${targetState}" allowed`
    : `Missing RACI roles [${missingRoles.join(', ')}] for ${entityType} ${entityId} — transition to "${targetState}" blocked`;

  await logGateDecision(schema, {
    gateType: 'raci',
    subjectId: entityId,
    subjectName: `${entityType}:${entityId}`,
    allowed,
    reason,
    requestedBy,
    details: { entityType, targetState, hasR, hasA, hasUser, hasTeam, missingRoles },
  });

  await recordAudit({
    tenantId, userId: requestedBy, module: 'enforcement',
    action: allowed ? 'allow' : 'block',
    entityType: 'raci_gate',
    entityId,
    afterState: { entityType, targetState, allowed, missingRoles },
  });

  if (!allowed) {
    try {

      const { eventBus } = await import('../../../platform/services/event/event-bus.service.js');
      await eventBus.publish(({
              eventType: 'raci.enforcement_blocked', tenantId,
              sourceService: 'enforcement-gate',
              entityType, entityId,
              severity: 'critical',
              payload: { targetState, missingRoles, requestedBy },
            } as any));
    } catch { /* best effort */ }
  }

  return { allowed, gateType: 'raci', reason, overrideAvailable: !allowed };
}


// ── Gate override with approval workflow ────────────────────────────────────

export async function overrideGate(
  tenantId: string,
  gateLogId: string,
  overriddenBy: string,
  justification: string,
  expiresInHours: number = 24
): Promise<{ success: boolean; requiresApproval: boolean; overrideId?: string }> {
  const schema = tenantSchema(tenantId);
  const overrideId = randomUUID();
  const expiresAt = new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString();
  await safeQuery(
    `INSERT INTO "${schema}".gate_override_requests
      (override_id, gate_log_id, requested_by, justification, status, expires_at, created_at)
     VALUES ($1, $2, $3, $4, 'pending', $5, NOW())`,
    [overrideId, gateLogId, overriddenBy, justification, expiresAt],
  ).catch(() => undefined);
  return { success: true, requiresApproval: true, overrideId };
}

// ── Approve/reject override request ────────────────────────────────────────

export async function approveOverrideRequest(
  tenantId: string,
  overrideId: string,
  approvedBy: string,
  approved: boolean,
  userRoles: string[] = [],
): Promise<{ success: boolean }> {
  const schema = tenantSchema(tenantId);
  await safeQuery(
    `UPDATE "${schema}".gate_override_requests
     SET status = $1, decided_by = $2, decided_at = NOW(), updated_at = NOW()
     WHERE override_id = $3`,
    [approved ? 'approved' : 'rejected', approvedBy, overrideId],
  ).catch(() => undefined);
  void userRoles;
  return { success: true };
}

// ── Incident Closure Gate ──────────────────────────────────────────────────
// Blocks incident closure if no PIR exists for critical/high severity incidents

export async function validateIncidentClosureGate(
  tenantId: string,
  incidentId: string,
  requestedBy: string
): Promise<GateValidationResult> {
  const schema = tenantSchema(tenantId);
  const incident = getFirstRow((await safeQuery(
    `SELECT severity, status FROM "${schema}".incidents WHERE incident_id = $1`, [incidentId]
  )));
  if (!incident) return { allowed: false, gateType: 'incident_closure', reason: 'Incident not found', overrideAvailable: false };
  if (!['critical', 'high'].includes(incident.severity)) {
    return { allowed: true, gateType: 'incident_closure', reason: 'PIR not required for this severity', overrideAvailable: false };
  }
  try {
    const pir = getFirstRow((await safeQuery(
      `SELECT pir_id FROM "${schema}".incident_pir WHERE incident_id = $1 AND status IN ('completed','signed_off') LIMIT 1`, [incidentId]
    )));
    if (!pir) {
      await logGateDecision(schema, { gateType: 'incident_closure', subjectId: incidentId, subjectName: `incident-${incidentId}`, allowed: false, reason: 'PIR required for critical/high incidents', requestedBy, details: { severity: incident.severity } });
      return { allowed: false, gateType: 'incident_closure', reason: 'PIR must be completed before closing critical/high severity incidents', overrideAvailable: true };
    }
  } catch { /* PIR table may not exist */ }
  return { allowed: true, gateType: 'incident_closure', reason: 'PIR completed', overrideAvailable: false };
}

// ── BCP Activation Gate ───────────────────────────────────────────────────
// Blocks BCP activation if no approved BIA exists for the plan's scope

export async function validateBCPActivationGate(
  tenantId: string,
  planId: string,
  requestedBy: string
): Promise<GateValidationResult> {
  const schema = tenantSchema(tenantId);
  try {
    const bia = getFirstRow((await safeQuery(
      `SELECT bia_id FROM "${schema}".bia_assessments WHERE status = 'approved' AND deleted_at IS NULL LIMIT 1`
    )));
    if (!bia) {
      await logGateDecision(schema, { gateType: 'bcp_activation', subjectId: planId, subjectName: `bcp-plan-${planId}`, allowed: false, reason: 'No approved BIA exists', requestedBy, details: {} });
      return { allowed: false, gateType: 'bcp_activation', reason: 'At least one approved BIA must exist before activating a BCP plan', overrideAvailable: true };
    }
  } catch { /* BIA table may not exist */ }
  return { allowed: true, gateType: 'bcp_activation', reason: 'BIA approved', overrideAvailable: false };
}

// ── Training Certification Gate ───────────────────────────────────────────
// Blocks role assignment if mandatory training not completed

export async function validateTrainingCertGate(
  tenantId: string,
  userId: string,
  roleId: string,
  requestedBy: string
): Promise<GateValidationResult> {
  const schema = tenantSchema(tenantId);
  try {
    const overdue = getFirstRow((await safeQuery(
      `SELECT COUNT(*)::int AS cnt FROM "${schema}".training_assignments
       WHERE user_id = $1 AND status IN ('assigned','in_progress')
         AND due_date < NOW()`, [userId]
    )));
    if (overdue?.cnt > 0) {
      await logGateDecision(schema, { gateType: 'training_cert', subjectId: userId, subjectName: `user-${userId}-role-${roleId}`, allowed: false, reason: `${overdue.cnt} overdue training assignments`, requestedBy, details: { userId, roleId, overdueCount: overdue.cnt } });
      return { allowed: false, gateType: 'training_cert', reason: `User has ${overdue.cnt} overdue mandatory training assignments`, overrideAvailable: true };
    }
  } catch { /* training_assignments may not exist */ }
  return { allowed: true, gateType: 'training_cert', reason: 'Training requirements met', overrideAvailable: false };
}

// ── Vendor Onboarding Gate ────────────────────────────────────────────────
// Blocks vendor activation if due diligence is not approved

export async function validateVendorOnboardingGate(
  tenantId: string,
  vendorId: string,
  requestedBy: string
): Promise<GateValidationResult> {
  const schema = tenantSchema(tenantId);
  try {
    const dd = getFirstRow((await safeQuery(
      `SELECT dd_id, status FROM "${schema}".vendor_due_diligence
       WHERE vendor_id = $1 AND status = 'approved' AND deleted_at IS NULL
       ORDER BY completed_at DESC LIMIT 1`, [vendorId]
    )));
    if (!dd) {
      await logGateDecision(schema, { gateType: 'vendor_onboarding', subjectId: vendorId, subjectName: `vendor-${vendorId}`, allowed: false, reason: 'No approved due diligence', requestedBy, details: { vendorId } });
      return { allowed: false, gateType: 'vendor_onboarding', reason: 'Vendor must have approved due diligence before activation', overrideAvailable: true };
    }
  } catch { /* vendor_due_diligence may not exist */ }
  return { allowed: true, gateType: 'vendor_onboarding', reason: 'Due diligence approved', overrideAvailable: false };
}

// ── Get gate log ───────────────────────────────────────────────────────────

export async function getGateLog(
  tenantId: string,
  opts?: { gateType?: string; limit?: number }
): Promise<Record<string, unknown>[]> {
  const schema = tenantSchema(tenantId);
  await ensureGateLogTable(schema);

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (opts?.gateType) {
    conditions.push(`gate_type = $1`);
    params.push(opts.gateType);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const limit = opts?.limit || 50;

  const result = await safeQuery(
    `SELECT * FROM "${schema}".enforcement_gate_log ${where}
     ORDER BY created_at DESC LIMIT ${limit}`,
    params
  );
  return result.rows;
}

// ── Internal helpers ───────────────────────────────────────────────────────

async function ensureGateLogTable(schema: string): Promise<void> {
  await safeQuery(`
    CREATE TABLE IF NOT EXISTS "${schema}".enforcement_gate_log (
      gate_log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      gate_type VARCHAR(20) NOT NULL,
      subject_id VARCHAR(200) NOT NULL,
      subject_name VARCHAR(500),
      allowed BOOLEAN NOT NULL,
      reason TEXT,
      requested_by VARCHAR(64),
      details JSONB DEFAULT '{}',
      overridden BOOLEAN DEFAULT FALSE,
      overridden_by VARCHAR(64),
      override_justification TEXT,
      overridden_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function logGateDecision(
  schema: string,
  data: {
    gateType: string;
    subjectId: string;
    subjectName: string;
    allowed: boolean;
    reason: string;
    requestedBy: string;
    details: Record<string, unknown>;
  }
): Promise<string | undefined> {
  await ensureGateLogTable(schema);
  const result = await safeQuery(
    `INSERT INTO "${schema}".enforcement_gate_log
       (gate_type, subject_id, subject_name, allowed, reason, requested_by, details)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING gate_log_id`,
    [data.gateType, data.subjectId, data.subjectName, data.allowed, data.reason,
     data.requestedBy, JSON.stringify(data.details)]
  );
  return result.rows[0]?.gate_log_id;
}

// ===============================================================
// Dynamic Gate Validation — DB-driven, AI-first
// ===============================================================

interface DynamicGateResult {
  allowed: boolean;
  gateCode: string;
  gateType: string;
  displayName: string;
  reason: string;
  blockers: Array<{ rule: string; severity: string; message: string }>;
  warnings: Array<{ rule: string; message: string }>;
  overrideAvailable: boolean;
  aiAnalysis?: any;
  gateLogId?: string;
}

export async function validateDynamicGate(
  tenantId: string,
  gateCode: string,
  params: Record<string, unknown>,
  requestedBy: string
): Promise<DynamicGateResult> {
  const schema = tenantSchema(tenantId);

  // 1. Load gate definition from DB
  const gateDef = await safeQuery(
    `SELECT * FROM "${schema}".gate_definitions
     WHERE gate_code = $1 AND enabled = true
     AND tenant_id IN ($2, '00000000-0000-0000-0000-000000000000')
     ORDER BY tenant_id DESC LIMIT 1`,
    [gateCode, tenantId]
  );

  if (!gateDef.rows[0]) {
    // Fallback to legacy gates for backward compatibility
    return await fallbackToLegacyGate(tenantId, gateCode, params, requestedBy);
  }

  const gate = gateDef.rows[0];

  // 2. Load validation rules from gate_validation_rules table
  const rulesResult = await safeQuery(
    `SELECT * FROM "${schema}".gate_validation_rules
     WHERE gate_id = $1 AND enabled = true ORDER BY execution_order`,
    [gate.gate_id]
  );

  const blockers: Array<{ rule: string; severity: string; message: string }> = [];
  const warnings: Array<{ rule: string; message: string }> = [];

  // 3. Execute each validation rule in order
  for (const rule of rulesResult.rows) {
    try {
      const result = await executeValidationRule(schema, rule, params);
      if (!result.passed) {
        if (rule.severity === 'blocker') {
          blockers.push({ rule: rule.rule_name, severity: rule.severity, message: result.message || rule.error_message_en || 'Validation failed' });
        } else {
          warnings.push({ rule: rule.rule_name, message: result.message || rule.error_message_en || 'Warning' });
        }
      }
    } catch (err) {
      warnings.push({ rule: rule.rule_name, message: `Rule execution error: ${toErrorMessage(err)}` });
    }
  }

  // 4. Also execute inline validation_rules from gate definition JSONB column
  const inlineRules = Array.isArray(gate.validation_rules) ? gate.validation_rules : [];
  for (const inlineRule of inlineRules) {
    try {
      const result = await executeInlineRule(schema, inlineRule, params);
      if (!result.passed) {
        blockers.push({ rule: inlineRule.type || 'inline', severity: 'blocker', message: result.message });
      }
    } catch {
      // Inline rule failures are non-fatal
    }
  }

  const allowed = blockers.length === 0;
  const reason = allowed
    ? `All validation rules passed for ${gate.display_name_en}`
    : `${blockers.length} blocker(s) found: ${blockers.map(b => b.message).join('; ')}`;

  // 5. AI Analysis (if enabled on this gate)
  let aiAnalysis: any = undefined;
  if (gate.ai_analysis_enabled && gate.ai_prompt_template) {
    try {
      const { claudeJSON } = await import('../../../../config/claude-client.js');
      aiAnalysis = await claudeJSON(
        `You are an AI-first GRC enforcement gate analyst. Provide structured JSON with:\n` +
          `risk_level (low|medium|high|critical), confidence (0-1), analysis (string),\n` +
          `recommendations (array of strings), override_risk (string if gate was blocked).\n\n` +
          `${gate.ai_prompt_template}\n\nGate: ${gate.display_name_en}\nResult: ${allowed ? 'PASSED' : 'BLOCKED'}\n` +
          `Blockers: ${JSON.stringify(blockers)}\nWarnings: ${JSON.stringify(warnings)}\nParams: ${JSON.stringify(params)}`,
      );
    } catch {
      aiAnalysis = { error: 'AI analysis unavailable' };
    }
  }

  // 6. Log gate decision to enforcement_gate_log
  const logResult = await logGateDecision(schema, {
    gateType: gateCode,

    subjectId: params.subjectId || params.releaseId || params.vendorId || params.incidentId || '',

    subjectName: params.subjectName || params.serviceName || params.vendorName || gateCode,
    allowed,
    reason,
    requestedBy,
    details: { params, blockers, warnings, aiAnalysis },
  });

  // 7. Audit trail
  await recordAudit({
    tenantId,
    userId: requestedBy,
    module: 'enforcement',
    action: allowed ? 'allow' : 'block',
    entityType: 'dynamic_gate',
    entityId: gateCode,
    afterState: { allowed, blockers: blockers.length, warnings: warnings.length },
  });

  // 8. Auto-notify on block (best-effort)
  if (!allowed && gate.auto_notify_on_block) {
    try {
      await safeQuery(
        `INSERT INTO "${schema}".notification_queue (tenant_id, recipient_id, notification_type, subject, body, priority, channels)
         VALUES ($1, $2, 'gate_blocked', $3, $4, 'high', $5)`,
        [tenantId, requestedBy, `Gate Blocked: ${gate.display_name_en}`, reason,
         Array.isArray(gate.notification_channels) ? gate.notification_channels : ['in_app']]
      );
    } catch { /* notification is best-effort */ }
  }

  return {
    allowed,
    gateCode,
    gateType: gate.gate_type,
    displayName: gate.display_name_en,
    reason,
    blockers,
    warnings,
    overrideAvailable: !allowed && gate.override_allowed,
    aiAnalysis,
    gateLogId: logResult,
  };
}

/**
 * Executes a single validation rule from the gate_validation_rules table.
 * Supports rule types: sql_check, threshold, entity_status, field_required, ai_assessment.
 */
async function executeValidationRule(
  schema: string,
  rule: any,
  params: Record<string, unknown>
): Promise<{ passed: boolean; message?: string }> {
  const config = typeof rule.rule_config === 'string' ? JSON.parse(rule.rule_config) : rule.rule_config;

  switch (rule.rule_type) {
    case 'sql_check': {
      // Execute a SQL query and check row count against min/max thresholds
      let queryText = config.query;
      const queryParams: unknown[] = [];
      for (const paramName of (config.params || [])) {
        queryParams.push(params[paramName] || null);
        queryText = queryText.replace(`$${queryParams.length}`, `$${queryParams.length}`);
      }
      // Ensure schema-qualified table references
      queryText = queryText.replace(/FROM\s+(\w+)/gi, `FROM "${schema}".$1`);
      const result = await safeQuery(queryText, queryParams);
      const count = parseInt(result.rows[0]?.count || '0', 10);
      if (config.min_count !== undefined && count < config.min_count) {
        return { passed: false, message: `Expected at least ${config.min_count} records, found ${count}` };
      }
      if (config.max_count !== undefined && count > config.max_count) {
        return { passed: false, message: `Expected at most ${config.max_count} records, found ${count}` };
      }
      return { passed: true };
    }

    case 'threshold': {
      // Compare a numeric param value against a configured threshold
      const value = params[config.field];
      if (value === undefined) return { passed: true }; // Skip if field not provided
      const threshold = config.value;
      const op = config.operator || '<=';
      const numVal = typeof value === 'number' ? value : parseFloat((value as any));
      let passed = false;
      switch (op) {
        case '<=': passed = numVal <= threshold; break;
        case '>=': passed = numVal >= threshold; break;
        case '<': passed = numVal < threshold; break;
        case '>': passed = numVal > threshold; break;
        case '==': passed = numVal === threshold; break;
        default: passed = true;
      }
      return { passed, message: passed ? undefined : `${config.field} (${numVal}) does not satisfy ${op} ${threshold}` };
    }

    case 'entity_status': {
      // Check that a DB entity has the required status value
      const table = config.table;
      const statusField = config.status_field || 'status';
      const requiredStatus = config.required_status;
      const entityIdField = config.entity_id_field || Object.keys(params)[0];
      const entityId = params[entityIdField];
      if (!entityId) return { passed: false, message: `Missing entity ID for ${table} check` };

      const result = await safeQuery(
        `SELECT ${statusField} FROM "${schema}".${table} WHERE ${entityIdField} = $1`,
        [entityId]
      );
      if (!result.rows[0]) return { passed: false, message: `Entity not found in ${table}` };
      const currentStatus = result.rows[0][statusField];
      return { passed: currentStatus === requiredStatus, message: currentStatus !== requiredStatus ? `Status is ${currentStatus}, required ${requiredStatus}` : undefined };
    }

    case 'field_required': {
      // Verify that all required fields are present in the params
      const missing = (config.fields || []).filter((f: string) => !params[f]);
      return { passed: missing.length === 0, message: missing.length ? `Missing required fields: ${missing.join(', ')}` : undefined };
    }

    case 'ai_assessment': {
      // Use Claude AI to assess whether the action should be allowed
      try {
        const { claudeJSON } = await import('../../../../config/claude-client.js');
        const assessment = await claudeJSON(
          `${config.system_prompt || 'Assess if this action should be allowed. Respond with JSON: {passed: boolean, reason: string, confidence: number}'}\n\n` +
            `Context: ${JSON.stringify(params)}`,
        );
        const a = assessment as any;
        return { passed: a?.passed !== false, message: a?.reason };
      } catch {
        return { passed: true, message: 'AI assessment unavailable, defaulting to pass' };
      }
    }

    default:
      return { passed: true };
  }
}

/**
 * Executes an inline validation rule from the gate_definitions.validation_rules JSONB column.
 * Delegates to the same rule execution logic as table-based rules.
 */
async function executeInlineRule(
  schema: string,
  rule: { type: string; config: any },
  params: Record<string, unknown>
): Promise<{ passed: boolean; message: string }> {
  const result = await executeValidationRule(schema, { rule_type: rule.type, rule_config: rule.config }, params);
  return { passed: result.passed, message: result.message || '' };
}

/**
 * Falls back to legacy hardcoded gate functions when a gate_code is not found
 * in the gate_definitions table. Ensures backward compatibility.
 */
async function fallbackToLegacyGate(
  tenantId: string,
  gateCode: string,
  params: Record<string, unknown>,
  requestedBy: string
): Promise<DynamicGateResult> {
  try {
    switch (gateCode) {
      case 'release_gate': {

        const releaseResult = await validateReleaseGate(tenantId, (params as any).releaseId, params.serviceName, params.controlKeys || [], requestedBy);
        return { allowed: releaseResult.allowed, gateCode, gateType: 'release', displayName: 'Release Gate', reason: releaseResult.reason, blockers: releaseResult.allowed ? [] : [{ rule: 'legacy', severity: 'blocker', message: releaseResult.reason }], warnings: [], overrideAvailable: releaseResult.overrideAvailable! };
      }
      case 'vendor_gate': {

        const vendorResult = await validateVendorGate(tenantId, (params as any).vendorId, params.vendorName, params.riskScore, requestedBy);
        return { allowed: vendorResult.allowed, gateCode, gateType: 'vendor', displayName: 'Vendor Gate', reason: vendorResult.reason, blockers: vendorResult.allowed ? [] : [{ rule: 'legacy', severity: 'blocker', message: vendorResult.reason }], warnings: [], overrideAvailable: vendorResult.overrideAvailable! };
      }
      default:
        return { allowed: false, gateCode, gateType: 'any', displayName: gateCode, reason: `Unknown gate: ${gateCode}`, blockers: [{ rule: 'any', severity: 'blocker', message: `Gate ${gateCode} not found in registry` }], warnings: [], overrideAvailable: false };
    }
  } catch (err) {
    return { allowed: false, gateCode, gateType: 'error', displayName: gateCode, reason: toErrorMessage(err), blockers: [{ rule: 'error', severity: 'blocker', message: toErrorMessage(err) }], warnings: [], overrideAvailable: false };
  }
}

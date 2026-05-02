import { logger } from '../../../ports/logger.port';
// ============================================
// Shahin-Ai — Governance Cross-Module Hooks
// Central integration service wiring governance
// into risk, audit, incident, evidence, and
// compliance modules.
// ============================================

import { emptyResult, safeQuery, tenantSchema } from '../../../ports/database.port';
import { emitEvent } from '../../../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import type { GenericRow } from '@dos/types';
import { swallowDefault, EC , catchHandler } from '@dos/platform-core/resilience';
import { SYSTEM_JOB_ACTOR } from '../../../ports/platform.port';

// ── Authority Check ──────────────────────────────────────────────────────────

export interface AuthorityCheck {
  authorized: boolean;
  requiredApproverRole?: string;
  delegationId?: string;
  reason?: string;
}

/**
 * Check if a user has authority to accept a risk, based on the authority matrix
 * and active delegations.
 */
export async function checkRiskAcceptanceAuthority(
  tenantId: string, riskId: string, userId: string
): Promise<AuthorityCheck> {
  const schema = tenantSchema(tenantId);
  try {
    // Check authority matrix for risk acceptance rules
    const matrix = await safeQuery(`
      SELECT decision_type, required_approver_role, min_criticality
      FROM "${schema}".authority_matrix
      WHERE decision_type IN ('risk_acceptance', 'risk_accept')
        AND is_active = TRUE
      LIMIT 1
    `);
    const rule = matrix.rows[0];
    if (!rule) {
      return { authorized: false, reason: 'No risk acceptance rule defined in authority matrix', requiredApproverRole: 'admin' };
    }

    // Check if user has active delegation for this authority
    const delegation = await safeQuery(`
      SELECT da.delegation_id, da.authority_type, da.scope
      FROM "${schema}".delegated_authorities da
      WHERE da.delegate_user_id = $1
        AND da.status = 'active'
        AND da.valid_from <= NOW()
        AND (da.valid_to IS NULL OR da.valid_to >= NOW())
        AND da.deleted_at IS NULL
        AND (da.authority_type ILIKE '%risk%' OR da.authority_type = 'all')
      LIMIT 1
    `, [userId]);

    if (delegation.rows.length > 0) {
      return { authorized: true, delegationId: delegation.rows[0].delegation_id };
    }

    return {
      authorized: false,
      requiredApproverRole: rule.required_approver_role || 'admin',
      reason: `User lacks delegation for risk acceptance. Required role: ${rule.required_approver_role || 'admin'}`,
    };
  } catch {
    return { authorized: false, reason: 'Authority check failed — defaulting to admin required', requiredApproverRole: 'admin' };
  }
}

// ── Cross-Module Action Creation ─────────────────────────────────────────────

/**
 * Create a governance action item when a control fails.
 */
export async function createGovernanceActionFromControlFailure(
  tenantId: string, controlId: string, severity: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    const priority = severity === 'critical' ? 'critical' : severity === 'high' ? 'high' : 'medium';
    const result = await safeQuery(`
      INSERT INTO "${schema}".governance_action_items
        (title_en, title_ar, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES
        ($1, $2, $3, $4, 'open', 'control', $5::uuid, $6, NOW(), NOW())
      RETURNING action_id
    `, [
      `Control failure: ${controlId}`,
      `فشل الضابط: ${controlId}`,
      `Auto-generated governance action from control failure. Control: ${controlId}, Severity: ${severity}`,
      priority,
      controlId,
      severity === 'critical',
    ]);
    const actionId = result.rows[0]?.action_id;
    if (actionId) {
      await emitEvent(({
              tenantId, userId: SYSTEM_JOB_ACTOR, module: 'action_items', event: 'created',
              entityType: 'governance_action', entityId: String(actionId),
              data: { source_type: 'control', source_id: controlId, priority, severity },
            } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch (err: unknown) {
    logger.error(`[GovernanceHooks] Failed to create action from control failure: ${toErrorMessage(err)}`);
  }
}

/**
 * Escalate a critical/high audit finding to governance by creating an action item.
 */
export async function escalateAuditFindingToGovernance(
  tenantId: string, findingId: string, severity: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    // Get finding details
    const finding = await safeQuery(`
      SELECT finding_title, finding_description FROM "${schema}".audit_findings
      WHERE finding_id = $1 AND deleted_at IS NULL LIMIT 1
    `, [findingId]);
    const f = finding.rows[0];
    const title = f?.finding_title || `Audit finding ${findingId}`;

    const auditPriority = severity === 'critical' ? 'critical' : 'high';
    const auditResult = await safeQuery(`
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES
        ($1, $2, $3, 'open', 'audit', $4::uuid, $5, NOW(), NOW())
      RETURNING action_id
    `, [
      `Audit escalation: ${title}`,
      `Auto-escalated from audit finding. Severity: ${severity}. ${f?.finding_description || ''}`.trim(),
      auditPriority,
      findingId,
      severity === 'critical',
    ]);
    const auditActionId = auditResult.rows[0]?.action_id;
    if (auditActionId) {
      await emitEvent(({
              tenantId, userId: SYSTEM_JOB_ACTOR, module: 'action_items', event: 'created',
              entityType: 'governance_action', entityId: String(auditActionId),
              data: { source_type: 'audit', source_id: findingId, priority: auditPriority, severity },
            } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch (err: unknown) {
    logger.error(`[GovernanceHooks] Failed to escalate audit finding: ${toErrorMessage(err)}`);
  }
}

/**
 * Escalate a critical incident to the governance body by creating an action item + agenda item.
 */
export async function escalateIncidentToGovernanceBody(
  tenantId: string, incidentId: string, severity: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    // Get incident details
    const incident = await safeQuery(`
      SELECT title, description FROM "${schema}".incidents
      WHERE incident_id = $1 AND deleted_at IS NULL LIMIT 1
    `, [incidentId]);
    const inc = incident.rows[0];

    const incResult = await safeQuery(`
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id, board_attention, escalation_level, created_at, updated_at)
      VALUES
        ($1, $2, 'critical', 'open', 'incident', $3::uuid, TRUE, 1, NOW(), NOW())
      RETURNING action_id
    `, [
      `Incident escalation: ${inc?.title || incidentId}`,
      `Critical incident auto-escalated to governance. ${inc?.description || ''}`.trim(),
      incidentId,
    ]);
    const incActionId = incResult.rows[0]?.action_id;
    if (incActionId) {
      await emitEvent(({
              tenantId, userId: SYSTEM_JOB_ACTOR, module: 'action_items', event: 'created',
              entityType: 'governance_action', entityId: String(incActionId),
              data: { source_type: 'incident', source_id: incidentId, priority: 'critical', severity },
            } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch (err: unknown) {
    logger.error(`[GovernanceHooks] Failed to escalate incident: ${toErrorMessage(err)}`);
  }
}

/**
 * Escalate ethics report to governance body.
 */
export async function escalateEthicsReportToGovernance(
  tenantId: string, reportId: string, severity: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    const report = await safeQuery(`
      SELECT title, description FROM "${schema}".ethics_reports
      WHERE report_id = $1 AND deleted_at IS NULL LIMIT 1
    `, [reportId]);
    const r = report.rows[0];
    const ethicsPriority = severity === 'critical' ? 'critical' : 'high';
    const ethicsResult = await safeQuery(`
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES ($1, $2, $3, 'open', 'ethics', $4::uuid, $5, NOW(), NOW())
      RETURNING action_id
    `, [
      `Ethics escalation: ${r?.title || reportId}`,
      `Ethics report auto-escalated to governance. ${r?.description || ''}`.trim(),
      ethicsPriority,
      reportId,
      severity === 'critical',
    ]);
    const ethicsActionId = ethicsResult.rows[0]?.action_id;
    if (ethicsActionId) {
      await emitEvent(({
              tenantId, userId: SYSTEM_JOB_ACTOR, module: 'action_items', event: 'created',
              entityType: 'governance_action', entityId: String(ethicsActionId),
              data: { source_type: 'ethics', source_id: reportId, priority: ethicsPriority, severity },
            } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    }
    await safeQuery(`UPDATE "${schema}".ethics_reports SET escalated_to_governance = TRUE, updated_at = NOW() WHERE report_id = $1`, [reportId]).catch(catchHandler(EC.EVENT_BUS, {}));
  } catch (err: unknown) {
    logger.error(`[GovernanceHooks] Failed to escalate ethics report: ${toErrorMessage(err)}`);
  }
}

/**
 * Escalate security vulnerability to governance when severity >= HIGH.
 */
export async function escalateSecurityEventToGovernance(
  tenantId: string, entityId: string, eventType: string, severity: string, title: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    const secPriority = severity === 'critical' ? 'critical' : 'high';
    const secResult = await safeQuery(`
      INSERT INTO "${schema}".governance_action_items
        (title_en, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES ($1, $2, $3, 'open', 'security', $4::uuid, $5, NOW(), NOW())
      RETURNING action_id
    `, [
      `Security alert: ${title}`,
      `Auto-escalated security event (${eventType}). Severity: ${severity}.`,
      secPriority,
      entityId,
      severity === 'critical',
    ]);
    const secActionId = secResult.rows[0]?.action_id;
    if (secActionId) {
      await emitEvent(({
              tenantId, userId: SYSTEM_JOB_ACTOR, module: 'action_items', event: 'created',
              entityType: 'governance_action', entityId: String(secActionId),
              data: { source_type: 'security', source_id: entityId, priority: secPriority, severity, eventType },
            } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch (err: unknown) {
    logger.error(`[GovernanceHooks] Failed to escalate security event: ${toErrorMessage(err)}`);
  }
}

// ── Board Attention Aggregation ──────────────────────────────────────────────

/**
 * Aggregate critical items across all modules that require board attention.
 */
export async function getBoardAttentionItems(tenantId: string): Promise<unknown> {
  const schema = tenantSchema(tenantId);

  const results: Record<string, any[]> = {
    governance_actions: [],
    critical_risks: [],
    open_exceptions: [],
    enforcement_violations: [],
    overdue_items: [],
  };

  try {
    // Critical governance actions with board attention
    const actions = await safeQuery(`
      SELECT action_id, title_en, priority, status, source_type, created_at
      FROM "${schema}".governance_action_items
      WHERE board_attention = TRUE AND status NOT IN ('closed', 'completed', 'cancelled')
        AND deleted_at IS NULL
      ORDER BY created_at DESC LIMIT 20
    `);
    results.governance_actions = actions.rows;
  } catch { /* non-fatal */ }

  try {
    // Critical/high risks
    const risks = await safeQuery(`
      SELECT risk_id, risk_title, risk_level, risk_score, status
      FROM "${schema}".risks
      WHERE risk_level IN ('critical', 'high') AND status != 'closed'
        AND deleted_at IS NULL
      ORDER BY risk_score DESC NULLS LAST LIMIT 10
    `);
    results.critical_risks = risks.rows;
  } catch { /* non-fatal */ }

  try {
    // Open high-risk exceptions
    const exceptions = await safeQuery(`
      SELECT exception_id, title, risk_level, status, expiry_date
      FROM "${schema}".exceptions
      WHERE risk_level IN ('critical', 'high') AND status IN ('approved', 'active')
        AND deleted_at IS NULL
      ORDER BY expiry_date ASC NULLS LAST LIMIT 10
    `);
    results.open_exceptions = exceptions.rows;
  } catch { /* non-fatal */ }

  try {
    // Unresolved enforcement violations
    const violations = await safeQuery(`
      SELECT log_id, rule_code, entity_type, severity, message, created_at
      FROM "${schema}".governance_enforcement_log
      WHERE auto_resolved = FALSE AND resolved_at IS NULL
        AND severity = 'violation'
      ORDER BY created_at DESC LIMIT 10
    `);
    results.enforcement_violations = violations.rows;
  } catch { /* non-fatal */ }

  try {
    // Overdue governance actions
    const overdue = await safeQuery(`
      SELECT action_id, title_en, priority, due_date, assigned_to
      FROM "${schema}".governance_action_items
      WHERE due_date < NOW() AND status NOT IN ('closed', 'completed', 'cancelled')
        AND deleted_at IS NULL
      ORDER BY due_date ASC LIMIT 10
    `);
    results.overdue_items = overdue.rows;
  } catch { /* non-fatal */ }

  return results;
}

// ── Governance → Qiyas Integration ──────────────────────────────────────────

export interface QiyasDimension {
  dimension: string;
  score: number;
  grade: string;
  source: string;
}

/**
 * Feed governance health dimensions into Qiyas maturity calculation.
 */
export async function getGovernanceQiyasDimensions(tenantId: string): Promise<QiyasDimension[]> {
  try {
    const { getLatestHealthScore } = await import('../structure/governance-health.service.js');
    const health = await getLatestHealthScore(tenantId);
    if (!health || !health.dimensions || health.dimensions.length === 0) return [];

    const dimensions: QiyasDimension[] = [];

    for (const dim of health.dimensions) {
      dimensions.push({
        dimension: `governance.${dim.dimension}`,
        score: dim.score,
        grade: dim.grade,
        source: 'governance_health_engine',
      });
    }

    return dimensions;
  } catch {
    return [];
  }
}

// ── Governance → Evidence Integration ────────────────────────────────────────

export interface StaleEvidenceImpact {
  evidence_id: string;
  title: string;
  expiry_date: string;
  linked_controls: number;
  governance_impact: string;
}

export async function getStaleEvidenceGovernanceImpact(tenantId: string): Promise<StaleEvidenceImpact[]> {
  const schema = tenantSchema(tenantId);
  try {
    const result = await safeQuery(`
      SELECT e.evidence_id, e.title, e.expiry_date,
        (SELECT COUNT(*)::int FROM "${schema}".evidence_items e2 WHERE e2.control_id = e.control_id AND e2.deleted_at IS NULL) AS linked_controls
      FROM "${schema}".evidence_items e
      WHERE e.deleted_at IS NULL
        AND e.expiry_date IS NOT NULL
        AND e.expiry_date < NOW()
      ORDER BY e.expiry_date ASC
      LIMIT 50
    `);

    return result.rows.map((r: GenericRow) => ({
      evidence_id: r.evidence_id,
      title: r.title,
      expiry_date: r.expiry_date,
      linked_controls: r.linked_controls || 0,
      governance_impact: r.linked_controls > 0 ? 'high' : 'low',
    }));
  } catch {
    return [];
  }
}

export async function createGovernanceActionFromStaleEvidence(
  tenantId: string, evidenceId: string, title: string
): Promise<void> {
  const schema = tenantSchema(tenantId);
  try {
    const staleResult = await safeQuery(`
      INSERT INTO "${schema}".governance_action_items
        (title_en, title_ar, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
      VALUES
        ($1, $2, $3, 'medium', 'open', 'evidence', $4::uuid, FALSE, NOW(), NOW())
      RETURNING action_id
    `, [
      `Stale evidence: ${title}`,
      `أدلة منتهية الصلاحية: ${title}`,
      `Auto-generated governance action for expired evidence. Evidence: ${evidenceId}`,
      evidenceId,
    ]);
    const staleActionId = staleResult.rows[0]?.action_id;
    if (staleActionId) {
      await emitEvent(({
              tenantId, userId: SYSTEM_JOB_ACTOR, module: 'action_items', event: 'created',
              entityType: 'governance_action', entityId: String(staleActionId),
              data: { source_type: 'evidence', source_id: evidenceId, priority: 'medium' },
            } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
    }
  } catch (err: unknown) {
    logger.error(`[GovernanceHooks] Failed to create action from stale evidence: ${toErrorMessage(err)}`);
  }
}

// ── Event Subscription Registration ─────────────────────────────────────────

/**
 * Register all governance cross-module event subscriptions.
 * Call this during application startup.
 */
export async function registerGovernanceEventSubscriptions(): Promise<void> {
  try {

    const { eventBus } = await import('../../../../platform/services/event/event-bus.service.js');

    // Risk appetite breach → create governance action
    eventBus.subscribe('risk.exceeded_appetite', 'governance-hook-risk', async (event) => {
      if (!event.tenantId) return;
      const riskResult = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`
        INSERT INTO "${tenantSchema(event.tenantId)}".governance_action_items
          (title_en, description, priority, status, source_type, source_id, board_attention, created_at, updated_at)
        VALUES
          ($1, $2, 'high', 'open', 'risk', $3::uuid, TRUE, NOW(), NOW())
        RETURNING action_id
      `, [
        `Risk appetite breach: ${event.entityId || 'any'}`,
        `Auto-generated from risk appetite breach event. ${JSON.stringify(event.payload || {})}`,
        event.entityId || null,
      ]), { operation: 'fallback query' });
      const riskActionId = (riskResult as any)?.rows?.[0]?.action_id;
      if (riskActionId) {
        await emitEvent(({
                  tenantId: event.tenantId, userId: SYSTEM_JOB_ACTOR, module: 'action_items', event: 'created',
                  entityType: 'governance_action', entityId: String(riskActionId),
                  data: { source_type: 'risk', source_id: event.entityId, priority: 'high' },
                } as any)).catch(catchHandler(EC.EVENT_BUS, {}));
      }
    });

    // Critical audit finding → escalate to governance
    eventBus.subscribe('audit.finding_created', 'governance-hook-audit', async (event) => {
      if (!event.tenantId || !event.payload) return;
      const sev = event.payload.severity || event.payload.risk_level;
      if (sev === 'critical' || sev === 'high') {
        await escalateAuditFindingToGovernance(
          event.tenantId,
          String(event.payload.finding_id || event.entityId || ''),
          String(sev)
        );
      }
    });

    // Incident escalation → governance body
    eventBus.subscribe('incident.escalated', 'governance-hook-incident', async (event) => {
      if (!event.tenantId) return;
      await escalateIncidentToGovernanceBody(
        event.tenantId,
        String(event.payload?.incident_id || event.entityId || ''),
        String(event.payload?.severity || 'high')
      );
    });

    // Control failure → governance action
    eventBus.subscribe('control.failed', 'governance-hook-control', async (event) => {
      if (!event.tenantId) return;
      await createGovernanceActionFromControlFailure(
        event.tenantId,
        String(event.payload?.control_id || event.entityId || ''),
        String(event.payload?.severity || 'medium')
      );
    });

    // Evidence expired → governance action
    eventBus.subscribe('evidence.expired', 'governance-hook-evidence', async (event) => {
      if (!event.tenantId) return;
      await createGovernanceActionFromStaleEvidence(
        event.tenantId,
        String(event.payload?.evidence_id || event.entityId || ''),
        String(event.payload?.title || 'Unknown evidence')
      );
    });

    // Governance health recalculated → feed to Qiyas
    eventBus.subscribe(('governance.health_recalculated' as any), 'governance-hook-qiyas', async (event) => {
      if (!event.tenantId) return;
      try {
        const dimensions = await getGovernanceQiyasDimensions(event.tenantId);
        if (dimensions.length > 0) {
          eventBus.publish({
            eventType: 'qiyas.governance_dimensions_updated' as any,
            tenantId: event.tenantId,
            entityId: event.entityId || '',
            severity: 'info',
            payload: { dimensions },
          });
        }
      } catch { /* non-fatal */ }
    });

    eventBus.subscribe('security.vulnerability_detected', 'governance-hook-security', async (event) => {
      if (!event.tenantId) return;
      const sev = event.payload?.severity || 'medium';
      if (sev === 'critical' || sev === 'high') {
        await escalateSecurityEventToGovernance(
          event.tenantId,
          String(event.payload?.vulnerability_id || event.entityId || ''),
          'vulnerability_detected',
          String(sev),
          String(event.payload?.title || 'Security vulnerability')
        );
      }
    });

    eventBus.subscribe('ethics.report_created', 'governance-hook-ethics', async (event) => {
      if (!event.tenantId) return;
      const sev = event.payload?.severity || 'medium';
      if (sev === 'critical' || sev === 'high') {
        await escalateEthicsReportToGovernance(
          event.tenantId,
          String(event.payload?.report_id || event.entityId || ''),
          String(sev)
        );
      }
    });

    logger.info('[GovernanceHooks] 8 cross-module event subscriptions registered');
  } catch (err: unknown) {
    logger.error(`[GovernanceHooks] Failed to register event subscriptions: ${toErrorMessage(err)}`);
  }
}

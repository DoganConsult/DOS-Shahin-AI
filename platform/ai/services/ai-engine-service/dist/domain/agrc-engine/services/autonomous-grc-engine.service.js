// @ts-nocheck
import { logger } from '../ports/logger.port.js';
import { swallow, swallowDefault, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// Shahin — AGRC-OS Autonomous GRC Engine
// The proactive brain of AGRC-OS. Runs on schedule
// and actively hunts for issues BEFORE they become
// problems. This is what makes AGRC-OS self-driving:
//
//   1. Evidence Staleness Scanner
//   2. Policy Expiry Predictor
//   3. Vendor Contract Expiry Scanner
//   4. Risk Score Drift Detector
//   5. Compliance Posture Calculator
//   6. Control Effectiveness Analyzer
//   7. SLA Breach Predictor
//   8. Framework Coverage Gap Finder
//   9. Privacy Impact Scanner
//  10. Autonomous Remediation Generator
//  11. RACI Gap Scanner
//  12. RACI Expiry Scanner
//
// Runs every 30 minutes per tenant.
// Publishes cross-hub events that trigger the
// cross-hub-integration subscribers automatically.
// ============================================
import { emptyResult, safeQuery, tenantSchema } from '../ports/database.port.js';
import { eventBus } from '../ports/events.port.js';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service.js';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
// ── Circuit breaker ──────────────────────────────────────────────────────────
const activeCycles = new Set();
// ── Main Entry Point ─────────────────────────────────────────────────────────
export async function runAutonomousEngine(tenantId) {
    if (activeCycles.has(tenantId)) {
        return {
            tenantId, evidenceAlerts: 0, policyAlerts: 0, vendorAlerts: 0,
            riskDrifts: 0, complianceGaps: 0, controlIssues: 0, slaWarnings: 0,
            frameworkGaps: 0, privacyAlerts: 0, remediationsCreated: 0, bcpAlerts: 0,
            totalActionsGenerated: 0, cycleMs: 0, completedAt: new Date().toISOString(),
            warnings: ['Skipped: concurrent cycle already running'],
        };
    }
    activeCycles.add(tenantId);
    try {
        return await _runInternal(tenantId);
    }
    finally {
        activeCycles.delete(tenantId);
    }
}
async function _runInternal(tenantId) {
    const start = Date.now();
    const schema = tenantSchema(tenantId);
    const warnings = [];
    let evidenceAlerts = 0, policyAlerts = 0, vendorAlerts = 0, riskDrifts = 0, complianceGaps = 0, controlIssues = 0, slaWarnings = 0, frameworkGaps = 0, privacyAlerts = 0, remediationsCreated = 0;
    // ── 1. Evidence Staleness Scanner ──────────────────────────────────────────
    try {
        const staleEvidence = await safeQuery(`SELECT e.evidence_id, e.title, e.control_id, e.uploaded_at, e.expiry_date
       FROM "${schema}".evidence e
       WHERE (e.expiry_date IS NOT NULL AND e.expiry_date < NOW())
          OR (e.uploaded_at < NOW() - INTERVAL '90 days' AND e.expiry_date IS NULL)
       LIMIT 50`);
        for (const ev of staleEvidence.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'evidence.expired', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'evidence', entityId: ev.evidence_id,
                severity: 'warning',
                payload: { evidenceName: ev.title, controlId: ev.control_id, expiredAt: ev.expiry_date || ev.uploaded_at },
            }), { tenantId, operation: 'eventBus:evidence.expired' });
            evidenceAlerts++;
        }
    }
    catch (err) {
        warnings.push(`[1] Evidence scan: ${toErrorMessage(err)}`);
    }
    // ── 2. Policy Expiry Predictor ─────────────────────────────────────────────
    try {
        const expiringPolicies = await safeQuery(`SELECT policy_id, title, review_date, status
       FROM "${schema}".policies
       WHERE review_date IS NOT NULL
         AND review_date <= NOW() + INTERVAL '30 days'
         AND status = 'approved'
       LIMIT 50`);
        for (const pol of expiringPolicies.rows) {
            const isExpired = new Date(pol.review_date) < new Date();
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: isExpired ? 'policy.expired' : 'policy.review_due',
                tenantId, sourceService: 'autonomous-grc-engine',
                entityType: 'policy', entityId: pol.policy_id,
                severity: isExpired ? 'critical' : 'warning',
                payload: { policyTitle: pol.title, reviewDate: pol.review_date },
            }), { tenantId, operation: 'eventBus:policy.expired_or_review_due' });
            policyAlerts++;
        }
    }
    catch (err) {
        warnings.push(`[2] Policy scan: ${toErrorMessage(err)}`);
    }
    // ── 3. Vendor Contract Expiry Scanner ──────────────────────────────────────
    try {
        const expiringContracts = await safeQuery(`SELECT vendor_id, name, contract_end_date, risk_tier
       FROM "${schema}".vendors
       WHERE contract_end_date IS NOT NULL
         AND contract_end_date <= NOW() + INTERVAL '60 days'
         AND contract_end_date > NOW()
       LIMIT 50`);
        for (const v of expiringContracts.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'vendor.contract_expiring', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'vendor', entityId: v.vendor_id,
                severity: v.risk_tier === 'critical' ? 'critical' : 'warning',
                payload: { vendorName: v.name, expiryDate: v.contract_end_date, riskTier: v.risk_tier },
            }), { tenantId, operation: 'eventBus:vendor.contract_expiring' });
            vendorAlerts++;
        }
        // Also check vendor assessments that are overdue
        const overdueAssessments = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT vendor_id, name, last_assessment_date
       FROM "${schema}".vendors
       WHERE last_assessment_date IS NOT NULL
         AND last_assessment_date < NOW() - INTERVAL '365 days'
       LIMIT 50`), { tenantId: tenantId, operation: 'query vendors' });
        for (const v of overdueAssessments.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'vendor.assessment_due', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'vendor', entityId: v.vendor_id,
                severity: 'warning',
                payload: { vendorName: v.name, lastAssessment: v.last_assessment_date },
            }), { tenantId, operation: 'eventBus:vendor.assessment_due' });
            vendorAlerts++;
        }
    }
    catch (err) {
        warnings.push(`[3] Vendor scan: ${toErrorMessage(err)}`);
    }
    // ── 4. Risk Score Drift Detector ───────────────────────────────────────────
    try {
        const { checkRiskAgainstAppetite } = await import('../../governance/services/governance/governance-constitution.service.js');
        const risks = await safeQuery(`SELECT risk_id, title, category, risk_score, likelihood, impact, treatment_status, owner
       FROM "${schema}".risks
       WHERE risk_score IS NOT NULL
       ORDER BY risk_score DESC
       LIMIT 100`);
        for (const risk of risks.rows) {
            // Check against appetite
            const check = await swallowDefault(EC.FALLBACK_QUERY, { withinAppetite: true, maxAllowed: 999, requiredRole: '' }, checkRiskAgainstAppetite(tenantId, risk.category || 'operational', risk.risk_score), { tenantId: tenantId, operation: 'query risks' });
            if (!check.withinAppetite) {
                swallow(EC.AGENT_ACTION, eventBus.publish({
                    eventType: 'risk.exceeded_appetite', tenantId,
                    sourceService: 'autonomous-grc-engine',
                    entityType: 'risk', entityId: risk.risk_id,
                    severity: 'critical',
                    payload: {
                        riskName: risk.title, category: risk.category,
                        riskScore: risk.risk_score, maxScore: check.maxAllowed,
                    },
                }), { tenantId, operation: 'eventBus:risk.exceeded_appetite' });
                riskDrifts++;
            }
            // Check for untreated high risks
            if (risk.risk_score >= 15 && (!risk.treatment_status || risk.treatment_status === 'open')) {
                swallow(EC.AGENT_ACTION, eventBus.publish({
                    eventType: 'risk.mitigation_required', tenantId,
                    sourceService: 'autonomous-grc-engine',
                    entityType: 'risk', entityId: risk.risk_id,
                    severity: 'warning',
                    payload: { riskName: risk.title, score: risk.risk_score, treatment: risk.treatment_status },
                }), { tenantId, operation: 'eventBus:risk.mitigation_required' });
                riskDrifts++;
            }
        }
    }
    catch (err) {
        warnings.push(`[4] Risk drift scan: ${toErrorMessage(err)}`);
    }
    // ── 5. Compliance Posture Calculator ───────────────────────────────────────
    try {
        const controls = await safeQuery(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'implemented' OR status = 'effective')::int AS passing,
              COUNT(*) FILTER (WHERE status = 'not_started')::int AS not_started,
              COUNT(*) FILTER (WHERE status = 'failed' OR status = 'ineffective')::int AS failing
       FROM "${schema}".controls`);
        const { total, passing, not_started, failing } = getFirstRow(controls) || {};
        const posturePercent = total > 0 ? Math.round((passing / total) * 100) : 0;
        if (posturePercent < 70) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'compliance.posture_changed', tenantId,
                sourceService: 'autonomous-grc-engine', severity: 'warning',
                payload: { posturePercent, total, passing, notStarted: not_started, failing, reason: 'low_posture' },
            }), { tenantId, operation: 'eventBus:compliance.posture_changed' });
            complianceGaps++;
        }
        if (failing > 0) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'control.effectiveness_low', tenantId,
                sourceService: 'autonomous-grc-engine', severity: 'warning',
                payload: { failingControls: failing, total },
            }), { tenantId, operation: 'eventBus:control.effectiveness_low' });
            controlIssues += failing;
        }
    }
    catch (err) {
        warnings.push(`[5] Compliance posture scan: ${toErrorMessage(err)}`);
    }
    // ── 6. Control Effectiveness Analyzer ──────────────────────────────────────
    try {
        // Find controls with no evidence attached
        const noEvidence = await safeQuery(`SELECT c.control_id, c.title
       FROM "${schema}".controls c
       LEFT JOIN "${schema}".evidence e ON e.control_id = c.control_id
       WHERE c.status IN ('implemented', 'in_progress')
         AND e.evidence_id IS NULL
       LIMIT 50`);
        for (const ctrl of noEvidence.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'evidence.coverage_low', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'control', entityId: ctrl.control_id,
                severity: 'warning',
                payload: { controlName: ctrl.title, coverage: 0, threshold: 1, reason: 'no_evidence_attached' },
            }), { tenantId, operation: 'eventBus:evidence.coverage_low' });
            controlIssues++;
        }
    }
    catch (err) {
        warnings.push(`[6] Control effectiveness scan: ${toErrorMessage(err)}`);
    }
    // ── 7. SLA Breach Predictor ────────────────────────────────────────────────
    try {
        // Find tasks approaching their due date without progress
        const atRisk = await safeQuery(`SELECT task_id, title, due_date, status, assigned_to
       FROM "${schema}".remediation_tasks
       WHERE status IN ('todo', 'in_progress')
         AND due_date IS NOT NULL
         AND due_date <= NOW() + INTERVAL '3 days'
         AND due_date > NOW()
       LIMIT 50`);
        for (const task of atRisk.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'workflow.sla_breached', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'task', entityId: task.task_id,
                severity: 'warning',
                payload: { workflowTitle: task.title, dueDate: task.due_date, slaType: 'task_deadline', assignee: task.assigned_to },
            }), { tenantId, operation: 'eventBus:workflow.sla_breached' });
            slaWarnings++;
        }
        // Find already-overdue tasks
        const overdue = await safeQuery(`SELECT task_id, title, due_date, status, assigned_to
       FROM "${schema}".remediation_tasks
       WHERE status IN ('todo', 'in_progress')
         AND due_date IS NOT NULL
         AND due_date < NOW()
       LIMIT 50`);
        for (const task of overdue.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'workflow.sla_breached', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'task', entityId: task.task_id,
                severity: 'critical',
                payload: { workflowTitle: task.title, dueDate: task.due_date, slaType: 'task_overdue', assignee: task.assigned_to },
            }), { tenantId, operation: 'eventBus:workflow.sla_breached' });
            slaWarnings++;
        }
    }
    catch (err) {
        warnings.push(`[7] SLA breach scan: ${toErrorMessage(err)}`);
    }
    // ── 8. Framework Coverage Gap Finder ───────────────────────────────────────
    try {
        // Find frameworks with low control coverage
        const frameworks = await safeQuery(`SELECT f.framework_id, f.name,
              COUNT(DISTINCT m.control_id)::int AS mapped_controls,
              COUNT(DISTINCT r.requirement_id)::int AS total_requirements
       FROM "${schema}".frameworks f
       LEFT JOIN "${schema}".control_mappings m ON m.framework_id = f.framework_id
       LEFT JOIN "${schema}".framework_requirements r ON r.framework_id = f.framework_id
       GROUP BY f.framework_id, f.name
       HAVING COUNT(DISTINCT r.requirement_id) > 0`);
        for (const fw of frameworks.rows) {
            const coverage = fw.total_requirements > 0
                ? Math.round((fw.mapped_controls / fw.total_requirements) * 100)
                : 0;
            if (coverage < 80) {
                swallow(EC.AGENT_ACTION, eventBus.publish({
                    eventType: 'framework.gap_identified', tenantId,
                    sourceService: 'autonomous-grc-engine',
                    entityType: 'framework', entityId: fw.framework_id,
                    severity: coverage < 50 ? 'critical' : 'warning',
                    payload: { frameworkName: fw.name, coverage, mappedControls: fw.mapped_controls, totalRequirements: fw.total_requirements },
                }), { tenantId, operation: 'eventBus:framework.gap_identified' });
                frameworkGaps++;
            }
        }
    }
    catch (err) {
        warnings.push(`[8] Framework coverage scan: ${toErrorMessage(err)}`);
    }
    // ── 9. Privacy Impact Scanner ──────────────────────────────────────────────
    try {
        const highImpact = await safeQuery(`SELECT processing_id, activity_name, data_categories, impact_level
       FROM "${schema}".processing_activities
       WHERE impact_level IN ('high', 'critical')
         AND dpia_completed IS NOT TRUE
       LIMIT 20`);
        for (const pa of highImpact.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'privacy.impact_high', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'privacy', entityId: pa.processing_id,
                severity: 'warning',
                payload: { processingActivity: pa.activity_name, impactLevel: pa.impact_level, categories: pa.data_categories },
            }), { tenantId, operation: 'eventBus:privacy.impact_high' });
            privacyAlerts++;
        }
    }
    catch (err) {
        warnings.push(`[9] Privacy scan: ${toErrorMessage(err)}`);
    }
    // ── 10. Autonomous Remediation Generator ───────────────────────────────────
    try {
        // Find open incidents older than 7 days without linked tasks
        const staleIncidents = await safeQuery(`SELECT i.incident_id, i.title, i.severity, i.created_at
       FROM "${schema}".incidents i
       LEFT JOIN "${schema}".remediation_tasks t
         ON t.linked_entity_type = 'incident' AND t.linked_entity_id = i.incident_id::text
       WHERE i.status = 'open'
         AND i.created_at < NOW() - INTERVAL '7 days'
         AND t.task_id IS NULL
       LIMIT 20`);
        for (const inc of staleIncidents.rows) {
            try {
                const { createTask } = await import('../../workflow/services/tasks/task-board.service.js');
                await createTask(tenantId, {
                    title: `[Auto-Remediation] Unresolved incident: ${inc.title}`,
                    description: `Incident "${inc.title}" has been open for >7 days with no remediation task. AGRC-OS auto-created this task.`,
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    entityType: 'incident', entityId: inc.incident_id,
                });
                remediationsCreated++;
            }
            catch { /* best effort */ }
        }
        // Find audit findings with no remediation tasks
        const unlinkedFindings = await swallowDefault(EC.FALLBACK_QUERY, emptyResult(), safeQuery(`SELECT ai.item_id, ai.assessment_id, ai.control_node_id, ai.status
       FROM "${schema}".assessment_items ai
       WHERE ai.status IN ('non_compliant', 'partially_compliant')
       LIMIT 20`), { tenantId: tenantId, operation: 'query assessment_items' });
        for (const finding of unlinkedFindings.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'audit.remediation_due', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'assessment_item', entityId: finding.item_id,
                severity: 'warning',
                payload: { findingTitle: `Assessment finding ${finding.item_id}`, status: finding.status },
            }), { tenantId, operation: 'eventBus:audit.remediation_due' });
            remediationsCreated++;
        }
    }
    catch (err) {
        warnings.push(`[10] Remediation scan: ${toErrorMessage(err)}`);
    }
    // ── 11. RACI Gap Scanner — detect entities missing R/A/user/team owners ──
    let raciGaps = 0;
    try {
        const gapView = await safeQuery(`SELECT entity_type, entity_id, has_responsible, has_accountable, has_user_owner, has_team_owner
       FROM "${schema}".grc_raci_gaps
       WHERE has_responsible = FALSE OR has_accountable = FALSE
          OR has_user_owner = FALSE OR has_team_owner = FALSE
       LIMIT 50`);
        for (const gap of gapView.rows) {
            const missing = [];
            if (!gap.has_responsible)
                missing.push('responsible');
            if (!gap.has_accountable)
                missing.push('accountable');
            if (!gap.has_user_owner)
                missing.push('user_owner');
            if (!gap.has_team_owner)
                missing.push('team_owner');
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'raci.gap_detected', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: gap.entity_type, entityId: gap.entity_id,
                severity: !gap.has_responsible || !gap.has_accountable ? 'critical' : 'warning',
                payload: { missingRoles: missing, entityType: gap.entity_type },
            }), { tenantId, operation: 'eventBus:raci.gap_detected' });
            raciGaps++;
        }
        if (raciGaps > 0) {
            try {
                const { createTask } = await import('../../workflow/services/tasks/task-board.service.js');
                await createTask(tenantId, {
                    title: `[Auto] ${raciGaps} GRC entities missing RACI ownership`,
                    description: `AGRC-OS detected ${raciGaps} controls/risks/evidence items missing responsible, accountable, user, or team owners. Review at /grc-raci/gaps.`,
                    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
                    entityType: 'raci_gap', entityId: tenantId,
                });
            }
            catch { /* best effort */ }
        }
    }
    catch (err) {
        warnings.push(`[11] RACI gap scan: ${toErrorMessage(err)}`);
    }
    // ── 12. RACI Expiry Scanner — detect assignments expiring within 30 days ──
    let raciExpiryAlerts = 0;
    try {
        const expiring = await safeQuery(`SELECT assignment_id, entity_type, entity_id, raci_role, effective_to, user_id, team_id
       FROM "${schema}".grc_raci_assignments
       WHERE is_active = TRUE AND deleted_at IS NULL
         AND effective_to IS NOT NULL
         AND effective_to BETWEEN NOW() AND NOW() + INTERVAL '30 days'
       LIMIT 50`);
        for (const row of expiring.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'raci.renewal_due', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: row.entity_type, entityId: row.entity_id,
                severity: 'warning',
                payload: {
                    assignmentId: row.assignment_id,
                    raciRole: row.raci_role,
                    expiresAt: row.effective_to,
                    userId: row.user_id,
                    teamId: row.team_id,
                },
            }), { tenantId, operation: 'eventBus:raci.renewal_due' });
            raciExpiryAlerts++;
        }
        const expired = await safeQuery(`UPDATE "${schema}".grc_raci_assignments
       SET is_active = FALSE, updated_at = NOW()
       WHERE is_active = TRUE AND deleted_at IS NULL
         AND effective_to IS NOT NULL AND effective_to < NOW()
       RETURNING assignment_id, entity_type, entity_id`);
        if (expired.rows.length > 0) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'raci.expired', tenantId,
                sourceService: 'autonomous-grc-engine',
                severity: 'warning',
                payload: { expiredCount: expired.rows.length, assignments: expired.rows.slice(0, 10) },
            }), { tenantId, operation: 'eventBus:raci.expired' });
            raciExpiryAlerts += expired.rows.length;
        }
    }
    catch (err) {
        warnings.push(`[12] RACI expiry scan: ${toErrorMessage(err)}`);
    }
    // ── 13. GRC Integrity Guard — enforce no orphaned artifacts ──────────────
    try {
        const { runIntegrityGuard } = await import('./grc-integrity-guard.service.js');
        const integrityResult = await runIntegrityGuard(tenantId);
        if (integrityResult.totalFixed > 0) {
            remediationsCreated += integrityResult.totalFixed;
        }
    }
    catch (err) {
        warnings.push(`[11] Integrity guard: ${toErrorMessage(err)}`);
    }
    // ── 14. Incident SLA Health Scanner ──────────────────────────────────────
    let incidentSlaAlerts = 0;
    try {
        const slaResult = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".incidents
       WHERE status IN ('open','investigating','contained')
         AND sla_deadline IS NOT NULL AND sla_deadline < NOW()
         AND (sla_status IS NULL OR sla_status != 'breached')`);
        incidentSlaAlerts = getFirstRow(slaResult)?.cnt || 0;
        if (incidentSlaAlerts > 0) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'incident.sla_breached', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'incident', entityId: tenantId,
                severity: 'critical',
                payload: { breachedCount: incidentSlaAlerts },
            }), { tenantId, operation: 'eventBus:incident.sla_breached' });
        }
    }
    catch (err) {
        warnings.push(`[14] Incident SLA scan: ${toErrorMessage(err)}`);
    }
    // ── 15. BCP Plan Staleness Scanner ─────────────────────────────────────
    let bcpStaleAlerts = 0;
    try {
        const stale = await safeQuery(`SELECT bcp_id, title FROM "${schema}".bcp_plans
       WHERE status = 'approved'
         AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '180 days')
         AND deleted_at IS NULL
       LIMIT 50`);
        bcpStaleAlerts = stale.rows.length;
        for (const plan of stale.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'bcp.plan_stale', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'bcp_plan', entityId: plan.bcp_id,
                severity: 'warning',
                payload: { title: plan.title },
            }), { tenantId, operation: 'eventBus:bcp.plan_stale' });
        }
    }
    catch (err) {
        warnings.push(`[15] BCP staleness scan: ${toErrorMessage(err)}`);
    }
    // ── 16. Vendor Review Overdue Scanner ──────────────────────────────────
    let vendorReviewOverdue = 0;
    try {
        const overdue = await safeQuery(`SELECT vendor_id, name FROM "${schema}".vendors
       WHERE status = 'active'
         AND (next_review_date IS NOT NULL AND next_review_date < NOW())
         AND deleted_at IS NULL
       LIMIT 50`);
        vendorReviewOverdue = overdue.rows.length;
        for (const v of overdue.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'vendor.assessment_due', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'vendor', entityId: v.vendor_id,
                severity: 'warning',
                payload: { name: v.name },
            }), { tenantId, operation: 'eventBus:vendor.assessment_due' });
        }
    }
    catch (err) {
        warnings.push(`[16] Vendor review overdue scan: ${toErrorMessage(err)}`);
    }
    // ── 17. Training Compliance Gap Scanner ────────────────────────────────
    let trainingGaps = 0;
    try {
        const overdue = await safeQuery(`SELECT COUNT(*)::int AS cnt FROM "${schema}".training_assignments
       WHERE status IN ('assigned','in_progress') AND due_date < NOW()`);
        trainingGaps = getFirstRow(overdue)?.cnt || 0;
        if (trainingGaps > 0) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'training.compliance_gap', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'training', entityId: tenantId,
                severity: trainingGaps > 10 ? 'critical' : 'warning',
                payload: { overdueCount: trainingGaps },
            }), { tenantId, operation: 'eventBus:training.compliance_gap' });
        }
    }
    catch (err) {
        warnings.push(`[17] Training compliance gap scan: ${toErrorMessage(err)}`);
    }
    // ── 18. BCP Exercise Overdue Scanner ──────────────────────────────────────
    let bcpExerciseOverdue = 0;
    try {
        const overdue = await safeQuery(`SELECT e.exercise_id, e.title, e.bcp_plan_id, e.scheduled_date
       FROM "${schema}".bcp_exercises e
       WHERE e.status IN ('planned','scheduled')
         AND e.scheduled_date < NOW()
         AND e.deleted_at IS NULL
       LIMIT 50`);
        bcpExerciseOverdue = overdue.rows.length;
        for (const ex of overdue.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'bcp.exercise_overdue', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'bcp_exercise', entityId: ex.exercise_id,
                severity: 'warning',
                payload: { title: ex.title, planId: ex.bcp_plan_id, scheduledDate: ex.scheduled_date },
            }), { tenantId, operation: 'eventBus:bcp.exercise_overdue' });
        }
    }
    catch (err) {
        warnings.push(`[18] BCP exercise overdue scan: ${toErrorMessage(err)}`);
    }
    // ── 19. BCP RTO/RPO Drift Scanner ──────────────────────────────────────
    let bcpRtoDriftAlerts = 0;
    try {
        const drifts = await safeQuery(`SELECT er.result_id, er.exercise_id, er.rto_actual_hours, er.rpo_actual_hours,
              rs.target_rto_hours, rs.target_rpo_hours, rs.title AS strategy_title
       FROM "${schema}".bcp_exercise_results er
       JOIN "${schema}".bcp_exercises ex ON ex.exercise_id = er.exercise_id
       JOIN "${schema}".bcm_recovery_strategies rs ON rs.bcp_plan_id = ex.bcp_plan_id
       WHERE ex.status = 'completed' AND ex.deleted_at IS NULL AND rs.deleted_at IS NULL
         AND (er.rto_actual_hours > rs.target_rto_hours * 1.2
              OR er.rpo_actual_hours > rs.target_rpo_hours * 1.2)
       ORDER BY ex.updated_at DESC LIMIT 50`);
        bcpRtoDriftAlerts = drifts.rows.length;
        for (const d of drifts.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'bcp.rto_rpo_drift', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'bcp_exercise', entityId: d.exercise_id,
                severity: 'critical',
                payload: {
                    strategy: d.strategy_title,
                    targetRto: d.target_rto_hours, actualRto: d.rto_actual_hours,
                    targetRpo: d.target_rpo_hours, actualRpo: d.rpo_actual_hours,
                },
            }), { tenantId, operation: 'eventBus:bcp.rto_rpo_drift' });
        }
    }
    catch (err) {
        warnings.push(`[19] BCP RTO/RPO drift scan: ${toErrorMessage(err)}`);
    }
    // ── 20. BCP Dependency Health Scanner ───────────────────────────────────
    let bcpDependencyAlerts = 0;
    try {
        const staleNodes = await safeQuery(`SELECT n.node_id, n.node_name, n.criticality, m.title AS map_title
       FROM "${schema}".bcm_dependency_nodes n
       JOIN "${schema}".bcm_dependency_maps m ON m.map_id = n.map_id
       WHERE n.criticality IN ('high','critical')
         AND m.deleted_at IS NULL
         AND (m.last_reviewed_at IS NULL OR m.last_reviewed_at < NOW() - INTERVAL '180 days')
       LIMIT 50`);
        bcpDependencyAlerts = staleNodes.rows.length;
        for (const node of staleNodes.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'bcp.dependency_critical', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'bcm_dependency', entityId: node.node_id,
                severity: node.criticality === 'critical' ? 'critical' : 'warning',
                payload: { nodeName: node.node_name, criticality: node.criticality, mapTitle: node.map_title },
            }), { tenantId, operation: 'eventBus:bcp.dependency_critical' });
        }
    }
    catch (err) {
        warnings.push(`[20] BCP dependency health scan: ${toErrorMessage(err)}`);
    }
    // ── 21. BCP Crisis Readiness Scanner ───────────────────────────────────
    let bcpCrisisAlerts = 0;
    try {
        const staleComms = await safeQuery(`SELECT plan_id, title, last_reviewed_at, status
       FROM "${schema}".crisis_comm_plans
       WHERE status = 'active' AND deleted_at IS NULL
         AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '365 days')
       LIMIT 50`);
        bcpCrisisAlerts = staleComms.rows.length;
        for (const cc of staleComms.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'bcp.crisis_readiness_low', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'crisis_comm_plan', entityId: cc.plan_id,
                severity: 'warning',
                payload: { title: cc.title, lastReviewed: cc.last_reviewed_at },
            }), { tenantId, operation: 'eventBus:bcp.crisis_readiness_low' });
        }
    }
    catch (err) {
        warnings.push(`[21] BCP crisis readiness scan: ${toErrorMessage(err)}`);
    }
    // ── 22. BCP BIA Currency Scanner ───────────────────────────────────────
    let bcpBiaAlerts = 0;
    try {
        const staleBia = await safeQuery(`SELECT bia_id, title, created_at, criticality_rating
       FROM "${schema}".bia_assessments
       WHERE status = 'approved' AND deleted_at IS NULL
         AND created_at < NOW() - INTERVAL '365 days'
       LIMIT 50`);
        bcpBiaAlerts = staleBia.rows.length;
        for (const bia of staleBia.rows) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'bcp.bia_stale', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'bia_assessment', entityId: bia.bia_id,
                severity: bia.criticality_rating === 'critical' ? 'critical' : 'warning',
                payload: { title: bia.title, createdAt: bia.created_at, criticality: bia.criticality_rating },
            }), { tenantId, operation: 'eventBus:bcp.bia_stale' });
        }
    }
    catch (err) {
        warnings.push(`[22] BCP BIA currency scan: ${toErrorMessage(err)}`);
    }
    // ── 23. BCP Maturity Regression Scanner ────────────────────────────────
    let bcpMaturityRegression = 0;
    try {
        const maturity = await safeQuery(`SELECT assessment_id, overall_score, assessment_date
       FROM "${schema}".bcm_maturity_assessments
       WHERE deleted_at IS NULL
       ORDER BY assessment_date DESC LIMIT 2`);
        if (maturity.rows.length >= 2) {
            const current = Number(getFirstRow(maturity)?.overall_score);
            const previous = Number(maturity.rows[1].overall_score);
            if (current < previous) {
                bcpMaturityRegression = 1;
                swallow(EC.AGENT_ACTION, eventBus.publish({
                    eventType: 'bcp.maturity_regression', tenantId,
                    sourceService: 'autonomous-grc-engine',
                    entityType: 'bcm_maturity', entityId: getFirstRow(maturity)?.assessment_id,
                    severity: 'critical',
                    payload: { currentScore: current, previousScore: previous, drop: previous - current },
                }), { tenantId, operation: 'eventBus:bcp.maturity_regression' });
            }
        }
    }
    catch (err) {
        warnings.push(`[23] BCP maturity regression scan: ${toErrorMessage(err)}`);
    }
    // ── 24. BCP Single Point of Failure Scanner ─────────────────────────────
    let bcpSpofAlerts = 0;
    try {
        const { detectSinglePointsOfFailure } = await import('../../bcp/services/bcm-advanced.service.js');
        const spofs = await detectSinglePointsOfFailure(tenantId);
        bcpSpofAlerts = spofs.filter((s) => s.risk === 'critical' || s.risk === 'high').length;
        for (const spof of spofs.filter((s) => s.risk === 'critical')) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'bcp.dependency_critical', tenantId,
                sourceService: 'autonomous-grc-engine',
                entityType: 'bcm_dependency', entityId: spof.nodeId,
                severity: 'critical',
                payload: {
                    nodeName: spof.nodeName, nodeType: spof.nodeType,
                    mapTitle: spof.mapTitle, risk: spof.risk,
                    recommendation: spof.recommendation,
                    isSinglePointOfFailure: true,
                },
            }), { tenantId, operation: 'eventBus:bcp.dependency_critical' });
        }
    }
    catch (err) {
        warnings.push(`[24] BCP SPOF scan: ${toErrorMessage(err)}`);
    }
    // ── Finalize ───────────────────────────────────────────────────────────────
    const bcpAlerts = bcpStaleAlerts + bcpExerciseOverdue + bcpRtoDriftAlerts +
        bcpDependencyAlerts + bcpCrisisAlerts + bcpBiaAlerts + bcpMaturityRegression + bcpSpofAlerts;
    const totalActionsGenerated = evidenceAlerts + policyAlerts + vendorAlerts +
        riskDrifts + complianceGaps + controlIssues + slaWarnings +
        frameworkGaps + privacyAlerts + remediationsCreated + raciGaps + raciExpiryAlerts +
        incidentSlaAlerts + bcpAlerts + vendorReviewOverdue + trainingGaps;
    const cycleMs = Date.now() - start;
    // Log to audit trail
    swallow(EC.AGENT_ACTION, recordAudit({
        tenantId, userId: 'agrc-os', module: 'autonomous_engine', action: 'update',
        entityType: 'autonomous_grc_cycle', entityId: tenantId,
        afterState: {
            evidenceAlerts, policyAlerts, vendorAlerts, riskDrifts,
            complianceGaps, controlIssues, slaWarnings, frameworkGaps,
            privacyAlerts, remediationsCreated, bcpAlerts, totalActionsGenerated, cycleMs,
        },
    }), { tenantId, operation: 'recordAudit:autonomous_grc_cycle' });
    // Persist cycle result
    await logCycleResult(schema, {
        evidenceAlerts, policyAlerts, vendorAlerts, riskDrifts,
        complianceGaps, controlIssues, slaWarnings, frameworkGaps,
        privacyAlerts, remediationsCreated, totalActionsGenerated, cycleMs, warnings,
    });
    if (totalActionsGenerated > 0) {
        logger.info(`[AGRC-OS Autonomous] tenant ${tenantId}: ${totalActionsGenerated} actions generated in ${cycleMs}ms`);
    }
    return {
        tenantId, evidenceAlerts, policyAlerts, vendorAlerts, riskDrifts,
        complianceGaps, controlIssues, slaWarnings, frameworkGaps,
        privacyAlerts, remediationsCreated, bcpAlerts, totalActionsGenerated, cycleMs,
        completedAt: new Date().toISOString(), warnings,
    };
}
// ── Cycle Log Persistence ────────────────────────────────────────────────────
async function logCycleResult(schema, data) {
    try {
        await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".autonomous_engine_log (
        log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        evidence_alerts INT DEFAULT 0,
        policy_alerts INT DEFAULT 0,
        vendor_alerts INT DEFAULT 0,
        risk_drifts INT DEFAULT 0,
        compliance_gaps INT DEFAULT 0,
        control_issues INT DEFAULT 0,
        sla_warnings INT DEFAULT 0,
        framework_gaps INT DEFAULT 0,
        privacy_alerts INT DEFAULT 0,
        remediations_created INT DEFAULT 0,
        total_actions INT DEFAULT 0,
        cycle_ms INT DEFAULT 0,
        warnings JSONB DEFAULT '[]',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `); // DDL table creation is best-effort; outer try/catch handles failure
        await safeQuery(`INSERT INTO "${schema}".autonomous_engine_log
       (evidence_alerts, policy_alerts, vendor_alerts, risk_drifts, compliance_gaps,
        control_issues, sla_warnings, framework_gaps, privacy_alerts, remediations_created,
        total_actions, cycle_ms, warnings)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [
            data.evidenceAlerts, data.policyAlerts, data.vendorAlerts, data.riskDrifts,
            data.complianceGaps, data.controlIssues, data.slaWarnings, data.frameworkGaps,
            data.privacyAlerts, data.remediationsCreated, data.totalActionsGenerated,
            data.cycleMs, JSON.stringify(data.warnings || []),
        ]);
    }
    catch { /* best effort */ }
}
// ── Status & History ─────────────────────────────────────────────────────────
export async function getAutonomousEngineStatus(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        const latest = await safeQuery(`SELECT * FROM "${schema}".autonomous_engine_log ORDER BY created_at DESC LIMIT 1`);
        const last24h = await safeQuery(`SELECT SUM(total_actions)::int AS total_actions_24h,
              SUM(evidence_alerts)::int AS evidence_24h,
              SUM(remediations_created)::int AS remediations_24h,
              COUNT(*)::int AS cycles_24h
       FROM "${schema}".autonomous_engine_log
       WHERE created_at >= NOW() - INTERVAL '24 hours'`);
        return {
            lastCycle: getFirstRow(latest) || null,
            summary24h: getFirstRow(last24h) || null,
            engineStatus: 'active',
        };
    }
    catch {
        return { lastCycle: null, summary24h: null, engineStatus: 'not_initialized' };
    }
}
export async function getAutonomousEngineHistory(tenantId, limit = 50) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".autonomous_engine_log ORDER BY created_at DESC LIMIT $1`, [limit]);
        return result.rows;
    }
    catch {
        return [];
    }
}
//# sourceMappingURL=autonomous-grc-engine.service.js.map
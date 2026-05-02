// @ts-nocheck
import { logger } from '../ports/logger.port.js';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// Shahin — GRC Integrity Guard
// Enforces structural rules across all hubs:
//   1. No controls without a parent policy
//   2. No policies without linked frameworks
//   3. No risks without a category
//   4. No evidence without a linked control
//   5. No incidents left open > 30 days without tasks
//   6. No audit findings without remediation plans
//   7. No GRC entities without RACI ownership (auto-assign from distribution tables)
//
// Runs as part of the Autonomous GRC Engine.
// Auto-fixes orphaned artifacts by linking them
// to the correct parent or creating missing links.
// Publishes events for every fix so cross-hub
// integration reacts.
// ============================================
import { safeQuery, tenantSchema } from '../ports/database.port.js';
import { eventBus } from '../ports/events.port.js';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service.js';
import { getFirstRow } from '@dos/db';
export async function runIntegrityGuard(tenantId) {
    const start = Date.now();
    const schema = tenantSchema(tenantId);
    let controlsFixed = 0, policiesFixed = 0, risksFixed = 0;
    let evidenceFixed = 0, incidentsFixed = 0, findingsFixed = 0, raciFixed = 0;
    const unfixable = [];
    // ── 1. Controls without a parent policy ────────────────────────────────────
    try {
        const orphanControls = await safeQuery(`SELECT c.control_id, c.title
       FROM "${schema}".controls c
       WHERE c.policy_id IS NULL
       LIMIT 100`);
        if (orphanControls.rows.length > 0) {
            // Find the default policy (Information Security Policy, or first available)
            const defaultPolicy = await safeQuery(`SELECT policy_id, title FROM "${schema}".policies
         WHERE title ILIKE '%information security%' OR title ILIKE '%security policy%'
         ORDER BY created_at ASC LIMIT 1`);
            const fallbackPolicy = getFirstRow(defaultPolicy) || getFirstRow((await safeQuery(`SELECT policy_id, title FROM "${schema}".policies ORDER BY created_at ASC LIMIT 1`)));
            if (fallbackPolicy) {
                for (const ctrl of orphanControls.rows) {
                    await safeQuery(`UPDATE "${schema}".controls SET policy_id = $1 WHERE control_id = $2`, [fallbackPolicy.policy_id, ctrl.control_id]);
                    swallow(EC.AGENT_ACTION, eventBus.publish({
                        eventType: 'control.state_changed', tenantId,
                        sourceService: 'grc-integrity-guard',
                        entityType: 'control', entityId: ctrl.control_id,
                        severity: 'info',
                        payload: {
                            fix: 'orphan_control_linked',
                            controlTitle: ctrl.title,
                            linkedToPolicyId: fallbackPolicy.policy_id,
                            linkedToPolicyTitle: fallbackPolicy.title,
                        },
                    }), { tenantId, operation: 'eventBus:control.state_changed' });
                    controlsFixed++;
                }
            }
            else {
                unfixable.push(`${orphanControls.rows.length} controls have no policy and no policies exist to link them to`);
            }
        }
    }
    catch { /* controls table may not exist */ }
    // ── 2. Policies without linked frameworks ──────────────────────────────────
    try {
        const orphanPolicies = await safeQuery(`SELECT p.policy_id, p.title
       FROM "${schema}".policies p
       WHERE p.frameworks IS NULL OR p.frameworks = '{}' OR p.frameworks = '[]'
       LIMIT 100`);
        if (orphanPolicies.rows.length > 0) {
            // Get all framework IDs
            const frameworks = await safeQuery(`SELECT framework_id FROM "${schema}".frameworks LIMIT 20`);
            const fwIds = frameworks.rows.map((f) => f.framework_id);
            if (fwIds.length > 0) {
                for (const pol of orphanPolicies.rows) {
                    await safeQuery(`UPDATE "${schema}".policies SET frameworks = $1 WHERE policy_id = $2`, [fwIds, pol.policy_id]);
                    swallow(EC.AGENT_ACTION, eventBus.publish({
                        eventType: 'policy.approved', tenantId,
                        sourceService: 'grc-integrity-guard',
                        entityType: 'policy', entityId: pol.policy_id,
                        severity: 'info',
                        payload: {
                            fix: 'orphan_policy_linked',
                            policyTitle: pol.title,
                            linkedToFrameworks: fwIds,
                        },
                    }), { tenantId, operation: 'eventBus:policy.approved' });
                    policiesFixed++;
                }
            }
            else {
                unfixable.push(`${orphanPolicies.rows.length} policies have no frameworks and no frameworks exist`);
            }
        }
    }
    catch { /* policies table may not exist */ }
    // ── 3. Risks without a category ────────────────────────────────────────────
    try {
        const uncategorized = await safeQuery(`SELECT risk_id, title FROM "${schema}".risks
       WHERE category IS NULL OR category = ''
       LIMIT 100`);
        for (const risk of uncategorized.rows) {
            await safeQuery(`UPDATE "${schema}".risks SET category = 'operational' WHERE risk_id = $1`, [risk.risk_id]);
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'risk.score_changed', tenantId,
                sourceService: 'grc-integrity-guard',
                entityType: 'risk', entityId: risk.risk_id,
                severity: 'info',
                payload: { fix: 'risk_category_assigned', riskTitle: risk.title, category: 'operational' },
            }), { tenantId, operation: 'eventBus:risk.score_changed' });
            risksFixed++;
        }
    }
    catch { /* risks table may not exist */ }
    // ── 4. Evidence without a linked control ───────────────────────────────────
    try {
        const orphanEvidence = await safeQuery(`SELECT e.evidence_id, e.title
       FROM "${schema}".evidence e
       WHERE e.control_id IS NULL
       LIMIT 50`);
        if (orphanEvidence.rows.length > 0) {
            // Find a general control to link orphan evidence to
            const generalControl = await safeQuery(`SELECT control_id FROM "${schema}".controls ORDER BY created_at ASC LIMIT 1`);
            if (getFirstRow(generalControl)) {
                for (const ev of orphanEvidence.rows) {
                    await safeQuery(`UPDATE "${schema}".evidence SET control_id = $1 WHERE evidence_id = $2`, [getFirstRow(generalControl)?.control_id, ev.evidence_id]);
                    evidenceFixed++;
                }
                swallow(EC.AGENT_ACTION, eventBus.publish({
                    eventType: 'evidence.uploaded', tenantId,
                    sourceService: 'grc-integrity-guard', severity: 'info',
                    payload: { fix: 'orphan_evidence_linked', count: evidenceFixed },
                }), { tenantId, operation: 'eventBus:evidence.uploaded' });
            }
            else {
                unfixable.push(`${orphanEvidence.rows.length} evidence items have no control and no controls exist`);
            }
        }
    }
    catch { /* evidence table may not exist */ }
    // ── 5. Open incidents > 30 days without remediation tasks ──────────────────
    try {
        const staleIncidents = await safeQuery(`SELECT i.incident_id, i.title, i.severity
       FROM "${schema}".incidents i
       LEFT JOIN "${schema}".remediation_tasks t
         ON t.linked_entity_type = 'incident' AND t.linked_entity_id = i.incident_id::text
       WHERE i.status = 'open'
         AND i.created_at < NOW() - INTERVAL '30 days'
         AND t.task_id IS NULL
       LIMIT 20`);
        for (const inc of staleIncidents.rows) {
            try {
                const { createTask } = await import('../../workflow/services/tasks/task-board.service.js');
                await createTask(tenantId, {
                    title: `[Integrity] Unresolved incident: ${inc.title}`,
                    description: `Incident "${inc.title}" has been open >30 days with no remediation task. Auto-created by GRC Integrity Guard.`,
                    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    entityType: 'incident',
                    entityId: inc.incident_id,
                });
                incidentsFixed++;
            }
            catch { /* dedup or table issue */ }
        }
    }
    catch { /* incidents table may not exist */ }
    // ── 6. Non-compliant assessment items without remediation ──────────────────
    try {
        const unlinkedFindings = await safeQuery(`SELECT ai.item_id, ai.control_node_id, ai.status
       FROM "${schema}".assessment_items ai
       LEFT JOIN "${schema}".remediation_tasks t
         ON t.linked_entity_type = 'assessment_item' AND t.linked_entity_id = ai.item_id::text
       WHERE ai.status IN ('non_compliant', 'partially_compliant')
         AND t.task_id IS NULL
       LIMIT 20`);
        for (const finding of unlinkedFindings.rows) {
            try {
                const { createTask } = await import('../../workflow/services/tasks/task-board.service.js');
                await createTask(tenantId, {
                    title: `[Integrity] Remediate finding: ${finding.item_id}`,
                    description: `Assessment finding ${finding.item_id} is ${finding.status} with no remediation task. Auto-created by GRC Integrity Guard.`,
                    dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(),
                    entityType: 'assessment_item',
                    entityId: finding.item_id,
                });
                findingsFixed++;
            }
            catch { /* dedup or table issue */ }
        }
    }
    catch { /* assessment_items table may not exist */ }
    // ── 7. GRC entities without RACI ownership — auto-assign from distribution ─
    try {
        const unownedControls = await safeQuery(`SELECT c.control_id FROM "${schema}".controls c
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".grc_raci_assignments gra
         WHERE gra.entity_type = 'control' AND gra.entity_id = c.control_id::text
           AND gra.is_active = TRUE AND gra.deleted_at IS NULL
       )
       LIMIT 50`);
        if (unownedControls.rows.length > 0) {
            const dist = await safeQuery(`SELECT DISTINCT td.team_code, td.raci_role, t.team_id
         FROM "${schema}".control_team_distribution td
         JOIN "${schema}".teams t ON t.team_code = td.team_code
         WHERE td.raci_role IN ('responsible', 'accountable')
         LIMIT 3`);
            for (const ctrl of unownedControls.rows) {
                for (const d of dist.rows) {
                    await safeQuery(`INSERT INTO "${schema}".grc_raci_assignments
               (entity_type, entity_id, team_id, raci_role, assignment_source)
             VALUES ('control', $1, $2, $3, 'auto_provision')
             ON CONFLICT DO NOTHING`, [ctrl.control_id, d.team_id, d.raci_role]);
                }
                raciFixed++;
            }
        }
        const unownedRisks = await safeQuery(`SELECT r.risk_id FROM "${schema}".risks r
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".grc_raci_assignments gra
         WHERE gra.entity_type = 'risk' AND gra.entity_id = r.risk_id::text
           AND gra.is_active = TRUE AND gra.deleted_at IS NULL
       )
       LIMIT 50`);
        if (unownedRisks.rows.length > 0) {
            const dist = await safeQuery(`SELECT DISTINCT td.team_code, td.raci_role, t.team_id
         FROM "${schema}".risk_team_distribution td
         JOIN "${schema}".teams t ON t.team_code = td.team_code
         WHERE td.raci_role IN ('responsible', 'accountable')
         LIMIT 3`);
            for (const risk of unownedRisks.rows) {
                for (const d of dist.rows) {
                    await safeQuery(`INSERT INTO "${schema}".grc_raci_assignments
               (entity_type, entity_id, team_id, raci_role, assignment_source)
             VALUES ('risk', $1, $2, $3, 'auto_provision')
             ON CONFLICT DO NOTHING`, [risk.risk_id, d.team_id, d.raci_role]);
                }
                raciFixed++;
            }
        }
        const unownedEvidence = await safeQuery(`SELECT e.evidence_id FROM "${schema}".evidence e
       WHERE NOT EXISTS (
         SELECT 1 FROM "${schema}".grc_raci_assignments gra
         WHERE gra.entity_type = 'evidence' AND gra.entity_id = e.evidence_id::text
           AND gra.is_active = TRUE AND gra.deleted_at IS NULL
       )
       LIMIT 50`);
        if (unownedEvidence.rows.length > 0) {
            const dist = await safeQuery(`SELECT DISTINCT td.team_code, td.raci_role, t.team_id
         FROM "${schema}".evidence_team_distribution td
         JOIN "${schema}".teams t ON t.team_code = td.team_code
         WHERE td.raci_role IN ('responsible', 'accountable')
         LIMIT 3`);
            for (const ev of unownedEvidence.rows) {
                for (const d of dist.rows) {
                    await safeQuery(`INSERT INTO "${schema}".grc_raci_assignments
               (entity_type, entity_id, team_id, raci_role, assignment_source)
             VALUES ('evidence', $1, $2, $3, 'auto_provision')
             ON CONFLICT DO NOTHING`, [ev.evidence_id, d.team_id, d.raci_role]);
                }
                raciFixed++;
            }
        }
        if (raciFixed > 0) {
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'raci.auto_assigned', tenantId,
                sourceService: 'grc-integrity-guard',
                severity: 'info',
                payload: { fix: 'raci_auto_assigned', count: raciFixed },
            }), { tenantId, operation: 'eventBus:raci.auto_assigned' });
        }
    }
    catch { /* raci tables may not exist */ }
    // ── 8. BCP plans stale > 180 days without review ─────────────────────────
    try {
        const stale = await safeQuery(`SELECT bcp_id FROM "${schema}".bcp_plans
       WHERE status = 'approved'
         AND (last_reviewed_at IS NULL OR last_reviewed_at < NOW() - INTERVAL '180 days')
         AND deleted_at IS NULL
       LIMIT 50`);
        for (const p of stale.rows) {
            await safeQuery(`UPDATE "${schema}".bcp_plans SET status = 'review_required', updated_at = NOW() WHERE bcp_id = $1 AND status = 'approved'`, [p.bcp_id]);
            incidentsFixed++;
        }
    }
    catch { /* bcp_plans may not exist */ }
    // ── 9. Vendor DD expired but not flagged ────────────────────────────────
    try {
        const expired = await safeQuery(`SELECT dd_id, vendor_id FROM "${schema}".vendor_due_diligence
       WHERE valid_until < NOW() AND status NOT IN ('expired','rejected')
         AND deleted_at IS NULL
       LIMIT 50`);
        for (const dd of expired.rows) {
            await safeQuery(`UPDATE "${schema}".vendor_due_diligence SET status = 'expired', updated_at = NOW() WHERE dd_id = $1`, [dd.dd_id]);
            swallow(EC.AGENT_ACTION, eventBus.publish({
                eventType: 'vendor.dd_expired', tenantId,
                sourceService: 'grc-integrity-guard',
                severity: 'warning', entityType: 'vendor_dd', entityId: dd.dd_id,
                payload: { vendorId: dd.vendor_id },
            }), { tenantId, operation: 'eventBus:vendor.dd_expired' });
            evidenceFixed++;
        }
    }
    catch { /* vendor_due_diligence may not exist */ }
    // ── 10. Training assignments overdue > 30 days not escalated ────────────
    try {
        const overdue = await safeQuery(`SELECT assignment_id, user_id FROM "${schema}".training_assignments
       WHERE status IN ('assigned','in_progress')
         AND due_date < NOW() - INTERVAL '30 days'
       LIMIT 50`);
        for (const a of overdue.rows) {
            await safeQuery(`UPDATE "${schema}".training_assignments SET status = 'escalated', updated_at = NOW() WHERE assignment_id = $1 AND status IN ('assigned','in_progress')`, [a.assignment_id]);
            incidentsFixed++;
        }
    }
    catch { /* training_assignments may not exist */ }
    // ── 11. Near-miss reports open > 14 days without review ─────────────────
    try {
        const aging = await safeQuery(`SELECT near_miss_id FROM "${schema}".near_miss_reports
       WHERE status = 'reported'
         AND reported_at < NOW() - INTERVAL '14 days'
         AND deleted_at IS NULL
       LIMIT 50`);
        for (const nm of aging.rows) {
            await safeQuery(`UPDATE "${schema}".near_miss_reports SET status = 'under_review', updated_at = NOW() WHERE near_miss_id = $1 AND status = 'reported'`, [nm.near_miss_id]);
            incidentsFixed++;
        }
    }
    catch { /* near_miss_reports may not exist */ }
    // ── Summary ────────────────────────────────────────────────────────────────
    const totalViolations = controlsFixed + policiesFixed + risksFixed +
        evidenceFixed + incidentsFixed + findingsFixed + raciFixed + unfixable.length;
    const totalFixed = controlsFixed + policiesFixed + risksFixed +
        evidenceFixed + incidentsFixed + findingsFixed + raciFixed;
    if (totalFixed > 0 || unfixable.length > 0) {
        swallow(EC.AGENT_ACTION, recordAudit({
            tenantId, userId: 'agrc-os', module: 'integrity_guard', action: 'update',
            entityType: 'grc_integrity', entityId: tenantId,
            afterState: {
                controlsFixed, policiesFixed, risksFixed,
                evidenceFixed, incidentsFixed, findingsFixed, raciFixed,
                totalViolations, totalFixed, unfixable,
            },
        }), { tenantId, operation: 'recordAudit:grc_integrity' });
        logger.info(`[GRC Integrity] tenant ${tenantId}: ${totalFixed} fixes (${controlsFixed} controls, ` +
            `${policiesFixed} policies, ${risksFixed} risks, ${evidenceFixed} evidence, ` +
            `${incidentsFixed} incidents, ${findingsFixed} findings, ${raciFixed} raci), ${unfixable.length} unfixable`);
    }
    return {
        tenantId, controlsFixed, policiesFixed, risksFixed,
        evidenceFixed, incidentsFixed, findingsFixed, raciFixed,
        totalViolations, totalFixed, unfixable,
        cycleMs: Date.now() - start,
    };
}
//# sourceMappingURL=grc-integrity-guard.service.js.map
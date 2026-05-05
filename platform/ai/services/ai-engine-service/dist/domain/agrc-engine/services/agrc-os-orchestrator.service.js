// @ts-nocheck
import { logger } from '../ports/logger.port';
import { swallow, EC } from '@dos/platform-core/resilience/resilient-catch';
// ============================================
// Shahin — AGRC-OS Orchestrator Service (Product)
// The unified autonomous loop that ties all 7
// layers together:
//   1. Ingest telemetry
//   2. Evaluate controls (CCM)
//   3. Compute risk
//   4. Check policy decisions
//   5. Enforce gates
//   6. Audit everything
// Runs as a background job per tenant.
// NOTE: This is an AGRC product service residing
// in the platform directory. Law 2 ownership: agrc.
// ============================================
import { query, safeQuery, tenantSchema } from '../ports/database.port';
import { runCCMCycle } from '../../compliance/services/ccm/ccm-worker.service';
import { recordAudit } from '../../audit/services/audit/core/audit-trail.service';
import { eventBus } from '../ports/events.port';
import { toErrorMessage } from '@dos/module-sdk';
import { getFirstRow } from '@dos/db';
// ── Cycle lock to prevent concurrent cycles per tenant ─────────────────────
const activeCycles = new Set();
// ── Main orchestration cycle ───────────────────────────────────────────────
export async function runAGRCOSCycle(tenantId) {
    // Circuit breaker: prevent concurrent cycles for the same tenant
    if (activeCycles.has(tenantId)) {
        logger.warn(`[AGRC-OS] Cycle already running for tenant ${tenantId} — skipping`);
        return {
            tenantId,
            telemetryIngested: 0, controlsEvaluated: 0, risksRecomputed: 0,
            policyDecisions: 0, enforcementActions: 0, auditEntries: 0,
            cycleMs: 0, completedAt: new Date().toISOString(),
            warnings: ['Skipped: concurrent cycle already running'],
        };
    }
    activeCycles.add(tenantId);
    try {
        return await _runAGRCOSCycleInternal(tenantId);
    }
    finally {
        activeCycles.delete(tenantId);
    }
}
async function _runAGRCOSCycleInternal(tenantId) {
    const startTime = Date.now();
    let telemetryIngested = 0;
    let controlsEvaluated = 0;
    let risksRecomputed = 0;
    let policyDecisions = 0;
    let enforcementActions = 0;
    let auditEntries = 0;
    const warnings = [];
    let orgProfile = null;
    try {
        const tenantResult = await safeQuery(`SELECT settings FROM tenants WHERE tenant_id = $1`, [tenantId]);
        if (getFirstRow(tenantResult)?.settings?.profileResolution) {
            orgProfile = getFirstRow(tenantResult)?.settings.profileResolution;
        }
    }
    catch { /* non-fatal */ }
    try {
        swallow(EC.AGENT_ACTION, eventBus.publish({
            eventType: 'cycle.started', tenantId, sourceService: 'agrc-os-orchestrator',
            severity: 'info', payload: { startTime: new Date(startTime).toISOString(), orgProfile: orgProfile ? { reportingCadence: orgProfile.reportingCadence, riskAppetite: orgProfile.riskAppetite } : null },
        }), { tenantId, operation: 'eventBus:cycle.started' });
        // ── Step 1: Process pending telemetry signals ──────────────────────────
        try {
            const { getSignals } = await import('../../analytics/services/misc/telemetry-aggregator.service');
            const signals = await getSignals(tenantId, { limit: 100 });
            telemetryIngested = signals.length;
            if (telemetryIngested > 0) {
                await eventBus.publish({
                    eventType: 'telemetry.ingested', tenantId, sourceService: 'agrc-os-orchestrator',
                    severity: 'info', payload: { count: telemetryIngested },
                });
            }
        }
        catch (err) {
            const msg = `[Step 1] Telemetry ingestion failed: ${toErrorMessage(err)}`;
            logger.warn(`[AGRC-OS] ${msg}`);
            warnings.push(msg);
        }
        // ── Step 2: Run CCM cycle (evaluate controls + escalations) ───────────
        try {
            const ccmResult = await runCCMCycle(tenantId);
            controlsEvaluated = ccmResult.controlsEvaluated;
            if (ccmResult.staleControls > 0) {
                await eventBus.publish({
                    eventType: 'ccm.stale_detected', tenantId, sourceService: 'agrc-os-orchestrator',
                    severity: 'warning', payload: { staleCount: ccmResult.staleControls, evaluated: ccmResult.controlsEvaluated },
                });
            }
            await eventBus.publish({
                eventType: 'ccm.cycle_completed', tenantId, sourceService: 'agrc-os-orchestrator',
                severity: 'info', payload: { controlsEvaluated, staleControls: ccmResult.staleControls },
            });
            swallow(EC.AGENT_ACTION, recordAudit({
                tenantId, userId: 'agrc-os', module: 'agrc_os', action: 'update',
                entityType: 'ccm', entityId: tenantId,
                afterState: { controlsEvaluated, staleControls: ccmResult.staleControls, escalations: ccmResult.escalationsTriggered },
            }), { tenantId, operation: 'recordAudit:ccm' });
        }
        catch (err) {
            const msg = `[Step 2] CCM cycle failed: ${toErrorMessage(err)}`;
            logger.warn(`[AGRC-OS] ${msg}`);
            warnings.push(msg);
        }
        // ── Step 3: Recompute risk posture ─────────────────────────────────────
        try {
            const { getRiskPosture } = await import('../../risk/services/scoring/risk-scoring.service');
            const posture = await getRiskPosture(tenantId);
            risksRecomputed = posture.totalRisks;
            swallow(EC.AGENT_ACTION, recordAudit({
                tenantId, userId: 'agrc-os', module: 'agrc_os', action: 'update',
                entityType: 'risk_posture', entityId: tenantId,
                afterState: { totalRisks: risksRecomputed },
            }), { tenantId, operation: 'recordAudit:risk_posture' });
        }
        catch (err) {
            const msg = `[Step 3] Risk posture recompute failed: ${toErrorMessage(err)}`;
            logger.warn(`[AGRC-OS] ${msg}`);
            warnings.push(msg);
        }
        // ── Step 4: Evaluate policy rules against current state ────────────────
        try {
            const schema = tenantSchema(tenantId);
            const policiesResult = await safeQuery(`SELECT policy_id, policy_code_rules FROM "${schema}".policies
         WHERE policy_code_rules IS NOT NULL AND status = 'approved'`);
            const { executeRule } = await import('../../policy/services/policy/policy-code.service');
            for (const policy of policiesResult.rows) {
                const rules = Array.isArray(policy.policy_code_rules)
                    ? policy.policy_code_rules
                    : JSON.parse(policy.policy_code_rules || '[]');
                const context = await buildTenantContext(tenantId);
                for (const rule of rules) {
                    const result = executeRule(rule, context);
                    if (result.triggered) {
                        policyDecisions++;
                        if (result.action?.type === 'block') {
                            enforcementActions++;
                            await eventBus.publish({
                                eventType: 'gate.blocked', tenantId, sourceService: 'agrc-os-orchestrator',
                                entityType: 'policy', entityId: policy.policy_id,
                                severity: 'warning', payload: { ruleId: rule.id, action: result.action },
                            });
                        }
                        await eventBus.publish({
                            eventType: 'policy.violated', tenantId, sourceService: 'agrc-os-orchestrator',
                            entityType: 'policy', entityId: policy.policy_id,
                            severity: result.action?.type === 'block' ? 'critical' : 'warning',
                            payload: { ruleId: rule.id, triggered: true },
                        });
                    }
                }
            }
            if (policyDecisions > 0) {
                swallow(EC.AGENT_ACTION, recordAudit({
                    tenantId, userId: 'agrc-os', module: 'agrc_os', action: 'update',
                    entityType: 'policy_engine', entityId: tenantId,
                    afterState: { policyDecisions, enforcementActions },
                }), { tenantId, operation: 'recordAudit:policy_engine' });
            }
        }
        catch (err) {
            const msg = `[Step 4] Policy evaluation failed: ${toErrorMessage(err)}`;
            logger.warn(`[AGRC-OS] ${msg}`);
            warnings.push(msg);
        }
        // ── Step 5: Check governance constitution compliance ───────────────────
        try {
            const { checkRiskAgainstAppetite } = await import('../../governance/services/governance/governance-constitution.service');
            const schema = tenantSchema(tenantId);
            const risksResult = await safeQuery(`SELECT risk_id, category, risk_score, title FROM "${schema}".risks
         WHERE risk_score IS NOT NULL`);
            for (const risk of risksResult.rows) {
                const check = await checkRiskAgainstAppetite(tenantId, risk.category || 'operational', risk.risk_score);
                if (!check.withinAppetite) {
                    enforcementActions++;
                    await eventBus.publish({
                        eventType: 'risk.exceeded_appetite', tenantId, sourceService: 'agrc-os-orchestrator',
                        entityType: 'risk', entityId: risk.risk_id,
                        severity: 'critical',
                        payload: {
                            riskName: risk.title, category: risk.category || 'operational',
                            riskScore: risk.risk_score, maxScore: check.maxAllowed,
                            requiredRole: check.requiredRole,
                        },
                    });
                    await eventBus.publish({
                        eventType: 'constitution.breach', tenantId, sourceService: 'agrc-os-orchestrator',
                        entityType: 'risk', entityId: risk.risk_id,
                        severity: 'critical',
                        payload: {
                            reason: `Risk "${risk.title}" score ${risk.risk_score} exceeds appetite ${check.maxAllowed}`,
                            category: risk.category, riskScore: risk.risk_score, maxScore: check.maxAllowed,
                        },
                    });
                    swallow(EC.AGENT_ACTION, recordAudit({
                        tenantId, userId: 'agrc-os', module: 'agrc_os', action: 'update',
                        entityType: 'risk', entityId: risk.risk_id,
                        beforeState: { maxAllowed: check.maxAllowed },
                        afterState: { riskScore: risk.risk_score, category: risk.category, breached: true },
                    }), { tenantId, operation: 'recordAudit:risk_appetite_breach' });
                }
            }
        }
        catch (err) {
            const msg = `[Step 5] Constitution compliance check failed: ${toErrorMessage(err)}`;
            logger.warn(`[AGRC-OS] ${msg}`);
            warnings.push(msg);
        }
        // ── Step 6: Record audit entry for this cycle ──────────────────────────
        try {
            await recordAudit({
                tenantId,
                userId: 'agrc-os',
                module: 'agrc_os',
                action: 'update',
                entityType: 'agrc_os_cycle',
                entityId: tenantId,
                afterState: {
                    telemetryIngested,
                    controlsEvaluated,
                    risksRecomputed,
                    policyDecisions,
                    enforcementActions,
                    warnings,
                },
            });
            auditEntries = 1;
        }
        catch (err) {
            const msg = `[Step 6] Audit recording failed: ${toErrorMessage(err)}`;
            logger.warn(`[AGRC-OS] ${msg}`);
            warnings.push(msg);
        }
        // ── Step 7: Escalate overdue reports (report.overdue events for runbooks) ─
        try {
            const { escalateOverdueReports } = await import('./agrc-os-reporting.service');
            const esc = await escalateOverdueReports(tenantId, 48);
            if (esc.escalated > 0) {
                swallow(EC.AGENT_ACTION, eventBus.publish({
                    eventType: 'report.overdue', tenantId, sourceService: 'agrc-os-orchestrator',
                    severity: 'warning', payload: { escalated: esc.escalated, scheduleIds: esc.scheduleIds },
                }), { tenantId, operation: 'eventBus:report.overdue' });
            }
        }
        catch (err) {
            const msg = `[Step 7] Report escalation failed: ${toErrorMessage(err)}`;
            logger.warn(`[AGRC-OS] ${msg}`);
            warnings.push(msg);
        }
        // ── Step 8: Run autonomous AI agent fleet ────────────────────────────────
        let agentActionsTotal = 0;
        try {
            const { runAllAgents } = await import('../../runtime/ai/services/agents/core/agent-runner.service');
            const agentResults = await runAllAgents(tenantId);
            agentActionsTotal = agentResults.reduce((s, r) => s + r.actionsExecuted, 0);
            if (agentActionsTotal > 0) {
                swallow(EC.AGENT_ACTION, eventBus.publish({
                    eventType: 'agents.cycle_completed', tenantId, sourceService: 'agrc-os-orchestrator',
                    severity: 'info',
                    payload: {
                        agentsRun: agentResults.length,
                        totalActions: agentActionsTotal,
                        results: agentResults.map(r => ({
                            agent: r.agentId, proposed: r.actionsProposed,
                            executed: r.actionsExecuted, ms: r.durationMs,
                        })),
                    },
                }), { tenantId, operation: 'eventBus:agents.cycle_completed' });
            }
            swallow(EC.AGENT_ACTION, recordAudit({
                tenantId, userId: 'agrc-os', module: 'agrc_os', action: 'update',
                entityType: 'agent_fleet', entityId: tenantId,
                afterState: { agentsRun: agentResults.length, actionsExecuted: agentActionsTotal },
            }), { tenantId, operation: 'recordAudit:agent_fleet' });
        }
        catch (err) {
            const msg = `[Step 8] Agent fleet run failed: ${toErrorMessage(err)}`;
            logger.warn(`[AGRC-OS] ${msg}`);
            warnings.push(msg);
        }
        const cycleMs = Date.now() - startTime;
        // Emit cycle completed event
        swallow(EC.AGENT_ACTION, eventBus.publish({
            eventType: 'cycle.completed', tenantId, sourceService: 'agrc-os-orchestrator',
            severity: enforcementActions > 0 ? 'warning' : 'info',
            payload: { telemetryIngested, controlsEvaluated, risksRecomputed, policyDecisions, enforcementActions, cycleMs, warnings },
        }), { tenantId, operation: 'eventBus:cycle.completed' });
        // Log cycle result
        await logAGRCOSCycle(tenantSchema(tenantId), {
            telemetryIngested,
            controlsEvaluated,
            risksRecomputed,
            policyDecisions,
            enforcementActions,
            auditEntries,
            cycleMs,
            warnings,
        });
        if (warnings.length > 0) {
            logger.warn(`[AGRC-OS] Cycle completed with ${warnings.length} warning(s) for tenant ${tenantId}: ${warnings.join('; ')}`);
        }
        return {
            tenantId,
            telemetryIngested,
            controlsEvaluated,
            risksRecomputed,
            policyDecisions,
            enforcementActions,
            auditEntries,
            cycleMs,
            completedAt: new Date().toISOString(),
            warnings,
        };
    }
    catch (err) {
        logger.error(`[AGRC-OS] Orchestration cycle failed for tenant ${tenantId}: ${toErrorMessage(err)}`);
        swallow(EC.AGENT_ACTION, eventBus.publish({
            eventType: 'cycle.failed', tenantId, sourceService: 'agrc-os-orchestrator',
            severity: 'critical', payload: { error: toErrorMessage(err), cycleMs: Date.now() - startTime, warnings },
        }), { tenantId, operation: 'eventBus:cycle.failed' });
        return {
            tenantId,
            telemetryIngested,
            controlsEvaluated,
            risksRecomputed,
            policyDecisions,
            enforcementActions,
            auditEntries,
            cycleMs: Date.now() - startTime,
            completedAt: new Date().toISOString(),
            warnings: [...warnings, `Fatal: ${toErrorMessage(err)}`],
        };
    }
}
// ── Build tenant context for policy evaluation ─────────────────────────────
async function buildTenantContext(tenantId) {
    const schema = tenantSchema(tenantId);
    const context = { tenantId };
    try {
        const [risksRes, controlsRes, incidentsRes, tenantRes] = await Promise.all([
            query(`SELECT COUNT(*)::int AS total, AVG(risk_score)::float AS avg_score FROM "${schema}".risks`),
            query(`SELECT COUNT(*)::int AS total FROM "${schema}".ucf_controls WHERE lifecycle_state = 'effective'`),
            query(`SELECT COUNT(*)::int AS total FROM "${schema}".incidents WHERE status != 'resolved'`),
            query(`SELECT org_type, legal_form, listing_status, org_size, employee_count,
                    critical_infrastructure, data_classification_level, settings
             FROM tenants WHERE tenant_id = $1`, [tenantId]),
        ]);
        context.totalRisks = getFirstRow(risksRes)?.total || 0;
        context.avgRiskScore = getFirstRow(risksRes)?.avg_score || 0;
        context.effectiveControls = getFirstRow(controlsRes)?.total || 0;
        context.openIncidents = getFirstRow(incidentsRes)?.total || 0;
        if (getFirstRow(tenantRes)) {
            const t = getFirstRow(tenantRes);
            context.orgType = t.org_type;
            context.legalForm = t.legal_form;
            context.listingStatus = t.listing_status;
            context.employeeCount = t.employee_count;
            context.criticalInfrastructure = t.critical_infrastructure;
            context.dataClassification = t.data_classification_level;
            if (t.settings?.profileResolution) {
                context.riskAppetite = t.settings.profileResolution.riskAppetite;
                context.reportingCadence = t.settings.profileResolution.reportingCadence;
                context.controlFlags = t.settings.profileResolution.controlFlags;
                context.complianceComplexity = t.settings.profileResolution.complianceComplexity;
            }
        }
    }
    catch (err) {
        logger.warn(`[AGRC-OS] Context building partial failure: ${toErrorMessage(err)}`);
    }
    return context;
}
// ── Cycle log ──────────────────────────────────────────────────────────────
async function logAGRCOSCycle(schema, data) {
    try {
        await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".agrc_os_cycle_log (
        cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telemetry_ingested INT DEFAULT 0,
        controls_evaluated INT DEFAULT 0,
        risks_recomputed INT DEFAULT 0,
        policy_decisions INT DEFAULT 0,
        enforcement_actions INT DEFAULT 0,
        audit_entries INT DEFAULT 0,
        cycle_ms INT NOT NULL,
        warnings JSONB DEFAULT '[]',
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        // Add warnings column if it doesn't exist (for existing tables)
        swallow(EC.AGENT_ACTION, safeQuery(`
      ALTER TABLE "${schema}".agrc_os_cycle_log
      ADD COLUMN IF NOT EXISTS warnings JSONB DEFAULT '[]'
    `), { operation: 'DDL:add_warnings_column' });
        await safeQuery(`INSERT INTO "${schema}".agrc_os_cycle_log
         (telemetry_ingested, controls_evaluated, risks_recomputed, policy_decisions, enforcement_actions, audit_entries, cycle_ms, warnings)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`, [data.telemetryIngested, data.controlsEvaluated, data.risksRecomputed,
            data.policyDecisions, data.enforcementActions, data.auditEntries, data.cycleMs,
            JSON.stringify(data.warnings)]);
    }
    catch (err) {
        logger.error(`[AGRC-OS] Failed to log cycle: ${toErrorMessage(err)}`);
    }
}
// ── Get orchestration history ──────────────────────────────────────────────
export async function getAGRCOSHistory(tenantId, limit = 50) {
    const schema = tenantSchema(tenantId);
    try {
        const result = await safeQuery(`SELECT * FROM "${schema}".agrc_os_cycle_log ORDER BY executed_at DESC LIMIT $1`, [limit]);
        return result.rows;
    }
    catch {
        return [];
    }
}
// ── Get AGRC-OS status dashboard ───────────────────────────────────────────
export async function getAGRCOSStatus(tenantId) {
    const schema = tenantSchema(tenantId);
    try {
        await safeQuery(`
      CREATE TABLE IF NOT EXISTS "${schema}".agrc_os_cycle_log (
        cycle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telemetry_ingested INT DEFAULT 0,
        controls_evaluated INT DEFAULT 0,
        risks_recomputed INT DEFAULT 0,
        policy_decisions INT DEFAULT 0,
        enforcement_actions INT DEFAULT 0,
        audit_entries INT DEFAULT 0,
        cycle_ms INT NOT NULL,
        warnings JSONB DEFAULT '[]',
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
        const [lastRes, statsRes] = await Promise.all([
            query(`SELECT * FROM "${schema}".agrc_os_cycle_log ORDER BY executed_at DESC LIMIT 1`),
            query(`
        SELECT
          COUNT(*)::int AS cycles,
          COALESCE(AVG(cycle_ms), 0)::int AS avg_ms,
          COALESCE(SUM(enforcement_actions), 0)::int AS total_enforcement
        FROM "${schema}".agrc_os_cycle_log
        WHERE executed_at >= NOW() - INTERVAL '24 hours'
      `),
        ]);
        return {
            lastCycle: getFirstRow(lastRes) || null,
            cyclesLast24h: getFirstRow(statsRes)?.cycles || 0,
            avgCycleMs: getFirstRow(statsRes)?.avg_ms || 0,
            totalEnforcementActions: getFirstRow(statsRes)?.total_enforcement || 0,
        };
    }
    catch {
        return { lastCycle: null, cyclesLast24h: 0, avgCycleMs: 0, totalEnforcementActions: 0 };
    }
}
//# sourceMappingURL=agrc-os-orchestrator.service.js.map
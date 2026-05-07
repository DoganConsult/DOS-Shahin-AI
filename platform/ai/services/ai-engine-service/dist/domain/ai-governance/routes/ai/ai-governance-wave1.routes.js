// @ts-nocheck
import { Router } from 'express';
import { logger } from '../../ports/logger.port.js';
import { authenticate, requirePermission } from '../../ports/auth.port.js';
import { safeQuery, tenantSchema } from '../../ports/database.port.js';
import { toErrorMessage } from '@dos/module-sdk';
import { enforceStatusTransition } from '../../ports/platform.port.js';
import { getFirstRow } from '@dos/db';
// ── Zod Schemas ──────────────────────────────────────────────────────────
import { validate, auditMiddleware, setAuditData, automationMiddleware, moduleStack, mutationEventHook } from '../../ports/middleware.port.js';
import { alertRulesPostBody, alertRulesIdPutBody, alertHistoryIdAcknowledgePostBody, killSwitchesPostBody, killSwitchesIdTestPostBody, killSwitchesIdActivatePostBody, modelMetricsPostBody, driftThresholdsPutBody } from "../../schemas/ai-governance.schemas.js";
import { z } from "zod";
const router = Router();
router.use(moduleStack('ai-governance'));
router.use(mutationEventHook('ai-governance'));
router.use(auditMiddleware("ai-governance"));
router.use(automationMiddleware("ai-governance"));
/** Helper: schema-qualified query for tenant tables */
async function tq(tenantId, sql, params) {
    const schema = tenantSchema(tenantId);
    return safeQuery(sql.replace(/\bFROM\s+(\w+)/gi, `FROM "${schema}".$1`)
        .replace(/\bINTO\s+(\w+)/gi, `INTO "${schema}".$1`)
        .replace(/\bUPDATE\s+(\w+)/gi, `UPDATE "${schema}".$1`)
        .replace(/\bDELETE\s+FROM\s+(\w+)/gi, `DELETE FROM "${schema}".$1`)
        .replace(/\bJOIN\s+(\w+)/gi, `JOIN "${schema}".$1`), params);
}
// ═════════════════════════════════════════════════════════════
// W1.1 — ALERT RULES
// ═════════════════════════════════════════════════════════════
router.get("/alert-rules", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { enabled, limit = 100, offset = 0 } = req.query;
        let sql = `SELECT * FROM ai_alert_rules WHERE tenant_id = $1`;
        const params = [tenantId];
        if (enabled !== undefined) {
            params.push(enabled === 'true');
            sql += ` AND enabled = $${params.length}`;
        }
        sql += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(Number(limit), Number(offset));
        const { rows } = await tq(tenantId, sql, params);
        return res.json({ rules: rows, total: rows.length });
    }
    catch (err) {
        logger.error("[ai-gov-wave1] GET alert-rules:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to load alert rules" });
    }
});
router.post("/alert-rules", authenticate, requirePermission("ai_governance.manage"), validate({ body: alertRulesPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { rule_name, description, trigger_condition, channels, escalation_chain, enabled } = req.body;
        if (!rule_name)
            return res.status(400).json({ error: "rule_name is required" });
        const { rows } = await tq(tenantId, `INSERT INTO ai_alert_rules (tenant_id, rule_name, description, trigger_condition, channels, escalation_chain, enabled, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [tenantId, rule_name, description || null, JSON.stringify(trigger_condition || {}), JSON.stringify(channels || []), JSON.stringify(escalation_chain || []), enabled !== false, userId]);
        setAuditData(res, { action: "create", entityType: "ai_alert_rule", entityId: rows[0].rule_id, afterState: rows[0] });
        return res.status(201).json(rows[0]);
    }
    catch (err) {
        logger.error("[ai-gov-wave1] POST alert-rules:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to create alert rule" });
    }
});
router.put("/alert-rules/:id", authenticate, requirePermission("ai_governance.manage"), validate({ body: alertRulesIdPutBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        const { rule_name, description, trigger_condition, channels, escalation_chain, enabled, snooze_until } = req.body;
        const { rows } = await tq(tenantId, `UPDATE ai_alert_rules SET rule_name=COALESCE($2,rule_name), description=COALESCE($3,description),
       trigger_condition=COALESCE($4,trigger_condition), channels=COALESCE($5,channels),
       escalation_chain=COALESCE($6,escalation_chain), enabled=COALESCE($7,enabled),
       snooze_until=$8, updated_at=NOW() WHERE rule_id=$1 AND tenant_id=$9 RETURNING *`, [id, rule_name, description, trigger_condition ? JSON.stringify(trigger_condition) : null, channels ? JSON.stringify(channels) : null, escalation_chain ? JSON.stringify(escalation_chain) : null, enabled, snooze_until || null, tenantId]);
        if (!rows.length)
            return res.status(404).json({ error: "Rule not found" });
        setAuditData(res, { action: "update", entityType: "ai_alert_rule", entityId: id, afterState: rows[0] });
        return res.json(rows[0]);
    }
    catch (err) {
        logger.error("[ai-gov-wave1] PUT alert-rules:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to update alert rule" });
    }
});
router.delete("/alert-rules/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("ai_governance.manage"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        await tq(tenantId, `DELETE FROM ai_alert_rules WHERE rule_id=$1 AND tenant_id=$2`, [id, tenantId]);
        setAuditData(res, { action: "delete", entityType: "ai_alert_rule", entityId: id });
        return res.json({ deleted: true });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to delete alert rule" });
    }
});
// Alert History
router.get("/alert-history", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { limit = 50, offset = 0, rule_id } = req.query;
        let sql = `SELECT * FROM ai_alert_history WHERE tenant_id = $1`;
        const params = [tenantId];
        if (rule_id) {
            params.push(rule_id);
            sql += ` AND rule_id = $${params.length}`;
        }
        sql += ` ORDER BY triggered_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(Number(limit), Number(offset));
        const { rows } = await tq(tenantId, sql, params);
        return res.json({ alerts: rows, total: rows.length });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load alert history" });
    }
});
router.post("/alert-history/:id/acknowledge", authenticate, requirePermission("ai_governance.manage"), validate({ body: alertHistoryIdAcknowledgePostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { id } = req.params;
        const { rows } = await tq(tenantId, `UPDATE ai_alert_history SET acknowledged=TRUE, acknowledged_at=NOW(), acknowledged_by=$2 WHERE alert_id=$1 AND tenant_id=$3 RETURNING *`, [id, userId, tenantId]);
        if (!rows.length)
            return res.status(404).json({ error: "Alert not found" });
        return res.json(rows[0]);
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to acknowledge alert" });
    }
});
// ═════════════════════════════════════════════════════════════
// W1.2 — KILL SWITCHES
// ═════════════════════════════════════════════════════════════
router.get("/kill-switches", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { rows } = await tq(tenantId, `SELECT * FROM ai_kill_switches WHERE tenant_id=$1 ORDER BY created_at DESC`, [tenantId]);
        return res.json({ switches: rows });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load kill switches" });
    }
});
router.post("/kill-switches", authenticate, requirePermission("ai_governance.manage"), validate({ body: killSwitchesPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { asset_id, asset_name, asset_type, kill_switch_type, trigger_method, fallback_procedure } = req.body;
        if (!asset_name || !asset_type)
            return res.status(400).json({ error: "asset_name and asset_type required" });
        const { rows } = await tq(tenantId, `INSERT INTO ai_kill_switches (tenant_id, asset_id, asset_name, asset_type, kill_switch_type, trigger_method, fallback_procedure, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [tenantId, asset_id || null, asset_name, asset_type, kill_switch_type || 'api_disable', trigger_method || null, fallback_procedure || null, userId]);
        setAuditData(res, { action: "create", entityType: "ai_kill_switch", entityId: rows[0].kill_switch_id, afterState: rows[0] });
        return res.status(201).json(rows[0]);
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to create kill switch" });
    }
});
router.post("/kill-switches/:id/test", authenticate, requirePermission("ai_governance.manage"), validate({ body: killSwitchesIdTestPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        // Dry-run: update last_tested_at without actually activating
        const { rows } = await tq(tenantId, `UPDATE ai_kill_switches SET last_tested_at=NOW(), updated_at=NOW() WHERE kill_switch_id=$1 AND tenant_id=$2 RETURNING *`, [id, tenantId]);
        if (!rows.length)
            return res.status(404).json({ error: "Kill switch not found" });
        setAuditData(res, { action: "update", entityType: "ai_kill_switch", entityId: id, afterState: { tested: true } });
        return res.json({ tested: true, kill_switch: rows[0] });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to test kill switch" });
    }
});
router.post("/kill-switches/:id/activate", authenticate, requirePermission("ai_governance.manage"), validate({ body: killSwitchesIdActivatePostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const userId = req.user.userId;
        const { id } = req.params;
        const enforcement = await enforceStatusTransition(tenantId, {
            moduleCode: 'ai-governance', table: 'ai_kill_switches', idColumn: 'kill_switch_id',
            entityId: id, toStatus: 'activated', actorUserId: userId,
            extraSets: 'last_activated_at = NOW(), activated_by = $2',
            extraParams: [userId],
        });
        if (enforcement.blocked)
            return res.status(403).json({ error: 'Transition denied', reason: enforcement.reason });
        if (enforcement.pendingApproval)
            return res.status(202).json({ pendingApproval: true, approvalId: enforcement.approvalId, reason: enforcement.reason });
        let rows;
        if (!enforcement.success) {
            const r = await tq(tenantId, `UPDATE ai_kill_switches SET status='activated', last_activated_at=NOW(), activated_by=$2, updated_at=NOW()
         WHERE kill_switch_id=$1 AND tenant_id=$3 RETURNING *`, [id, userId, tenantId]);
            rows = r.rows;
        }
        else {
            const r = await tq(tenantId, `SELECT * FROM ai_kill_switches WHERE kill_switch_id=$1 AND tenant_id=$2`, [id, tenantId]);
            rows = r.rows;
        }
        if (!rows.length)
            return res.status(404).json({ error: "Kill switch not found" });
        // If asset_id is set, suspend it in the relevant registry
        const ks = rows[0];
        if (ks.asset_id) {
            try {
                // Attempt to suspend active versions for this asset
                await tq(tenantId, `UPDATE ai_model_registry SET deployment_status='suspended', updated_at=NOW()

           WHERE asset_id=$1 AND tenant_id=$2 AND deployment_status='active'`, [ks.asset_id, tenantId]);
                await tq(tenantId, `UPDATE ai_agent_registry SET deployment_status='suspended', updated_at=NOW()

           WHERE asset_id=$1 AND tenant_id=$2 AND deployment_status='active'`, [ks.asset_id, tenantId]);
                await tq(tenantId, `UPDATE ai_prompt_registry SET deployment_status='suspended', updated_at=NOW()

           WHERE asset_id=$1 AND tenant_id=$2 AND deployment_status='active'`, [ks.asset_id, tenantId]);
            }
            catch { /* tables may not all exist for this asset type */ }
        }
        setAuditData(res, { action: "activate", entityType: "ai_kill_switch", entityId: id, afterState: { status: "activated", activated_by: userId } });
        return res.json({ activated: true, kill_switch: rows[0] });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to activate kill switch" });
    }
});
router.delete("/kill-switches/:id", validate({ body: genericPayloadSchema }), authenticate, requirePermission("ai_governance.manage"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { id } = req.params;
        await tq(tenantId, `DELETE FROM ai_kill_switches WHERE kill_switch_id=$1 AND tenant_id=$2`, [id, tenantId]);
        return res.json({ deleted: true });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to delete kill switch" });
    }
});
// ═════════════════════════════════════════════════════════════
// W1.3 — AGENT RUNTIME STATS
// ═════════════════════════════════════════════════════════════
router.get("/agent-runtime-stats/:agentAssetId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { agentAssetId } = req.params;
        const window = req.query.window || '24h';
        const hours = window.endsWith('h') ? parseInt(window) : 24;
        const cutoff = new Date(Date.now() - hours * 3600000).toISOString();
        // Aggregate from agrc_event_log for this agent
        const statsResult = await tq(tenantId, `SELECT
         COUNT(*) FILTER (WHERE true) as total_actions,
         COUNT(*) FILTER (WHERE (details->>'outcome')='blocked' OR (details->>'action_taken')='block') as actions_blocked,
         AVG((details->>'confidence')::NUMERIC) FILTER (WHERE details->>'confidence' IS NOT NULL) as avg_confidence,
         COUNT(*) FILTER (WHERE (details->>'outcome')='overridden' OR (details->>'actor_type')='human') as human_overrides,
         COUNT(*) FILTER (WHERE (details->>'sla_met')='true') as sla_met,
         COUNT(*) FILTER (WHERE (details->>'sla_met')='false') as sla_missed
       FROM agrc_event_log
       WHERE tenant_id=$1
         AND (details->>'agent_id'=$2 OR details->>'entity_id'=$2)
         AND created_at >= $3`, [tenantId, agentAssetId, cutoff]);
        const stats = getFirstRow(statsResult) || {};
        const totalActions = parseInt(stats.total_actions) || 0;
        const actionsBlocked = parseInt(stats.actions_blocked) || 0;
        const humanOverrides = parseInt(stats.human_overrides) || 0;
        const slaMet = parseInt(stats.sla_met) || 0;
        const slaMissed = parseInt(stats.sla_missed) || 0;
        // Recent action log
        const logResult = await tq(tenantId, `SELECT event_type, details, created_at
       FROM agrc_event_log
       WHERE tenant_id=$1
         AND (details->>'agent_id'=$2 OR details->>'entity_id'=$2)
         AND created_at >= $3
       ORDER BY created_at DESC LIMIT 50`, [tenantId, agentAssetId, cutoff]);
        const actionLog = logResult.rows.map((r) => ({
            timestamp: r.created_at,
            action_type: r.event_type,
            entity: r.details?.entity_type || r.details?.entity_id || '—',
            confidence: r.details?.confidence ? parseFloat(r.details.confidence) : null,
            outcome: r.details?.outcome || r.details?.action_taken || 'executed',
        }));
        return res.json({
            agent_id: agentAssetId,
            window,
            actions_today: totalActions,
            actions_blocked: actionsBlocked,
            avg_confidence: stats.avg_confidence ? parseFloat(stats.avg_confidence).toFixed(2) : null,
            human_override_rate: totalActions > 0 ? parseFloat((humanOverrides / totalActions * 100).toFixed(1)) : 0,
            sla_adherence_pct: (slaMet + slaMissed) > 0 ? parseFloat((slaMet / (slaMet + slaMissed) * 100).toFixed(1)) : 100,
            action_log: actionLog,
        });
    }
    catch (err) {
        logger.error("[ai-gov-wave1] agent-runtime-stats:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to load agent runtime stats" });
    }
});
// ═════════════════════════════════════════════════════════════
// W1.4 — MODEL METRICS (Drift Detection)
// ═════════════════════════════════════════════════════════════
router.get("/model-metrics/:versionId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { versionId } = req.params;
        const { metric_type, limit = 100 } = req.query;
        let sql = `SELECT * FROM ai_model_metrics WHERE tenant_id=$1 AND version_id=$2`;
        const params = [tenantId, versionId];
        if (metric_type) {
            params.push(metric_type);
            sql += ` AND metric_type=$${params.length}`;
        }
        sql += ` ORDER BY recorded_at DESC LIMIT $${params.length + 1}`;
        params.push(Number(limit));
        const { rows } = await tq(tenantId, sql, params);
        return res.json({ metrics: rows });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load model metrics" });
    }
});
router.post("/model-metrics", authenticate, requirePermission("ai.governance.write"), validate({ body: modelMetricsPostBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { version_id, asset_id, metric_type, value, metadata } = req.body;
        if (!version_id || !metric_type || value === undefined)
            return res.status(400).json({ error: "version_id, metric_type, value required" });
        const { rows } = await tq(tenantId, `INSERT INTO ai_model_metrics (tenant_id, version_id, asset_id, metric_type, value, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [tenantId, version_id, asset_id || null, metric_type, value, JSON.stringify(metadata || {})]);
        // Check drift thresholds
        if (asset_id) {
            const thresholds = await tq(tenantId, `SELECT * FROM ai_drift_thresholds WHERE tenant_id=$1 AND asset_id=$2 AND metric_type=$3 AND enabled=TRUE`, [tenantId, asset_id, metric_type]);
            if (thresholds.rows.length > 0) {
                const t = getFirstRow(thresholds);
                if (t.baseline_value !== null) {
                    const delta = Math.abs(value - t.baseline_value);
                    if (delta >= t.critical_delta) {
                        // Log drift event
                        try {
                            await tq(tenantId, `INSERT INTO agrc_event_log (tenant_id, event_type, severity, details, created_at)
                 VALUES ($1, 'model.drift_detected', 'critical', $2, NOW())`, [tenantId, JSON.stringify({ asset_id, version_id, metric_type, value, baseline: t.baseline_value, delta, level: 'critical' })]);
                        }
                        catch { /* event log may not exist */ }
                    }
                    else if (delta >= t.warning_delta) {
                        try {
                            await tq(tenantId, `INSERT INTO agrc_event_log (tenant_id, event_type, severity, details, created_at)
                 VALUES ($1, 'model.drift_detected', 'warning', $2, NOW())`, [tenantId, JSON.stringify({ asset_id, version_id, metric_type, value, baseline: t.baseline_value, delta, level: 'warning' })]);
                        }
                        catch { /* event log may not exist */ }
                    }
                }
            }
        }
        return res.status(201).json(rows[0]);
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to record model metric" });
    }
});
// Drift thresholds
router.get("/drift-thresholds/:assetId", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { assetId } = req.params;
        const { rows } = await tq(tenantId, `SELECT * FROM ai_drift_thresholds WHERE tenant_id=$1 AND asset_id=$2 ORDER BY metric_type`, [tenantId, assetId]);
        return res.json({ thresholds: rows });
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to load drift thresholds" });
    }
});
router.put("/drift-thresholds", authenticate, requirePermission("ai_governance.manage"), validate({ body: driftThresholdsPutBody }), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const { asset_id, metric_type, warning_delta, critical_delta, baseline_value, enabled } = req.body;
        if (!asset_id || !metric_type)
            return res.status(400).json({ error: "asset_id and metric_type required" });
        const { rows } = await tq(tenantId, `INSERT INTO ai_drift_thresholds (tenant_id, asset_id, metric_type, warning_delta, critical_delta, baseline_value, enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (tenant_id, asset_id, metric_type) DO UPDATE SET
         warning_delta=COALESCE($4,ai_drift_thresholds.warning_delta),
         critical_delta=COALESCE($5,ai_drift_thresholds.critical_delta),
         baseline_value=COALESCE($6,ai_drift_thresholds.baseline_value),
         enabled=COALESCE($7,ai_drift_thresholds.enabled),
         updated_at=NOW()
       RETURNING *`, [tenantId, asset_id, metric_type, warning_delta ?? 0.05, critical_delta ?? 0.10, baseline_value ?? null, enabled ?? true]);
        return res.json(rows[0]);
    }
    catch (_err) {
        return res.status(500).json({ error: "Failed to update drift threshold" });
    }
});
// ═════════════════════════════════════════════════════════════
// W1.5 — MATURITY SCORECARD
// ═════════════════════════════════════════════════════════════
router.get("/maturity-scorecard", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        // Compute 6-axis maturity from real data
        const queries = await Promise.allSettled([
            // Model Management: approved versions / total versions
            tq(tenantId, `SELECT COUNT(*) FILTER (WHERE approval_status='approved') as approved, COUNT(*) as total FROM ai_model_registry WHERE tenant_id=$1`, [tenantId]),
            // Risk: risks with controls / total risks
            tq(tenantId, `SELECT COUNT(DISTINCT r.risk_id) FILTER (WHERE r.status IN ('mitigated','accepted')) as managed, COUNT(DISTINCT r.risk_id) as total FROM risks r WHERE r.tenant_id=$1`, [tenantId]),
            // Compliance: controls with evidence / total controls
            tq(tenantId, `SELECT COUNT(*) FILTER (WHERE status='implemented' OR effectiveness='effective') as covered, COUNT(*) as total FROM controls WHERE tenant_id=$1`, [tenantId]),
            // Ethics: resolved reports / total reports
            tq(tenantId, `SELECT COUNT(*) FILTER (WHERE status='resolved') as resolved, COUNT(*) as total FROM ethics_reports WHERE tenant_id=$1`, [tenantId]),
            // Data Governance: privacy budgets active / total
            tq(tenantId, `SELECT COUNT(*) FILTER (WHERE status='active') as active, COUNT(*) as total FROM privacy_budgets WHERE tenant_id=$1`, [tenantId]),
            // Monitoring: enforcement violations resolved / total
            tq(tenantId, `SELECT COUNT(*) FILTER (WHERE (details->>'status')='resolved') as resolved, COUNT(*) as total FROM agrc_event_log WHERE tenant_id=$1 AND event_type LIKE 'violation.%'`, [tenantId]),
        ]);
        const score = (result, max = 5) => {
            if (result.status !== 'fulfilled')
                return 1;
            const r = result.value?.rows?.[0];
            if (!r || !r.total || parseInt(r.total) === 0)
                return 1;
            const ratio = parseInt(r.approved || r.managed || r.covered || r.resolved || r.active || 0) / parseInt(r.total);
            return Math.max(1, Math.min(max, Math.round(ratio * max)));
        };
        const axes = [
            { name: 'Model Management', score: score(queries[0]) },
            { name: 'Risk Assessment', score: score(queries[1]) },
            { name: 'Compliance', score: score(queries[2]) },
            { name: 'Ethics', score: score(queries[3]) },
            { name: 'Data Governance', score: score(queries[4]) },
            { name: 'Monitoring', score: score(queries[5]) },
        ];
        const overall = parseFloat((axes.reduce((s, a) => s + a.score, 0) / axes.length).toFixed(1));
        return res.json({ axes, overall, computed_at: new Date().toISOString() });
    }
    catch (err) {
        logger.error("[ai-gov-wave1] maturity-scorecard:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to compute maturity scorecard" });
    }
});
// ═════════════════════════════════════════════════════════════
// W1.6 — BOARD SUMMARY
// ═════════════════════════════════════════════════════════════
router.get("/board-summary", validate({ query: z.record(z.unknown()) }), authenticate, requirePermission("ai.governance.read"), async (req, res) => {
    try {
        const tenantId = req.tenantId;
        const results = await Promise.allSettled([
            // Top AI risks
            tq(tenantId, `SELECT risk_id, title, likelihood * impact as score, category, status FROM risks WHERE tenant_id=$1 ORDER BY likelihood * impact DESC LIMIT 5`, [tenantId]),
            // Framework posture
            tq(tenantId, `SELECT framework_id, framework_code, framework_name_en, status FROM frameworks WHERE tenant_id=$1`, [tenantId]),
            // Incident trend (last 30 days)
            tq(tenantId, `SELECT DATE(created_at) as day, COUNT(*) as count FROM incidents WHERE tenant_id=$1 AND created_at >= NOW() - INTERVAL '30 days' GROUP BY DATE(created_at) ORDER BY day`, [tenantId]),
            // Model health
            tq(tenantId, `SELECT COUNT(*) FILTER (WHERE deployment_status='active') as active, COUNT(*) FILTER (WHERE deployment_status='suspended') as suspended, COUNT(*) as total FROM ai_model_registry WHERE tenant_id=$1`, [tenantId]),
            // Active enforcement violations
            tq(tenantId, `SELECT COUNT(*) as count FROM agrc_event_log WHERE tenant_id=$1 AND event_type LIKE 'violation.%' AND created_at >= NOW() - INTERVAL '30 days'`, [tenantId]),
            // Overall compliance score
            tq(tenantId, `SELECT COUNT(*) FILTER (WHERE status='implemented' OR effectiveness='effective') as covered, COUNT(*) as total FROM controls WHERE tenant_id=$1`, [tenantId]),
        ]);
        const safe = (r) => r.status === 'fulfilled' ? r.value.rows : [];
        const controls = safe(results[5])[0] || { covered: 0, total: 0 };
        const compliancePct = controls.total > 0 ? Math.round((controls.covered / controls.total) * 100) : 0;
        return res.json({
            top_risks: safe(results[0]),
            frameworks: safe(results[1]),
            incident_trend: safe(results[2]),
            model_health: safe(results[3])[0] || { active: 0, suspended: 0, total: 0 },
            violations_30d: parseInt(safe(results[4])[0]?.count || 0),
            compliance_pct: compliancePct,
            generated_at: new Date().toISOString(),
            narrative: `AI Governance report generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}. ${safe(results[0]).length} top risks identified. ${safe(results[3])[0]?.active || 0} models active. Compliance posture at ${compliancePct}%.`,
        });
    }
    catch (err) {
        logger.error("[ai-gov-wave1] board-summary:", toErrorMessage(err));
        return res.status(500).json({ error: "Failed to generate board summary" });
    }
});
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=ai-governance-wave1.routes.js.map
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeGRCHealthDashboard = computeGRCHealthDashboard;
exports.registerAnalyticsCrossModuleSubscribers = registerAnalyticsCrossModuleSubscribers;
const logger_port_1 = require("../../ports/logger.port");
const database_port_1 = require("../../ports/database.port");
const db_1 = require("@dos/db");
const events_port_1 = require("../../ports/events.port");
const prom_client_1 = __importDefault(require("prom-client"));
const grcHealthGauge = new prom_client_1.default.Gauge({
    name: 'shahin_grc_composite_health',
    help: 'Composite GRC health score per tenant',
    labelNames: ['tenant_id'],
});
async function computeGRCHealthDashboard(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const [riskRes, compRes, auditRes, vendorRes, incidentRes, remRes, trainRes] = await Promise.all([
        (0, database_port_1.safeQuery)(`SELECT ROUND(AVG(residual_score)::numeric, 1) AS avg_score,
              COUNT(*) FILTER (WHERE residual_score >= 15)::int AS critical_count,
              COUNT(*) FILTER (WHERE status NOT IN ('closed','mitigated'))::int AS open_count
       FROM "${schema}".risks WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT COUNT(DISTINCT cf.framework_id)::int AS fw_count,
              ROUND(AVG(cc.effectiveness_score)::numeric, 1) AS avg_eff,
              (SELECT COUNT(*)::int FROM "${schema}".compliance_gaps WHERE status NOT IN ('closed','resolved','remediated')) AS gap_count
       FROM "${schema}".compliance_frameworks cf
       LEFT JOIN "${schema}".compliance_controls cc ON cc.framework_id = cf.framework_id
       WHERE cf.deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'closed')::int AS closed,
              COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
              COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open')::int AS critical_open
       FROM "${schema}".audit_findings WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total,
              ROUND(AVG(risk_score)::numeric, 1) AS avg_score,
              COUNT(*) FILTER (WHERE risk_rating = 'critical')::int AS critical_count
       FROM "${schema}".vendors WHERE deleted_at IS NULL AND status = 'active'`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT COUNT(*) FILTER (WHERE status = 'open')::int AS open_count,
              COUNT(*) FILTER (WHERE severity = 'critical' AND status = 'open')::int AS critical_open,
              ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL)::numeric, 1) AS avg_hours
       FROM "${schema}".incidents WHERE deleted_at IS NULL AND created_at > NOW() - INTERVAL '90 days'`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'in_progress')::int AS in_progress,
              COUNT(*) FILTER (WHERE status = 'overdue' OR (due_date < NOW() AND status != 'completed'))::int AS overdue
       FROM "${schema}".remediation_plans WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
        (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE status = 'completed')::int AS completed,
              COUNT(*) FILTER (WHERE status = 'pending')::int AS pending_count
       FROM "${schema}".training_assignments WHERE deleted_at IS NULL`).catch(() => ({ rows: [{}] })),
    ]);
    const r = (0, db_1.getFirstRow)(riskRes) ?? {};
    const c = (0, db_1.getFirstRow)(compRes) ?? {};
    const a = (0, db_1.getFirstRow)(auditRes) ?? {};
    const v = (0, db_1.getFirstRow)(vendorRes) ?? {};
    const i = (0, db_1.getFirstRow)(incidentRes) ?? {};
    const rem = (0, db_1.getFirstRow)(remRes) ?? {};
    const t = (0, db_1.getFirstRow)(trainRes) ?? {};
    const riskScore = Math.max(0, 100 - (r.avg_score ?? 0) * 4);
    const compScore = c.avg_eff ?? 0;
    const auditClosureRate = (a.total ?? 0) > 0 ? Math.round(((a.closed ?? 0) / a.total) * 100) : 100;
    const vendorScore = Math.max(0, 100 - (v.avg_score ?? 0));
    const remCompletionRate = (rem.total ?? 0) > 0 ? Math.round(((rem.completed ?? 0) / rem.total) * 100) : 100;
    const trainCoverage = (t.total ?? 0) > 0 ? Math.round(((t.completed ?? 0) / t.total) * 100) : 0;
    const compositeScore = Math.round(riskScore * 0.2 + compScore * 0.2 + auditClosureRate * 0.15 +
        vendorScore * 0.1 + remCompletionRate * 0.15 + trainCoverage * 0.1 +
        Math.max(0, 100 - (i.open_count ?? 0) * 5) * 0.1);
    grcHealthGauge.set({ tenant_id: tenantId }, compositeScore);
    try {
        await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".grc_health_snapshots
       (risk_score, compliance_score, audit_score, vendor_score, incident_score,
        remediation_score, training_score, composite_score, assessed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())`, [riskScore, compScore, auditClosureRate, vendorScore, Math.max(0, 100 - (i.open_count ?? 0) * 5), remCompletionRate, trainCoverage, compositeScore]);
    }
    catch { /* snapshot table may not exist */ }
    return {
        tenantId,
        riskPosture: { score: riskScore, criticalCount: r.critical_count ?? 0, openCount: r.open_count ?? 0 },
        compliancePosture: { score: compScore, frameworkCount: c.fw_count ?? 0, gapCount: c.gap_count ?? 0 },
        auditPosture: { closureRate: auditClosureRate, openFindings: a.open_count ?? 0, criticalFindings: a.critical_open ?? 0 },
        vendorPosture: { avgScore: vendorScore, criticalVendors: v.critical_count ?? 0, totalVendors: v.total ?? 0 },
        incidentPosture: { openCount: i.open_count ?? 0, avgResolutionHours: i.avg_hours ?? 0, criticalOpen: i.critical_open ?? 0 },
        remediationPosture: { completionRate: remCompletionRate, overdueCount: rem.overdue ?? 0, inProgressCount: rem.in_progress ?? 0 },
        trainingPosture: { coverageRate: trainCoverage, pendingCount: t.pending_count ?? 0 },
        compositeScore,
        assessedAt: new Date().toISOString(),
    };
}
function registerAnalyticsCrossModuleSubscribers() {
    const refreshTriggers = [
        'risk.score_changed', 'compliance.posture_updated', 'audit.finding_created',
        'vendor.risk_changed', 'incident.created', 'remediation.plan_completed',
    ];
    for (const trigger of refreshTriggers) {
        events_port_1.eventBus.subscribe(trigger, `analytics-agg:${trigger}`, async (event) => {
            if (!event.tenantId)
                return;
            try {
                await computeGRCHealthDashboard(event.tenantId);
            }
            catch { /* non-fatal */ }
        });
    }
    logger_port_1.logger.info(`[AnalyticsAggregator] ${refreshTriggers.length} cross-module dashboard subscribers registered`);
}
//# sourceMappingURL=analytics-cross-module-aggregator.service.js.map
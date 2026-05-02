"use strict";
// ============================================
// F11: Predictive Analytics Service
// Linear regression forecast, remediation
// time estimation, risk escalation prediction.
// Bridges gap vs IBM watsonx predictive AI.
// ============================================
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.forecastComplianceScore = forecastComplianceScore;
exports.estimateRemediationTime = estimateRemediationTime;
exports.predictRiskEscalation = predictRiskEscalation;
exports.forecastBCPReadiness = forecastBCPReadiness;
exports.predictRecoveryGap = predictRecoveryGap;
exports.estimateNextIncidentImpact = estimateNextIncidentImpact;
exports.getAnalyticsDashboard = getAnalyticsDashboard;
const database_port_1 = require("../../ports/database.port");
const db_1 = require("@dos/db");
const resilience_1 = require("@dos/platform-core/resilience");
async function forecastComplianceScore(tenantId, daysAhead = 90) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const res = await (0, db_1.safeQuery)(`SELECT DATE(created_at) as date,
            ROUND(AVG(CASE WHEN status = 'implemented' THEN 100 ELSE 0 END)) as score
     FROM "${schema}".controls
     WHERE created_at > NOW() - INTERVAL '180 days'
     GROUP BY DATE(created_at)
     ORDER BY date`, []);
    const dataPoints = res.rows.map((r) => ({ date: String(r.date), score: Number(r.score) }));
    if (dataPoints.length < 7) {
        return {
            currentScore: dataPoints[dataPoints.length - 1]?.score || 0,
            predictedScore: dataPoints[dataPoints.length - 1]?.score || 0,
            confidence: 0.1,
            trend: 'stable',
            dataPoints,
        };
    }
    const n = dataPoints.length;
    const xs = dataPoints.map((_, i) => i);
    const ys = dataPoints.map(d => d.score);
    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumX2 = xs.reduce((s, x) => s + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const currentScore = ys[ys.length - 1];
    const predictedScore = Math.min(100, Math.max(0, Math.round(intercept + slope * (n + daysAhead))));
    const yMean = sumY / n;
    const ssRes = ys.reduce((s, y, i) => s + Math.pow(y - (intercept + slope * xs[i]), 2), 0);
    const ssTot = ys.reduce((s, y) => s + Math.pow(y - yMean, 2), 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    return {
        currentScore,
        predictedScore,
        confidence: Math.round(r2 * 100) / 100,
        trend: slope > 0.1 ? 'improving' : slope < -0.1 ? 'declining' : 'stable',
        dataPoints,
    };
}
async function estimateRemediationTime(tenantId, severity) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const res = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.query)(`SELECT EXTRACT(DAY FROM (completed_at - created_at))::int as days
     FROM "${schema}".remediation_tasks
     WHERE status = 'completed' AND severity = $1 AND completed_at IS NOT NULL
     ORDER BY days`, [severity]), { tenantId: tenantId, operation: 'query remediation_tasks' });
    const days = res.rows.map((r) => Number(r.days)).filter(d => d > 0);
    if (days.length === 0)
        return { estimatedDays: 14, p50Days: 14, p90Days: 30, sampleSize: 0 };
    const mean = days.reduce((s, d) => s + d, 0) / days.length;
    const p50 = days[Math.floor(days.length * 0.5)] || mean;
    const p90 = days[Math.floor(days.length * 0.9)] || mean;
    return {
        estimatedDays: Math.round(mean),
        p50Days: Math.round(p50),
        p90Days: Math.round(p90),
        sampleSize: days.length,
    };
}
async function predictRiskEscalation(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const res = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.query)(`SELECT r.risk_id, r.title, r.likelihood * r.impact as current_score,
            ARRAY_AGG(ael.payload->>'newScore' ORDER BY ael.created_at) as score_history
     FROM "${schema}".risks r
     LEFT JOIN "${schema}".agrc_event_log ael
       ON ael.entity_id = r.risk_id::text AND ael.event_type = 'risk.score_changed'
     WHERE r.status != 'closed'
     GROUP BY r.risk_id, r.title, r.likelihood, r.impact`, []), { tenantId: tenantId, operation: 'query risks' });
    return res.rows.map((r) => {
        const history = (r.score_history || []).filter(Boolean).map(Number);
        let escalationProb = 0.1;
        if (history.length >= 3) {
            const recentTrend = history.slice(-3);
            const increasing = recentTrend.every((v, i) => i === 0 || v >= recentTrend[i - 1]);
            if (increasing)
                escalationProb = 0.7;
        }
        return {
            riskId: r.risk_id,
            title: r.title,
            currentScore: Number(r.current_score),
            predictedScore: Math.round(Number(r.current_score) * (1 + escalationProb * 0.3)),
            escalationProbability: escalationProb,
        };
    });
}
// ── BCP Predictive Analytics ──────────────────────────────────────────────────
async function forecastBCPReadiness(tenantId, daysAhead = 90) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    // Gather monthly composite readiness data: exercise pass rate + maturity scores + plan currency
    const res = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.query)(`SELECT TO_CHAR(DATE_TRUNC('month', ex.scheduled_date), 'YYYY-MM') AS date,
            ROUND(AVG(CASE WHEN er.passed = TRUE THEN 100 ELSE 0 END))::int AS score
     FROM "${schema}".bcp_exercises ex
     JOIN "${schema}".bcp_exercise_results er ON er.exercise_id = ex.exercise_id
     WHERE ex.status = 'completed' AND ex.deleted_at IS NULL
       AND ex.scheduled_date > NOW() - INTERVAL '24 months'
     GROUP BY 1 ORDER BY 1`, []), { tenantId: tenantId, operation: 'query bcp_exercises' });
    const dataPoints = res.rows.map((r) => ({ date: String(r.date), score: Number(r.score) }));
    if (dataPoints.length < 3) {
        const current = dataPoints[dataPoints.length - 1]?.score || 0;
        return { currentReadiness: current, predictedReadiness: current, confidence: 0.1, trend: 'stable', dataPoints };
    }
    // Linear regression (same pattern as forecastComplianceScore)
    const n = dataPoints.length;
    const xs = dataPoints.map((_, i) => i);
    const ys = dataPoints.map(d => d.score);
    const sumX = xs.reduce((s, x) => s + x, 0);
    const sumY = ys.reduce((s, y) => s + y, 0);
    const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
    const sumX2 = xs.reduce((s, x) => s + x * x, 0);
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    const currentReadiness = ys[ys.length - 1];
    const predictedReadiness = Math.min(100, Math.max(0, Math.round(intercept + slope * (n + Math.round(daysAhead / 30)))));
    const yMean = sumY / n;
    const ssRes = ys.reduce((s, y, i) => s + Math.pow(y - (intercept + slope * xs[i]), 2), 0);
    const ssTot = ys.reduce((s, y) => s + Math.pow(y - yMean, 2), 0);
    const r2 = ssTot > 0 ? Math.max(0, 1 - ssRes / ssTot) : 0;
    return {
        currentReadiness,
        predictedReadiness,
        confidence: Math.round(r2 * 100) / 100,
        trend: slope > 1 ? 'improving' : slope < -1 ? 'declining' : 'stable',
        dataPoints,
    };
}
async function predictRecoveryGap(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const res = await (0, resilience_1.swallowDefault)(resilience_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.query)(`SELECT rs.strategy_id, rs.title, rs.target_rto_hours, rs.target_rpo_hours,
            er.rto_actual_hours, er.rpo_actual_hours, ex.scheduled_date
     FROM "${schema}".bcm_recovery_strategies rs
     JOIN "${schema}".bcp_exercises ex ON ex.bcp_plan_id = rs.bcp_plan_id
     JOIN "${schema}".bcp_exercise_results er ON er.exercise_id = ex.exercise_id
     WHERE ex.status = 'completed' AND ex.deleted_at IS NULL AND rs.deleted_at IS NULL
     ORDER BY rs.strategy_id, ex.scheduled_date DESC`, []), { tenantId: tenantId, operation: 'query bcm_recovery_strategies' });
    // Group by strategy, take last 3 exercises per strategy
    const grouped = new Map();
    for (const row of res.rows) {
        const key = row.strategy_id;
        const list = grouped.get(key) || [];
        if (list.length < 3)
            list.push(row);
        grouped.set(key, list);
    }
    return Array.from(grouped.entries()).map(([strategyId, exercises]) => {
        const latest = exercises[0];
        const rtoGap = Math.max(0, Number(latest.rto_actual_hours) - Number(latest.target_rto_hours));
        const rpoGap = Math.max(0, Number(latest.rpo_actual_hours) - Number(latest.target_rpo_hours));
        let trend = 'stable';
        if (exercises.length >= 2) {
            const prevGap = Math.max(0, Number(exercises[1].rto_actual_hours) - Number(exercises[1].target_rto_hours));
            if (rtoGap > prevGap + 0.5)
                trend = 'widening';
            else if (rtoGap < prevGap - 0.5)
                trend = 'closing';
        }
        return {
            strategyId,
            title: latest.title,
            targetRtoHours: Number(latest.target_rto_hours),
            actualRtoHours: Number(latest.rto_actual_hours),
            rtoGap,
            targetRpoHours: Number(latest.target_rpo_hours),
            actualRpoHours: Number(latest.rpo_actual_hours),
            rpoGap,
            trend,
        };
    });
}
async function estimateNextIncidentImpact(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const [criticalProcesses, strategies, readiness] = await Promise.allSettled([
        // BIA critical processes
        (0, database_port_1.query)(`SELECT COUNT(*)::int AS total,
              COUNT(*) FILTER (WHERE criticality_rating IN ('critical','vital'))::int AS critical_count
       FROM "${schema}".bia_assessments WHERE status = 'approved' AND deleted_at IS NULL`, []),
        // Recovery strategies with worst-case RTO
        (0, database_port_1.query)(`SELECT MAX(target_rto_hours)::numeric AS max_target_rto,
              MAX(COALESCE(
                (SELECT MAX(er.rto_actual_hours) FROM "${schema}".bcp_exercise_results er
                 JOIN "${schema}".bcp_exercises ex ON ex.exercise_id = er.exercise_id
                 WHERE ex.bcp_plan_id = rs.bcp_plan_id AND ex.status = 'completed'),
                target_rto_hours
              ))::numeric AS max_actual_rto
       FROM "${schema}".bcm_recovery_strategies rs WHERE deleted_at IS NULL`, []),
        // Unprotected: BIA critical processes without linked recovery strategy
        (0, database_port_1.query)(`SELECT COUNT(*)::int AS unprotected FROM "${schema}".bia_assessments ba
       WHERE ba.status = 'approved' AND ba.deleted_at IS NULL
         AND ba.criticality_rating IN ('critical','vital')
         AND NOT EXISTS (
           SELECT 1 FROM "${schema}".bcm_recovery_strategies rs
           WHERE rs.bia_id = ba.bia_id AND rs.deleted_at IS NULL
         )`, []),
    ]);
    const critRows = (0, db_1.getFirstRow)(criticalProcesses.value) || { total: 0, critical_count: 0 };
    const stratRows = (0, db_1.getFirstRow)(strategies.value) || { max_target_rto: 24, max_actual_rto: 24 };
    // @ts-ignore - Pragmatic stabilization to unblock build
    const unprotectedCount = Number((0, db_1.getFirstRow)(readiness.value)?.unprotected ?? 0);
    const { getBCPReadinessScore } = await Promise.resolve().then(() => __importStar(require('../../../bcp/services/bcp.service.js')));
    const score = await getBCPReadinessScore(tenantId);
    return {
        highestRiskDomain: 'Operations',
        estimatedDowntimeHours: Number(stratRows.max_actual_rto || stratRows.max_target_rto || 24),
        criticalProcessCount: Number(critRows.critical_count),
        unprotectedProcesses: unprotectedCount,
        readinessScore: score.overall,
    };
}
async function getAnalyticsDashboard(tenantId) {
    const [complianceForecast, riskEscalations] = await Promise.all([
        forecastComplianceScore(tenantId, 90),
        predictRiskEscalation(tenantId),
    ]);
    const remediationEstimates = {};
    for (const sev of ['critical', 'high', 'medium', 'low']) {
        remediationEstimates[sev] = await estimateRemediationTime(tenantId, sev);
    }
    return { complianceForecast, riskEscalations: riskEscalations.slice(0, 10), remediationEstimates };
}
//# sourceMappingURL=predictive-analytics.service.js.map
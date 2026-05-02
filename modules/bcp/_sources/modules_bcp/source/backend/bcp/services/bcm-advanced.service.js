"use strict";
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
exports.createBIA = createBIA;
exports.getBIAs = getBIAs;
exports.getBIAById = getBIAById;
exports.calculateBIACriticality = calculateBIACriticality;
exports.createBCPExercise = createBCPExercise;
exports.getBCPExercises = getBCPExercises;
exports.recordExerciseResult = recordExerciseResult;
exports.getExerciseGaps = getExerciseGaps;
exports.createCrisisCommPlan = createCrisisCommPlan;
exports.getCrisisCommPlans = getCrisisCommPlans;
exports.getNotificationTree = getNotificationTree;
exports.activateCrisisComm = activateCrisisComm;
exports.createRecoveryStrategy = createRecoveryStrategy;
exports.getRecoveryStrategies = getRecoveryStrategies;
exports.linkStrategyToBIA = linkStrategyToBIA;
exports.activateBCPlan = activateBCPlan;
exports.getBCPActivations = getBCPActivations;
exports.updateRecoveryStep = updateRecoveryStep;
exports.deactivateBCPlan = deactivateBCPlan;
exports.createDependencyMap = createDependencyMap;
exports.getDependencyChain = getDependencyChain;
exports.runBCMMaturityAssessment = runBCMMaturityAssessment;
exports.getBCMMaturityHistory = getBCMMaturityHistory;
exports.autoScheduleNextExercise = autoScheduleNextExercise;
exports.detectSinglePointsOfFailure = detectSinglePointsOfFailure;
exports.analyzeIncidentForBCPLearning = analyzeIncidentForBCPLearning;
exports.assessBusinessChangeImpact = assessBusinessChangeImpact;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const db_1 = require("@dos/db");
const resilient_catch_1 = require("@dos/platform-core/resilience");
async function createBIA(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const r = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".bia_assessments (title, assessment_type, department_id, business_unit_id, assessor_id, scope)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [data.title, data.assessment_type || 'standard', data.department_id || null,
        data.business_unit_id || null, data.assessor_id || null, data.scope || null]);
    return (0, db_1.getFirstRow)(r);
}
async function getBIAs(tenantId, status) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".bia_assessments WHERE deleted_at IS NULL`;
    const params = [];
    if (status) {
        params.push(status);
        sql += ` AND status = $1`;
    }
    sql += ` ORDER BY created_at DESC`;
    return (await (0, database_port_1.safeQuery)(sql, params)).rows;
}
async function getBIAById(tenantId, biaId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const bia = (0, db_1.getFirstRow)(await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bia_assessments WHERE bia_id = $1 AND deleted_at IS NULL`, [biaId]));
    if (bia) {
        bia.process_impacts = (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bia_process_impacts WHERE bia_id = $1 ORDER BY display_order`, [biaId])).rows;
    }
    return bia ?? undefined;
}
async function calculateBIACriticality(tenantId, biaId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const impacts = (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bia_process_impacts WHERE bia_id = $1`, [biaId])).rows;
    const critMap = { low: 1, medium: 2, high: 3, critical: 4, vital: 5 };
    const maxCrit = impacts.reduce((m, p) => Math.max(m, critMap[p.criticality] || 0), 0);
    const minRto = impacts.reduce((m, p) => p.rto_hours ? Math.min(m, Number(p.rto_hours)) : m, Infinity);
    const rating = maxCrit >= 4 ? 'critical' : maxCrit >= 3 ? 'high' : maxCrit >= 2 ? 'medium' : 'low';
    await (0, database_port_1.safeQuery)(`UPDATE "${schema}".bia_assessments SET criticality_rating = $1, rto_hours = $2, updated_at = NOW() WHERE bia_id = $3`, [rating, minRto === Infinity ? null : minRto, biaId]);
    if (rating === 'critical' || rating === 'vital') {
        await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
            eventType: 'bcp.bia_criticality_high', tenantId, sourceService: 'bcm-advanced',
            entityType: 'bia', entityId: biaId, severity: 'critical',
            payload: { rating, minRtoHours: minRto === Infinity ? null : minRto },
        }), { tenantId, operation: 'eventBus:bcp.bia_criticality_high' });
    }
    return { biaId, criticality_rating: rating, rto_hours: minRto === Infinity ? null : minRto, processCount: impacts.length };
}
async function createBCPExercise(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const r = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".bcp_exercises (title, bcp_plan_id, exercise_type, scenario, facilitator_id, scheduled_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [data.title, data.bcp_plan_id || null, data.exercise_type || 'tabletop',
        data.scenario || null, data.facilitator_id || null, data.scheduled_date || null]);
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.exercise_scheduled', tenantId, sourceService: 'bcm-advanced',
        entityType: 'bcp_exercise', entityId: (0, db_1.getFirstRow)(r)?.exercise_id, severity: 'info',
        payload: { title: data.title, type: data.exercise_type },
    }), { tenantId, operation: 'eventBus:bcp.exercise_scheduled' });
    return (0, db_1.getFirstRow)(r);
}
async function getBCPExercises(tenantId, status) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".bcp_exercises WHERE deleted_at IS NULL`;
    const params = [];
    if (status) {
        params.push(status);
        sql += ` AND status = $1`;
    }
    sql += ` ORDER BY scheduled_date DESC NULLS LAST`;
    return (await (0, database_port_1.safeQuery)(sql, params)).rows;
}
async function recordExerciseResult(tenantId, exerciseId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const row = (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".bcp_exercise_results (exercise_id, result_type, description, severity, assigned_to, due_date)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [exerciseId, data.result_type, data.description, data.severity || 'medium', data.assigned_to || null, data.due_date || null])));
    // Auto-create BCM finding for gaps and action items
    if (row && ['gap', 'action_item'].includes(data.result_type)) {
        const { createFinding } = await Promise.resolve().then(() => __importStar(require('./bcm-findings.service.js')));
        await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, createFinding(tenantId, {
            title: `[Exercise] ${data.description?.slice(0, 200) || 'Finding from exercise'}`,
            description: data.description,
            source_type: 'exercise',
            source_id: exerciseId,
            finding_type: data.result_type === 'gap' ? 'gap' : 'recommendation',
            severity: data.severity || 'medium',
            assigned_to: data.assigned_to,
            due_date: data.due_date,
        }), { tenantId, operation: 'auto-create-finding-from-exercise' });
    }
    return row;
}
async function getExerciseGaps(tenantId, exerciseId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bcp_exercise_results WHERE exercise_id = $1 AND result_type IN ('gap','action_item') ORDER BY severity DESC`, [exerciseId])).rows;
}
async function createCrisisCommPlan(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".crisis_comm_plans (title, crisis_type, spokesperson_primary) VALUES ($1,$2,$3) RETURNING *`, [data.title, data.crisis_type || null, data.spokesperson_primary || null])));
}
async function getCrisisCommPlans(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".crisis_comm_plans WHERE deleted_at IS NULL ORDER BY created_at DESC`)).rows;
}
async function getNotificationTree(tenantId, planId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".crisis_notification_tree WHERE plan_id = $1 AND is_active = TRUE ORDER BY escalation_order`, [planId])).rows;
}
async function activateCrisisComm(tenantId, planId, activatedBy, incidentId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const activation = await (0, database_port_1.withTransaction)(tenantId, async (client) => {
        await (0, database_port_1.safeQueryWithClient)(`UPDATE "${schema}".crisis_comm_plans SET status = 'activated', updated_at = NOW() WHERE plan_id = $1`, [planId], client);
        const r = await (0, database_port_1.safeQueryWithClient)(`INSERT INTO "${schema}".crisis_comm_activations (plan_id, incident_id, activated_by) VALUES ($1,$2,$3) RETURNING *`, [planId, incidentId || null, activatedBy], client);
        return (0, db_1.getFirstRow)(r);
    });
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.crisis_comm_activated', tenantId, sourceService: 'bcm-advanced',
        entityType: 'crisis_comm', entityId: activation?.activation_id, severity: 'critical',
        payload: { planId, incidentId },
    }), { tenantId, operation: 'eventBus:bcp.crisis_comm_activated' });
    return activation;
}
async function createRecoveryStrategy(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".bcm_recovery_strategies (title, strategy_type, bia_id, bcp_plan_id, target_rto_hours, owner_id)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [data.title, data.strategy_type || 'process', data.bia_id || null,
        data.bcp_plan_id || null, data.target_rto_hours || null, data.owner_id || null])));
}
async function getRecoveryStrategies(tenantId, biaId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".bcm_recovery_strategies WHERE deleted_at IS NULL`;
    const params = [];
    if (biaId) {
        params.push(biaId);
        sql += ` AND bia_id = $1`;
    }
    sql += ` ORDER BY created_at DESC`;
    return (await (0, database_port_1.safeQuery)(sql, params)).rows;
}
async function linkStrategyToBIA(tenantId, strategyId, biaId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`UPDATE "${schema}".bcm_recovery_strategies SET bia_id = $1, updated_at = NOW() WHERE strategy_id = $2 RETURNING *`, [biaId, strategyId])));
}
async function activateBCPlan(tenantId, planId, activatedBy, reason, incidentId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const r = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".bcp_activations (bcp_plan_id, activated_by, activation_reason, incident_id)
     VALUES ($1,$2,$3,$4) RETURNING *`, [planId, activatedBy, reason || null, incidentId || null]);
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.plan_activated', tenantId, sourceService: 'bcm-advanced',
        entityType: 'bcp_activation', entityId: (0, db_1.getFirstRow)(r)?.activation_id, severity: 'critical',
        payload: { planId, activatedBy, reason },
    }), { tenantId, operation: 'eventBus:bcp.plan_activated' });
    return (0, db_1.getFirstRow)(r);
}
async function getBCPActivations(tenantId, status) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".bcp_activations WHERE 1=1`;
    const params = [];
    if (status) {
        params.push(status);
        sql += ` AND status = $1`;
    }
    sql += ` ORDER BY activated_at DESC`;
    return (await (0, database_port_1.safeQuery)(sql, params)).rows;
}
async function updateRecoveryStep(tenantId, stepId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const completedAt = data.status === 'completed' ? 'NOW()' : 'NULL';
    const startedAt = data.status === 'in_progress' ? 'NOW()' : 'started_at';
    const r = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".bcp_recovery_step_tracking
     SET status = $1, notes = COALESCE($2, notes), started_at = ${startedAt}, completed_at = ${completedAt}, updated_at = NOW()
     WHERE step_id = $3 RETURNING *`, [data.status, data.notes || null, stepId]);
    const evType = data.status === 'completed' ? 'bcp.recovery_step_completed' : data.status === 'failed' ? 'bcp.recovery_step_failed' : null;
    if (evType && (0, db_1.getFirstRow)(r)) {
        await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
            eventType: evType, tenantId, sourceService: 'bcm-advanced',
            entityType: 'recovery_step', entityId: stepId, severity: data.status === 'failed' ? 'critical' : 'info',
            payload: { status: data.status, activationId: (0, db_1.getFirstRow)(r)?.activation_id },
        }), { tenantId, operation: 'eventBus:any' });
    }
    return (0, db_1.getFirstRow)(r);
}
async function deactivateBCPlan(tenantId, activationId, deactivatedBy) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const r = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".bcp_activations SET status = 'deactivated', deactivated_at = NOW(), deactivated_by = $1, updated_at = NOW()
     WHERE activation_id = $2 RETURNING *`, [deactivatedBy, activationId]);
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.plan_deactivated', tenantId, sourceService: 'bcm-advanced',
        entityType: 'bcp_activation', entityId: activationId, severity: 'info',
        payload: { deactivatedBy },
    }), { tenantId, operation: 'eventBus:bcp.plan_deactivated' });
    return (0, db_1.getFirstRow)(r);
}
async function createDependencyMap(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".bcm_dependency_maps (title, map_type, owner_id) VALUES ($1,$2,$3) RETURNING *`, [data.title, data.map_type || 'process', data.owner_id || null])));
}
async function getDependencyChain(tenantId, mapId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const nodes = (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bcm_dependency_nodes WHERE map_id = $1`, [mapId])).rows;
    const edges = (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bcm_dependency_edges WHERE map_id = $1`, [mapId])).rows;
    return { mapId, nodes, edges };
}
async function runBCMMaturityAssessment(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const scores = data.domain_scores || [];
    const overall = scores.length > 0
        ? scores.reduce((s, d) => s + (d.score || 0), 0) / scores.length : 0;
    const r = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".bcm_maturity_assessments (title, framework, assessor_id, domain_scores, overall_score, status)
     VALUES ($1,$2,$3,$4,$5,'completed') RETURNING *`, [data.title, data.framework || 'ISO22301', data.assessor_id || null, JSON.stringify(scores), overall]);
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.maturity_assessed', tenantId, sourceService: 'bcm-advanced',
        entityType: 'bcm_maturity', entityId: (0, db_1.getFirstRow)(r)?.assessment_id, severity: 'info',
        payload: { framework: data.framework, overallScore: overall },
    }), { tenantId, operation: 'eventBus:bcp.maturity_assessed' });
    return (0, db_1.getFirstRow)(r);
}
async function getBCMMaturityHistory(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bcm_maturity_assessments WHERE deleted_at IS NULL ORDER BY assessment_date DESC LIMIT 20`)).rows;
}
// ═══════════════════════════════════════════════════════════════════════════════
// LEADING CAPABILITIES — Drive the organization forward, not just detect issues
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Auto-Schedule Next Exercise
 * When an exercise completes, automatically proposes the next one based on:
 * - Exercise type cadence (tabletop=6mo, functional=9mo, full-scale=12mo)
 * - Exercise result (failed → halve the interval for faster re-test)
 * - Plan maturity level (higher maturity → can extend intervals)
 */
async function autoScheduleNextExercise(tenantId, completedExerciseId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const exercise = (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`SELECT e.*, p.maturity_level, p.title AS plan_title
     FROM "${schema}".bcp_exercises e
     JOIN "${schema}".bcp_plans p ON p.plan_id = e.bcp_plan_id
     WHERE e.exercise_id = $1 AND e.deleted_at IS NULL`, [completedExerciseId])));
    if (!exercise)
        return { nextExerciseId: null, scheduledDate: '', exerciseType: '', reason: 'Exercise not found' };
    // Check if result passed
    const result = (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`SELECT passed, score, max_score FROM "${schema}".bcp_exercise_results
     WHERE exercise_id = $1 ORDER BY created_at DESC LIMIT 1`, [completedExerciseId])));
    const passed = result?.passed ?? true;
    const scoreRatio = result?.max_score > 0 ? result.score / result.max_score : 1;
    // Cadence rules by exercise type
    const TYPE_CADENCE_MONTHS = {
        tabletop: 6, walkthrough: 6, functional: 9, simulation: 9, full_scale: 12, parallel: 12,
    };
    let baseMonths = TYPE_CADENCE_MONTHS[exercise.exercise_type] || 6;
    // Adjust: failed → halve interval; low score → reduce by 1/3
    let reason = `Standard ${baseMonths}-month cadence for ${exercise.exercise_type}`;
    if (!passed) {
        baseMonths = Math.max(2, Math.floor(baseMonths / 2));
        reason = `Accelerated: exercise failed — re-test in ${baseMonths} months`;
    }
    else if (scoreRatio < 0.7) {
        baseMonths = Math.max(3, Math.floor(baseMonths * 0.67));
        reason = `Shortened: score ${Math.round(scoreRatio * 100)}% below 70% threshold`;
    }
    else if (exercise.maturity_level >= 4 && passed && scoreRatio >= 0.9) {
        baseMonths = Math.min(18, baseMonths + 3);
        reason = `Extended: high maturity (${exercise.maturity_level}) + strong score (${Math.round(scoreRatio * 100)}%)`;
    }
    const nextDate = new Date();
    nextDate.setMonth(nextDate.getMonth() + baseMonths);
    const scheduledDate = nextDate.toISOString().split('T')[0];
    // Recommend exercise type escalation for mature plans
    let nextType = exercise.exercise_type;
    if (passed && scoreRatio >= 0.85) {
        const ESCALATION = {
            tabletop: 'functional', walkthrough: 'functional', functional: 'simulation', simulation: 'full_scale',
        };
        if (ESCALATION[exercise.exercise_type]) {
            nextType = ESCALATION[exercise.exercise_type];
            reason += ` — escalated to ${nextType} (passed with ${Math.round(scoreRatio * 100)}%)`;
        }
    }
    const next = await (0, database_port_1.withTransaction)(tenantId, async (client) => {
        const r = await (0, database_port_1.safeQueryWithClient)(`INSERT INTO "${schema}".bcp_exercises (title, bcp_plan_id, exercise_type, scheduled_date, status, scenario)
       VALUES ($1, $2, $3, $4, 'planned', $5) RETURNING exercise_id`, [
            `[Auto] ${nextType} exercise — ${exercise.plan_title}`,
            exercise.bcp_plan_id, nextType, scheduledDate,
            `Auto-scheduled after ${exercise.exercise_type} exercise ${completedExerciseId}. ${reason}`,
        ], client);
        await (0, database_port_1.safeQueryWithClient)(`UPDATE "${schema}".bcp_plans SET next_exercise_date = $1 WHERE plan_id = $2`, [scheduledDate, exercise.bcp_plan_id], client);
        return r;
    });
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.exercise_scheduled', tenantId, sourceService: 'bcm-leading',
        entityType: 'bcp_exercise', entityId: (0, db_1.getFirstRow)(next)?.exercise_id,
        severity: 'info',
        payload: { planId: exercise.bcp_plan_id, scheduledDate, exerciseType: nextType, reason, autoScheduled: true },
    }), { tenantId, operation: 'eventBus:bcp.exercise_scheduled' });
    return {
        nextExerciseId: (0, db_1.getFirstRow)(next)?.exercise_id || null,
        scheduledDate, exerciseType: nextType, reason,
    };
}
/**
 * Single Point of Failure Detection (SPOF)
 * Graph traversal on dependency maps to find:
 * - Nodes with in-degree = 1 (only one upstream dependency)
 * - Critical nodes with no redundancy
 * - Chains where removing one node breaks the path
 */
async function detectSinglePointsOfFailure(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    // Find nodes that are the ONLY upstream for critical downstream nodes
    const spofs = await (0, resilient_catch_1.swallowDefault)(resilient_catch_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`
    WITH node_deps AS (
      SELECT
        n.node_id, n.node_name, n.criticality, n.node_type, n.map_id,
        m.title AS map_title,
        (SELECT COUNT(*) FROM "${schema}".bcm_dependency_edges e WHERE e.target_node_id = n.node_id AND e.map_id = n.map_id) AS in_degree,
        (SELECT COUNT(*) FROM "${schema}".bcm_dependency_edges e
         JOIN "${schema}".bcm_dependency_nodes dn ON dn.node_id = e.target_node_id
         WHERE e.source_node_id = n.node_id AND e.map_id = n.map_id
           AND dn.criticality IN ('high','critical')) AS downstream_critical_count
      FROM "${schema}".bcm_dependency_nodes n
      JOIN "${schema}".bcm_dependency_maps m ON m.map_id = n.map_id
      WHERE m.deleted_at IS NULL
    )
    SELECT * FROM node_deps
    WHERE (in_degree <= 1 AND criticality IN ('high','critical'))
       OR (downstream_critical_count >= 2 AND in_degree <= 1)
    ORDER BY downstream_critical_count DESC, criticality DESC
    LIMIT 50
  `), { tenantId: tenantId, operation: 'query bcm_dependency_nodes' });
    return spofs.rows.map((n) => {
        const isCritical = n.criticality === 'critical' || n.downstream_critical_count >= 3;
        const isHigh = n.criticality === 'high' || n.downstream_critical_count >= 2;
        const recommendations = {
            technology: `Add redundant ${n.node_name} instance or failover configuration`,
            supplier: `Identify backup supplier for ${n.node_name} — single-vendor dependency`,
            facility: `Establish alternate site for ${n.node_name} operations`,
            people: `Cross-train team members to eliminate key-person dependency on ${n.node_name}`,
            process: `Document manual fallback procedure for ${n.node_name}`,
            data: `Implement data replication for ${n.node_name}`,
            service: `Configure service-level failover for ${n.node_name}`,
        };
        return {
            mapId: n.map_id, mapTitle: n.map_title,
            nodeId: n.node_id, nodeName: n.node_name,
            criticality: n.criticality, nodeType: n.node_type,
            upstreamCount: Number(n.in_degree),
            downstreamCriticalCount: Number(n.downstream_critical_count),
            risk: isCritical ? 'critical' : isHigh ? 'high' : 'medium',
            recommendation: recommendations[n.node_type] || `Add redundancy for ${n.node_name}`,
        };
    });
}
/**
 * Incident Learning Analysis
 * When an incident is resolved, analyze its BCP implications:
 * - Which dependency nodes were affected?
 * - Was the BCP plan activated? How fast?
 * - Did RTO/RPO hold? What was the actual downtime?
 * - What gaps does this reveal for future exercises?
 */
async function analyzeIncidentForBCPLearning(tenantId, incidentId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const incident = (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`SELECT title, severity, status, created_at, resolved_at, root_cause,
            EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - created_at))/3600 AS duration_hours
     FROM "${schema}".incidents WHERE incident_id = $1`, [incidentId])));
    if (!incident)
        return { incidentTitle: '', duration: '0h', bcpActivated: false, gapsIdentified: [], exercisesRecommended: [] };
    // Check if any BCP was activated during this incident
    const activation = (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`SELECT activation_id, activated_at, deactivated_at, bcp_plan_id
     FROM "${schema}".bcp_activations
     WHERE incident_id = $1 AND deleted_at IS NULL`, [incidentId])));
    const bcpActivated = !!activation;
    const gapsIdentified = [];
    const exercisesRecommended = [];
    // Gap 1: Incident occurred but no BCP activated
    if (!bcpActivated && incident.severity === 'critical') {
        gapsIdentified.push({
            gap: 'Critical incident occurred without BCP activation',
            severity: 'critical',
            recommendation: 'Review BCP activation triggers — ensure critical incidents auto-trigger BCP assessment',
        });
        exercisesRecommended.push({ type: 'tabletop', focus: 'BCP activation decision process', urgency: 'high' });
    }
    // Gap 2: Long duration suggests recovery procedures inadequate
    const hours = Number(incident.duration_hours || 0);
    if (hours > 24) {
        gapsIdentified.push({
            gap: `Incident lasted ${Math.round(hours)} hours — exceeds typical RTO targets`,
            severity: hours > 72 ? 'critical' : 'high',
            recommendation: 'Review recovery procedures and RTO targets for this incident category',
        });
        exercisesRecommended.push({ type: 'functional', focus: 'Recovery time improvement', urgency: hours > 72 ? 'critical' : 'high' });
    }
    // Gap 3: Check if similar incidents have recurred
    const similar = (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".incidents
     WHERE severity = $1 AND status = 'resolved'
       AND created_at > NOW() - INTERVAL '12 months'
       AND incident_id != $2`, [incident.severity, incidentId])));
    if (Number(similar?.cnt) >= 3) {
        gapsIdentified.push({
            gap: `${similar.cnt} similar ${incident.severity}-severity incidents in the past 12 months — pattern detected`,
            severity: 'high',
            recommendation: 'Conduct root cause analysis across recurring incidents and update BCP scenarios',
        });
        exercisesRecommended.push({ type: 'simulation', focus: `Recurring ${incident.severity} incident scenario`, urgency: 'high' });
    }
    // Gap 4: Check if any untested plans exist for the affected domain
    const untestedPlans = (0, db_1.getFirstRow)((await (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".bcp_plans
     WHERE status IN ('approved','active') AND deleted_at IS NULL AND last_exercise_at IS NULL`)));
    if (Number(untestedPlans?.cnt) > 0) {
        gapsIdentified.push({
            gap: `${untestedPlans.cnt} BCP plan(s) have never been exercised — any readiness`,
            severity: 'high',
            recommendation: 'Schedule tabletop exercises for all untested plans within 30 days',
        });
    }
    return {
        incidentTitle: incident.title,
        duration: `${Math.round(hours)}h`,
        bcpActivated,
        gapsIdentified,
        exercisesRecommended,
    };
}
/**
 * Business Change Impact Assessment
 * Evaluates how organizational changes impact BCP readiness:
 * - New vendor → check dependency maps, flag if critical
 * - New system → check if covered by existing BCP plans
 * - Org restructure → check RACI assignments
 */
async function assessBusinessChangeImpact(tenantId, changeType, changeData) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const recommendations = [];
    let affectedPlans = 0;
    let affectedStrategies = 0;
    if (changeType === 'vendor_onboarded' || changeType === 'vendor_changed') {
        // Check if vendor appears in dependency maps
        const depNodes = await (0, resilient_catch_1.swallowDefault)(resilient_catch_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT n.node_id, n.criticality, m.title AS map_title
       FROM "${schema}".bcm_dependency_nodes n
       JOIN "${schema}".bcm_dependency_maps m ON m.map_id = n.map_id
       WHERE m.deleted_at IS NULL
         AND (LOWER(n.node_name) LIKE LOWER($1) OR n.metadata->>'vendor_id' = $2)`, [`%${changeData.entityName}%`, changeData.entityId]), { tenantId: tenantId, operation: 'query bcm_dependency_nodes' });
        if (depNodes.rows.length > 0) {
            affectedPlans = depNodes.rows.length;
            const critical = depNodes.rows.filter((n) => n.criticality === 'critical');
            if (critical.length > 0) {
                recommendations.push(`Vendor "${changeData.entityName}" is in ${critical.length} CRITICAL dependency node(s) — review recovery strategies immediately`);
            }
            recommendations.push(`Update ${depNodes.rows.length} dependency map node(s) with new vendor details`);
        }
        else {
            recommendations.push(`New vendor "${changeData.entityName}" not found in dependency maps — assess if BCP coverage is needed`);
        }
        // Check recovery strategies
        const strategies = await (0, resilient_catch_1.swallowDefault)(resilient_catch_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)([{ cnt: 0 }]), (0, database_port_1.safeQuery)(`SELECT COUNT(*)::int AS cnt FROM "${schema}".bcm_recovery_strategies
       WHERE deleted_at IS NULL AND LOWER(title) LIKE LOWER($1)`, [`%${changeData.entityName}%`]), { tenantId: tenantId, operation: 'query bcm_recovery_strategies' });
        affectedStrategies = Number((0, db_1.getFirstRow)(strategies)?.cnt || 0);
    }
    if (changeType === 'system_deployed' || changeType === 'connector_added') {
        recommendations.push(`New system "${changeData.entityName}" deployed — verify BCP covers its failure scenario`);
        recommendations.push(`Add "${changeData.entityName}" to relevant dependency maps`);
        recommendations.push(`Define RTO/RPO targets for "${changeData.entityName}"`);
    }
    if (changeType === 'team_restructured') {
        recommendations.push(`Team structure changed — verify BCP RACI assignments are current`);
        recommendations.push(`Review crisis communication plan contact lists`);
        recommendations.push(`Confirm exercise participant lists are updated`);
    }
    const impactLevel = affectedPlans >= 3 || (affectedPlans > 0 && affectedStrategies > 0)
        ? 'critical' : affectedPlans > 0 ? 'high' : recommendations.length > 2 ? 'medium' : 'low';
    return { impactLevel, affectedPlans, affectedStrategies, recommendations };
}
//# sourceMappingURL=bcm-advanced.service.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createFinding = createFinding;
exports.getFindings = getFindings;
exports.getFindingById = getFindingById;
exports.updateFinding = updateFinding;
exports.verifyFinding = verifyFinding;
exports.closeFinding = closeFinding;
exports.getFindingsSummary = getFindingsSummary;
exports.autoCreateFindingsFromExercise = autoCreateFindingsFromExercise;
exports.autoCreateFindingsFromActivation = autoCreateFindingsFromActivation;
const database_port_1 = require("../ports/database.port");
const events_port_1 = require("../ports/events.port");
const db_1 = require("@dos/db");
const resilient_catch_1 = require("@dos/platform-core/resilience");
async function createFinding(tenantId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const r = await (0, database_port_1.safeQuery)(`INSERT INTO "${schema}".bcm_findings
     (title, description, source_type, source_id, finding_type, severity,
      assigned_to, assigned_team_id, due_date, remediation_plan, root_cause,
      linked_plan_id, linked_risk_id, linked_control_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`, [
        data.title, data.description || null, data.source_type || null, data.source_id || null,
        data.finding_type || 'gap', data.severity || 'medium',
        data.assigned_to || null, data.assigned_team_id || null,
        data.due_date || null, data.remediation_plan || null, data.root_cause || null,
        data.linked_plan_id || null, data.linked_risk_id || null, data.linked_control_id || null,
    ]);
    const row = (0, db_1.getFirstRow)(r);
    await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
        eventType: 'bcp.finding_created', tenantId, sourceService: 'bcm-findings',
        entityType: 'bcm_finding', entityId: row.finding_id, severity: (data.severity === 'critical' ? 'critical' : data.severity === 'high' ? 'warning' : 'info'),
        payload: { title: data.title, finding_type: data.finding_type, source_type: data.source_type },
    }), { tenantId, operation: 'eventBus:bcp.finding_created' });
    return row;
}
async function getFindings(tenantId, filters) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    let sql = `SELECT * FROM "${schema}".bcm_findings WHERE deleted_at IS NULL`;
    const params = [];
    if (filters?.status) {
        params.push(filters.status);
        sql += ` AND status = $${params.length}`;
    }
    if (filters?.severity) {
        params.push(filters.severity);
        sql += ` AND severity = $${params.length}`;
    }
    if (filters?.source_type) {
        params.push(filters.source_type);
        sql += ` AND source_type = $${params.length}`;
    }
    if (filters?.assigned_to) {
        params.push(filters.assigned_to);
        sql += ` AND assigned_to = $${params.length}`;
    }
    sql += ` ORDER BY CASE severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END, created_at DESC`;
    return (await (0, database_port_1.safeQuery)(sql, params)).rows;
}
async function getFindingById(tenantId, findingId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    return (0, db_1.getFirstRow)(await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bcm_findings WHERE finding_id = $1 AND deleted_at IS NULL`, [findingId]));
}
async function updateFinding(tenantId, findingId, data) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const allowed = [
        'title', 'description', 'finding_type', 'severity', 'status',
        'assigned_to', 'assigned_team_id', 'due_date',
        'remediation_plan', 'root_cause', 'corrective_action', 'preventive_action',
        'remediation_evidence', 'linked_plan_id', 'linked_risk_id', 'linked_control_id',
    ];
    const sets = [];
    const params = [];
    for (const key of allowed) {
        if (data[key] !== undefined) {
            params.push(key === 'remediation_evidence' ? JSON.stringify(data[key]) : data[key]);
            sets.push(`${key} = $${params.length}`);
        }
    }
    if (sets.length === 0)
        return getFindingById(tenantId, findingId);
    sets.push('updated_at = NOW()');
    params.push(findingId);
    const r = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".bcm_findings SET ${sets.join(', ')} WHERE finding_id = $${params.length} AND deleted_at IS NULL RETURNING *`, params);
    const row = (0, db_1.getFirstRow)(r);
    if (row && data.status === 'remediated') {
        await (0, resilient_catch_1.swallow)(resilient_catch_1.EC.EVENT_BUS, events_port_1.eventBus.publish({
            eventType: 'bcp.finding_remediated', tenantId, sourceService: 'bcm-findings',
            entityType: 'bcm_finding', entityId: findingId, severity: 'info',
            payload: { title: row.title, source_type: row.source_type, source_id: row.source_id },
        }), { tenantId, operation: 'eventBus:bcp.finding_remediated' });
    }
    return row;
}
async function verifyFinding(tenantId, findingId, verifiedBy) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const r = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".bcm_findings SET status = 'verified', verified_by = $1, verified_at = NOW(), updated_at = NOW()
     WHERE finding_id = $2 AND deleted_at IS NULL RETURNING *`, [verifiedBy, findingId]);
    return (0, db_1.getFirstRow)(r);
}
async function closeFinding(tenantId, findingId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const r = await (0, database_port_1.safeQuery)(`UPDATE "${schema}".bcm_findings SET status = 'closed', updated_at = NOW()
     WHERE finding_id = $1 AND deleted_at IS NULL RETURNING *`, [findingId]);
    return (0, db_1.getFirstRow)(r);
}
async function getFindingsSummary(tenantId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const [totalRes, statusRes, sevRes, srcRes, overdueRes] = await Promise.all([
        (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL`, []),
        (0, database_port_1.safeQuery)(`SELECT status, COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL GROUP BY status`, []),
        (0, database_port_1.safeQuery)(`SELECT severity, COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL AND status NOT IN ('closed','accepted','verified') GROUP BY severity`, []),
        (0, database_port_1.safeQuery)(`SELECT source_type, COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL GROUP BY source_type`, []),
        (0, database_port_1.safeQuery)(`SELECT COUNT(*) AS cnt FROM "${schema}".bcm_findings WHERE deleted_at IS NULL AND status NOT IN ('closed','accepted','verified') AND due_date < CURRENT_DATE`, []),
    ]);
    const statusMap = {};
    for (const row of statusRes.rows)
        statusMap[row.status] = Number(row.cnt);
    const bySeverity = {};
    for (const row of sevRes.rows)
        bySeverity[row.severity] = Number(row.cnt);
    const bySource = {};
    for (const row of srcRes.rows)
        bySource[row.source_type] = Number(row.cnt);
    return {
        total: Number(totalRes.rows[0]?.cnt || 0),
        open: Number(statusMap['open'] || 0),
        inProgress: Number(statusMap['in_progress'] || 0),
        overdue: Number(overdueRes.rows[0]?.cnt || 0),
        closed: Number((statusMap['closed'] || 0) + (statusMap['accepted'] || 0) + (statusMap['verified'] || 0)),
        bySeverity, bySource,
    };
}
async function autoCreateFindingsFromExercise(tenantId, exerciseId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const results = await (0, resilient_catch_1.swallowDefault)(resilient_catch_1.EC.FALLBACK_QUERY, (0, database_port_1.emptyResult)(), (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bcp_exercise_results WHERE exercise_id = $1 AND result_type IN ('gap','action_item')`, [exerciseId]), { operation: 'fetch exercise results for findings' });
    const findings = [];
    for (const result of results.rows) {
        const finding = await createFinding(tenantId, {
            title: `[Exercise] ${result.title || result.observation || 'Finding from exercise'}`,
            description: result.observation || result.description || null,
            source_type: 'exercise',
            source_id: exerciseId,
            finding_type: result.result_type === 'gap' ? 'gap' : 'recommendation',
            severity: result.severity || 'medium',
        });
        findings.push(finding);
    }
    return findings;
}
async function autoCreateFindingsFromActivation(tenantId, activationId) {
    const schema = (0, database_port_1.tenantSchema)(tenantId);
    const activation = (0, db_1.getFirstRow)(await (0, database_port_1.safeQuery)(`SELECT * FROM "${schema}".bcp_activations WHERE activation_id = $1`, [activationId]));
    if (!activation?.lessons_learned)
        return [];
    const finding = await createFinding(tenantId, {
        title: `[Activation] Lessons learned from activation ${activationId.slice(0, 8)}`,
        description: activation.lessons_learned,
        source_type: 'activation',
        source_id: activationId,
        finding_type: 'observation',
        severity: 'medium',
        linked_plan_id: activation.plan_id,
    });
    return [finding];
}
//# sourceMappingURL=bcm-findings.service.js.map
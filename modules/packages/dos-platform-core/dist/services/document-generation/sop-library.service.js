"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSOPs = getSOPs;
exports.upsertSOP = upsertSOP;
exports.deleteSOP = deleteSOP;
exports.seedDefaultSOPs = seedDefaultSOPs;
exports.startSOPCompletion = startSOPCompletion;
exports.updateSOPProgress = updateSOPProgress;
exports.getSOPCompletions = getSOPCompletions;
exports.getSOPComplianceStats = getSOPComplianceStats;
const db_1 = require("@dos/db");
const observability_1 = require("../../observability");
const resilience_1 = require("../../resilience");
const crypto_1 = require("crypto");
const BASELINE_SOPS = [
    { processType: 'risk_management', stageId: 'risk_identification', roleId: 'risk_manager', titleEn: 'Risk Identification Procedure', titleAr: 'إجراء تحديد المخاطر', slaHours: 48, steps: ['Identify risk sources', 'Categorize by domain', 'Assign initial rating', 'Register in risk register'] },
    { processType: 'compliance_monitoring', stageId: 'gap_analysis', roleId: 'compliance_officer', titleEn: 'Compliance Gap Analysis Procedure', titleAr: 'إجراء تحليل فجوات الامتثال', slaHours: 120, steps: ['Map controls to requirements', 'Identify gaps', 'Prioritize findings', 'Create remediation tasks'] },
    { processType: 'incident_response', stageId: 'incident_triage', roleId: 'ciso', titleEn: 'Incident Triage Procedure', titleAr: 'إجراء فرز الحوادث', slaHours: 4, steps: ['Classify incident severity', 'Assign response team', 'Initiate containment', 'Notify stakeholders'] },
    { processType: 'audit_assurance', stageId: 'evidence_collection', roleId: 'auditor', titleEn: 'Audit Evidence Collection Procedure', titleAr: 'إجراء جمع أدلة التدقيق', slaHours: 120, steps: ['Request evidence from owners', 'Validate completeness', 'Document findings', 'Rate control effectiveness'] },
];
async function ensureCompletionTable(schema) {
    await (0, db_1.safeQuery)(`
    CREATE TABLE IF NOT EXISTS "${schema}".sop_completions (
      completion_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      sop_id VARCHAR(255) NOT NULL,
      user_id VARCHAR(255) NOT NULL,
      total_steps INTEGER NOT NULL DEFAULT 0,
      completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
      notes TEXT,
      status VARCHAR(50) NOT NULL DEFAULT 'in_progress',
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      completed_at TIMESTAMPTZ
    )
  `);
}
function normalizeSteps(raw) {
    if (!Array.isArray(raw))
        return [];
    return raw.map((entry, index) => {
        if (typeof entry === 'string') {
            return { step: index + 1, description: entry };
        }
        if (entry && typeof entry === 'object') {
            const row = entry;
            return { step: Number(row.step ?? index + 1), description: String(row.description ?? row.title ?? '') };
        }
        return { step: index + 1, description: String(entry ?? '') };
    });
}
function parseJson(value, fallback) {
    if (value === null || value === undefined)
        return fallback;
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        }
        catch {
            return fallback;
        }
    }
    return value;
}
async function getSOPs(tenantId, filters = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const params = [];
    const conditions = [];
    let idx = 1;
    if (filters.processType) {
        conditions.push(`process_type = $${idx++}`);
        params.push(filters.processType);
    }
    if (filters.stageId) {
        conditions.push(`stage_id = $${idx++}`);
        params.push(filters.stageId);
    }
    if (filters.roleId) {
        conditions.push(`role_id = $${idx++}`);
        params.push(filters.roleId);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const result = await (0, db_1.safeQuery)(`SELECT sop_id, process_type, stage_id, role_id, title_en, title_ar, steps_en, steps_ar, prerequisites, expected_output, sla_hours, version, status, updated_at
     FROM "${schema}".sop_procedures
     ${where}
     ORDER BY process_type, stage_id, updated_at DESC`, params).catch(() => ({ rows: [] }));
    return result.rows.map((row) => ({
        sopId: row.sop_id,
        processType: row.process_type,
        stageId: row.stage_id,
        roleId: row.role_id,
        titleEn: row.title_en,
        titleAr: row.title_ar,
        stepsEn: parseJson(row.steps_en, []),
        stepsAr: parseJson(row.steps_ar, []),
        prerequisites: row.prerequisites ?? null,
        expectedOutput: row.expected_output ?? null,
        slaHours: row.sla_hours ?? 0,
        version: row.version ?? 1,
        status: row.status ?? 'active',
        updatedAt: row.updated_at,
    }));
}
async function upsertSOP(tenantId, sop) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    const sopId = String(sop.sopId ?? sop.sop_id ?? (0, crypto_1.randomUUID)());
    const processType = String(sop.processType ?? sop.process_type ?? 'general');
    const stageId = String(sop.stageId ?? sop.stage_id ?? 'default');
    const roleId = String(sop.roleId ?? sop.role_id ?? 'owner');
    const titleEn = String(sop.titleEn ?? sop.title_en ?? 'Untitled SOP');
    const titleAr = String(sop.titleAr ?? sop.title_ar ?? titleEn);
    const stepsEn = normalizeSteps(sop.stepsEn ?? sop.steps_en ?? sop.steps ?? []);
    const stepsAr = normalizeSteps(sop.stepsAr ?? sop.steps_ar ?? stepsEn);
    const prerequisites = sop.prerequisites ?? null;
    const expectedOutput = sop.expectedOutput ?? sop.expected_output ?? null;
    const slaHours = Number(sop.slaHours ?? sop.sla_hours ?? 24);
    const version = Number(sop.version ?? 1);
    const status = String(sop.status ?? 'active');
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".sop_procedures
       (sop_id, process_type, stage_id, role_id, title_en, title_ar, steps_en, steps_ar, prerequisites, expected_output, sla_hours, version, status, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, NOW())
     ON CONFLICT (sop_id) DO UPDATE SET
       process_type = EXCLUDED.process_type,
       stage_id = EXCLUDED.stage_id,
       role_id = EXCLUDED.role_id,
       title_en = EXCLUDED.title_en,
       title_ar = EXCLUDED.title_ar,
       steps_en = EXCLUDED.steps_en,
       steps_ar = EXCLUDED.steps_ar,
       prerequisites = EXCLUDED.prerequisites,
       expected_output = EXCLUDED.expected_output,
       sla_hours = EXCLUDED.sla_hours,
       version = EXCLUDED.version,
       status = EXCLUDED.status,
       updated_at = NOW()`, [
        sopId,
        processType,
        stageId,
        roleId,
        titleEn,
        titleAr,
        JSON.stringify(stepsEn),
        JSON.stringify(stepsAr),
        prerequisites,
        expectedOutput,
        slaHours,
        version,
        status,
    ]);
    return { sopId, processType, stageId, roleId, titleEn, titleAr, stepsEn, stepsAr, prerequisites, expectedOutput, slaHours, version, status };
}
async function deleteSOP(tenantId, sopId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await (0, db_1.safeQuery)(`DELETE FROM "${schema}".sop_procedures WHERE sop_id = $1`, [sopId]);
}
async function seedDefaultSOPs(tenantId) {
    let seeded = 0;
    for (const sop of BASELINE_SOPS) {
        try {
            const existing = await getSOPs(tenantId, { processType: sop.processType, stageId: sop.stageId });
            if (existing.length > 0)
                continue;
            await upsertSOP(tenantId, sop);
            seeded++;
        }
        catch (error) {
            observability_1.logger.warn('[SOPLibrary] seed skip', { tenantId, processType: sop.processType, stageId: sop.stageId, error: (0, resilience_1.toErrorMessage)(error) });
        }
    }
    return seeded;
}
async function startSOPCompletion(tenantId, sopId, userId, totalSteps) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await ensureCompletionTable(schema);
    const completionId = (0, crypto_1.randomUUID)();
    await (0, db_1.safeQuery)(`INSERT INTO "${schema}".sop_completions (completion_id, sop_id, user_id, total_steps, completed_steps, status)
     VALUES ($1, $2, $3, $4, '[]'::jsonb, 'in_progress')`, [completionId, sopId, userId, totalSteps]);
    return { completionId, sopId, userId, totalSteps, completedSteps: [], status: 'in_progress' };
}
async function updateSOPProgress(tenantId, completionId, completedSteps, notes) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await ensureCompletionTable(schema);
    const normalizedSteps = normalizeSteps(completedSteps);
    const existing = await (0, db_1.safeQuery)(`SELECT sop_id, user_id, total_steps FROM "${schema}".sop_completions WHERE completion_id = $1 LIMIT 1`, [completionId]);
    const row = existing.rows[0];
    if (!row)
        return null;
    const isCompleted = normalizedSteps.length >= Number(row.total_steps ?? 0) && Number(row.total_steps ?? 0) > 0;
    await (0, db_1.safeQuery)(`UPDATE "${schema}".sop_completions
     SET completed_steps = $2::jsonb, notes = $3, status = $4, updated_at = NOW(), completed_at = CASE WHEN $4 = 'completed' THEN NOW() ELSE NULL END
     WHERE completion_id = $1`, [completionId, JSON.stringify(normalizedSteps), notes ?? null, isCompleted ? 'completed' : 'in_progress']);
    return { completionId, sopId: row.sop_id, userId: row.user_id, totalSteps: Number(row.total_steps ?? 0), completedSteps: normalizedSteps, notes: notes ?? null, status: isCompleted ? 'completed' : 'in_progress' };
}
async function getSOPCompletions(tenantId, filters = {}) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await ensureCompletionTable(schema);
    const params = [];
    const conditions = [];
    let idx = 1;
    if (filters.sopId) {
        conditions.push(`sop_id = $${idx++}`);
        params.push(filters.sopId);
    }
    if (filters.userId) {
        conditions.push(`user_id = $${idx++}`);
        params.push(filters.userId);
    }
    if (filters.status) {
        conditions.push(`status = $${idx++}`);
        params.push(filters.status);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limit = Math.min(filters.limit ?? 100, 500);
    const result = await (0, db_1.safeQuery)(`SELECT completion_id, sop_id, user_id, total_steps, completed_steps, notes, status, started_at, updated_at, completed_at
     FROM "${schema}".sop_completions
     ${where}
     ORDER BY started_at DESC
     LIMIT ${limit}`, params);
    return result.rows.map((row) => ({
        completionId: row.completion_id,
        sopId: row.sop_id,
        userId: row.user_id,
        totalSteps: Number(row.total_steps ?? 0),
        completedSteps: parseJson(row.completed_steps, []),
        notes: row.notes ?? null,
        status: row.status,
        startedAt: row.started_at,
        updatedAt: row.updated_at,
        completedAt: row.completed_at ?? null,
    }));
}
async function getSOPComplianceStats(tenantId) {
    const schema = (0, db_1.tenantSchema)(tenantId);
    await ensureCompletionTable(schema);
    const [sopResult, completionResult] = await Promise.all([
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'active')::int AS active FROM "${schema}".sop_procedures`).catch(() => ({ rows: [{ total: 0, active: 0 }] })),
        (0, db_1.safeQuery)(`SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE status = 'completed')::int AS completed FROM "${schema}".sop_completions`).catch(() => ({ rows: [{ total: 0, completed: 0 }] })),
    ]);
    const totalSops = Number(sopResult.rows[0]?.total ?? 0);
    const activeSops = Number(sopResult.rows[0]?.active ?? 0);
    const totalAssignments = Number(completionResult.rows[0]?.total ?? 0);
    const completedAssignments = Number(completionResult.rows[0]?.completed ?? 0);
    return {
        totalSops,
        activeSops,
        totalAssignments,
        completedAssignments,
        completionRate: totalAssignments > 0 ? completedAssignments / totalAssignments : 0,
    };
}
//# sourceMappingURL=sop-library.service.js.map
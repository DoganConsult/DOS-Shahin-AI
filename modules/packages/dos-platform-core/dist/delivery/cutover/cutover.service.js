"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCutoverPlan = createCutoverPlan;
exports.getCutoverPlan = getCutoverPlan;
exports.getCutoverPlanByRelease = getCutoverPlanByRelease;
exports.startCutover = startCutover;
exports.advanceCutoverCheckpoint = advanceCutoverCheckpoint;
exports.completeCutover = completeCutover;
exports.abortCutover = abortCutover;
exports.getCutoverExecution = getCutoverExecution;
exports.listCutoverExecutionsByRelease = listCutoverExecutionsByRelease;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
async function createCutoverPlan(input) {
    const cutoverId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_cutover_plans (
      cutover_id, release_id, scope, owner,
      execution_sequence, checkpoints, no_go_criteria,
      rollback_triggers, communication_path,
      monitoring_window_minutes, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [
        cutoverId,
        input.releaseId,
        input.scope,
        input.owner,
        JSON.stringify(input.executionSequence),
        JSON.stringify(input.checkpoints),
        JSON.stringify(input.noGoCriteria),
        JSON.stringify(input.rollbackTriggers),
        input.communicationPath,
        input.monitoringWindowMinutes ?? 60,
        now,
    ]);
    return getCutoverPlan(cutoverId);
}
async function getCutoverPlan(cutoverId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_cutover_plans WHERE cutover_id = $1 LIMIT 1`, [cutoverId]);
    if (!result.rows[0])
        return null;
    return mapPlanRow(result.rows[0]);
}
async function getCutoverPlanByRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_cutover_plans WHERE release_id = $1 ORDER BY created_at DESC LIMIT 1`, [releaseId]);
    if (!result.rows[0])
        return null;
    return mapPlanRow(result.rows[0]);
}
async function startCutover(cutoverId, executedBy) {
    const executionId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    const plan = await getCutoverPlan(cutoverId);
    if (!plan)
        throw new Error(`Cutover plan not found: ${cutoverId}`);
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_cutover_executions (
      execution_id, cutover_id, release_id, status,
      current_checkpoint, passed_checkpoints, no_go_triggered,
      no_go_reason, executed_by, started_at, completed_at, aborted_at, notes
    ) VALUES ($1,$2,$3,'in_progress',NULL,'[]',false,NULL,$4,$5,NULL,NULL,NULL)`, [executionId, cutoverId, plan.releaseId, executedBy, now]);
    await (0, events_1.publish)('delivery.cutover.started', 'platform', { executionId, cutoverId, releaseId: plan.releaseId }, {});
    return getCutoverExecution(executionId);
}
async function advanceCutoverCheckpoint(executionId, checkpoint) {
    await (0, db_1.safeQuery)(`UPDATE public.dos_cutover_executions
     SET current_checkpoint = $1,
         passed_checkpoints = passed_checkpoints || $2::jsonb
     WHERE execution_id = $3`, [checkpoint, JSON.stringify([checkpoint]), executionId]);
}
async function completeCutover(executionId, notes) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_cutover_executions SET status = 'completed', completed_at = $1, notes = $2 WHERE execution_id = $3`, [now, notes ?? null, executionId]);
    const exec = await getCutoverExecution(executionId);
    if (exec) {
        await (0, events_1.publish)('delivery.cutover.completed', 'platform', { executionId, cutoverId: exec.cutoverId }, {});
    }
}
async function abortCutover(executionId, reason) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_cutover_executions
     SET status = 'aborted', aborted_at = $1, no_go_triggered = true, no_go_reason = $2
     WHERE execution_id = $3`, [now, reason, executionId]);
    const exec = await getCutoverExecution(executionId);
    if (exec) {
        await (0, events_1.publish)('delivery.cutover.aborted', 'platform', { executionId, cutoverId: exec.cutoverId, reason }, {});
    }
}
async function getCutoverExecution(executionId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_cutover_executions WHERE execution_id = $1 LIMIT 1`, [executionId]);
    if (!result.rows[0])
        return null;
    return mapExecutionRow(result.rows[0]);
}
async function listCutoverExecutionsByRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT e.* FROM public.dos_cutover_executions e
     WHERE e.release_id = $1
     ORDER BY e.started_at DESC`, [releaseId]);
    return result.rows.map(mapExecutionRow);
}
function mapPlanRow(row) {
    return {
        cutoverId: row.cutover_id,
        releaseId: row.release_id,
        scope: row.scope,
        owner: row.owner,
        executionSequence: row.execution_sequence ?? [],
        checkpoints: row.checkpoints ?? [],
        noGoCriteria: row.no_go_criteria ?? [],
        rollbackTriggers: row.rollback_triggers ?? [],
        communicationPath: row.communication_path,
        monitoringWindowMinutes: row.monitoring_window_minutes ?? 60,
        createdAt: row.created_at,
    };
}
function mapExecutionRow(row) {
    return {
        executionId: row.execution_id,
        cutoverId: row.cutover_id,
        releaseId: row.release_id,
        status: row.status,
        currentCheckpoint: row.current_checkpoint ?? null,
        passedCheckpoints: row.passed_checkpoints ?? [],
        noGoTriggered: row.no_go_triggered,
        noGoReason: row.no_go_reason ?? null,
        executedBy: row.executed_by,
        startedAt: row.started_at,
        completedAt: row.completed_at ?? null,
        abortedAt: row.aborted_at ?? null,
        notes: row.notes ?? null,
    };
}
//# sourceMappingURL=cutover.service.js.map
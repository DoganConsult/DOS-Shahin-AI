"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startVerificationRun = startVerificationRun;
exports.registerVerificationCheck = registerVerificationCheck;
exports.recordCheckResult = recordCheckResult;
exports.completeVerificationRun = completeVerificationRun;
exports.getVerificationRun = getVerificationRun;
exports.getVerificationCheck = getVerificationCheck;
exports.listChecksByRun = listChecksByRun;
exports.listRunsByRelease = listRunsByRelease;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
async function startVerificationRun(input) {
    const runId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_verification_runs (
      run_id, release_id, deployment_id, status,
      total_checks, passed_checks, failed_checks, skipped_checks,
      rollback_decision, started_at, completed_at, completed_by
    ) VALUES ($1,$2,$3,'running',0,0,0,0,NULL,$4,NULL,NULL)`, [runId, input.releaseId, input.deploymentId, now]);
    await (0, events_1.publish)('delivery.verification.started', 'platform', { runId, releaseId: input.releaseId }, {});
    return getVerificationRun(runId);
}
async function registerVerificationCheck(input) {
    const checkId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_verification_checks (
      check_id, run_id, release_id, check_code, category,
      status, owner, duration_ms, failure_detail, executed_at, created_at
    ) VALUES ($1,$2,$3,$4,$5,'pending',$6,NULL,NULL,NULL,$7)`, [checkId, input.runId, input.releaseId, input.checkCode, input.category, input.owner, now]);
    return getVerificationCheck(checkId);
}
async function recordCheckResult(checkId, status, durationMs, failureDetail) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_verification_checks
     SET status = $1, duration_ms = $2, failure_detail = $3, executed_at = $4
     WHERE check_id = $5`, [status, durationMs ?? null, failureDetail ?? null, now, checkId]);
}
async function completeVerificationRun(runId, completedBy, rollbackDecision) {
    const checks = await listChecksByRun(runId);
    const total = checks.length;
    const passed = checks.filter((c) => c.status === 'passed').length;
    const failed = checks.filter((c) => c.status === 'failed').length;
    const skipped = checks.filter((c) => c.status === 'skipped').length;
    const runStatus = failed > 0 ? 'failed' : passed + skipped === total ? 'passed' : 'partial';
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_verification_runs
     SET status = $1, total_checks = $2, passed_checks = $3, failed_checks = $4,
         skipped_checks = $5, rollback_decision = $6, completed_at = $7, completed_by = $8
     WHERE run_id = $9`, [runStatus, total, passed, failed, skipped, rollbackDecision ?? 'pending', now, completedBy, runId]);
    const run = await getVerificationRun(runId);
    if (run) {
        await (0, events_1.publish)('delivery.verification.completed', 'platform', {
            runId,
            releaseId: run.releaseId,
            status: runStatus,
            rollbackDecision,
        }, {});
    }
    return run;
}
async function getVerificationRun(runId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_verification_runs WHERE run_id = $1 LIMIT 1`, [runId]);
    if (!result.rows[0])
        return null;
    return mapRunRow(result.rows[0]);
}
async function getVerificationCheck(checkId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_verification_checks WHERE check_id = $1 LIMIT 1`, [checkId]);
    if (!result.rows[0])
        return null;
    return mapCheckRow(result.rows[0]);
}
async function listChecksByRun(runId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_verification_checks WHERE run_id = $1 ORDER BY created_at`, [runId]);
    return result.rows.map(mapCheckRow);
}
async function listRunsByRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_verification_runs WHERE release_id = $1 ORDER BY started_at DESC`, [releaseId]);
    return result.rows.map(mapRunRow);
}
function mapRunRow(row) {
    return {
        runId: row.run_id,
        releaseId: row.release_id,
        deploymentId: row.deployment_id,
        status: row.status,
        totalChecks: row.total_checks ?? 0,
        passedChecks: row.passed_checks ?? 0,
        failedChecks: row.failed_checks ?? 0,
        skippedChecks: row.skipped_checks ?? 0,
        rollbackDecision: row.rollback_decision ?? null,
        startedAt: row.started_at,
        completedAt: row.completed_at ?? null,
        completedBy: row.completed_by ?? null,
    };
}
function mapCheckRow(row) {
    return {
        checkId: row.check_id,
        runId: row.run_id,
        releaseId: row.release_id,
        checkCode: row.check_code,
        category: row.category,
        status: row.status,
        owner: row.owner,
        durationMs: row.duration_ms ?? null,
        failureDetail: row.failure_detail ?? null,
        executedAt: row.executed_at ?? null,
        createdAt: row.created_at,
    };
}
//# sourceMappingURL=post-deploy-verification.service.js.map
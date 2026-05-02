"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.approveOnboarding = approveOnboarding;
exports.provisionWorkspace = provisionWorkspace;
exports.getProvisioningJob = getProvisioningJob;
exports.getProvisioningSteps = getProvisioningSteps;
exports.getProvisioningEvents = getProvisioningEvents;
exports.retryProvisioningJob = retryProvisioningJob;
exports.cancelProvisioningJob = cancelProvisioningJob;
exports.getTemporalStatus = getTemporalStatus;
const provisioning_orchestrator_service_1 = require("../services/provisioning/provisioning-orchestrator.service");
const provisioning_job_repo_1 = require("../repositories/provisioning-job.repo");
const provisioning_step_repo_1 = require("../repositories/provisioning-step.repo");
const errors_port_1 = require("../ports/errors.port");
const session_ownership_util_1 = require("../utils/session-ownership.util");
const auth_port_1 = require("../ports/auth.port");
const onboarding_lifecycle_1 = require("../workflows/onboarding-lifecycle");
const database_port_1 = require("../ports/database.port");
const logger_port_1 = require("../ports/logger.port");
const orchestrator = new provisioning_orchestrator_service_1.ProvisioningOrchestratorService();
const jobRepo = new provisioning_job_repo_1.ProvisioningJobRepo();
const stepRepo = new provisioning_step_repo_1.ProvisioningStepRepo();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function badJobId(res) {
    res.status(400).json({ error: 'Invalid jobId format' });
}
async function enforceProtectedJobAction(jobId, actorUserId, action) {
    const result = await (0, database_port_1.safeQuery)(`SELECT pj.id AS job_id, os.id AS session_id, os.status AS session_status, os.user_id AS session_owner, os.tenant_id AS tenant_id
       FROM public.provisioning_jobs pj
       JOIN public.onboarding_sessions os ON os.id = pj.session_id
      WHERE pj.id = $1::uuid
      LIMIT 1`, [jobId]);
    const row = result.rows[0];
    if (!row) {
        throw Object.assign(new Error('Provisioning job not found'), { code: 'JOB_NOT_FOUND', statusCode: 404 });
    }
    const sessionOwner = String(row.session_owner ?? '');
    if (sessionOwner) {
        const sodCheck = (0, auth_port_1.preventSelfApproval)(sessionOwner, actorUserId);
        if (!sodCheck.allowed) {
            throw Object.assign(new Error(sodCheck.reason ?? 'SoD violation on protected action'), {
                code: 'SOD_VIOLATION',
                statusCode: 403,
            });
        }
    }
    const tenantId = String(row.tenant_id ?? '');
    if (tenantId) {
        const lifecycle = await (0, auth_port_1.evaluateLifecycleTransition)(tenantId, actorUserId, {
            moduleCode: 'onboarding',
            entityType: 'onboarding_sessions',
            entityId: String(row.session_id),
            fromState: String(row.session_status ?? 'draft'),
            toState: action.toState,
            permissionCode: action.permissionCode,
            ownerId: sessionOwner || undefined,
            userRoles: [],
        });
        if (!lifecycle.allowed) {
            throw Object.assign(new Error(`Lifecycle auth denied: ${lifecycle.reason}`), {
                code: 'LIFECYCLE_AUTH_DENIED',
                statusCode: 403,
                checks: lifecycle.checks,
            });
        }
    }
}
async function approveOnboarding(req, res) {
    try {
        const { sessionId } = req.params;
        if (!sessionId || !UUID_RE.test(sessionId)) {
            res.status(400).json({ error: 'Invalid sessionId format' });
            return;
        }
        if (!(await (0, session_ownership_util_1.verifySessionOwnership)(sessionId, req))) {
            res.status(403).json({ error: 'Access denied: session does not belong to this user' });
            return;
        }
        const approverUserId = req.user?.userId ?? 'system-user';
        const approverTenantId = req.user?.tenantId || '';
        const sessionRow = await (0, database_port_1.safeQuery)(`SELECT status, user_id FROM public.onboarding_sessions WHERE id = $1::uuid LIMIT 1`, [sessionId]);
        const currentStatus = sessionRow?.rows?.[0]?.status ?? 'unknown';
        const sessionOwner = sessionRow?.rows?.[0]?.user_id;
        if (sessionOwner && sessionOwner !== approverUserId) {
            const selfApprovalCheck = (0, auth_port_1.preventSelfApproval)(sessionOwner, approverUserId);
            if (!selfApprovalCheck.allowed) {
                await (0, auth_port_1.logAuthDecision)(approverTenantId, {
                    userId: approverUserId,
                    permissionCode: 'onboarding.approve',
                    decision: 'deny',
                    reason: `Self-approval prevented: approver ${approverUserId} is not session owner`,
                }).catch(err => logger_port_1.logger.warn('[Provisioning] logAuthDecision failed', { error: err instanceof Error ? err.message : String(err) }));
                res.status(403).json({ error: 'Self-approval is not permitted for this action' });
                return;
            }
        }
        if (!(0, onboarding_lifecycle_1.isValidTransition)(currentStatus, 'approved_for_provisioning')) {
            await (0, auth_port_1.logAuthDecision)(approverTenantId, {
                userId: approverUserId,
                permissionCode: 'onboarding.approve',
                decision: 'deny',
                reason: `Lifecycle transition from '${currentStatus}' to 'approved_for_provisioning' is not allowed`,
            }).catch(err => logger_port_1.logger.warn('[Provisioning] logAuthDecision failed', { error: err instanceof Error ? err.message : String(err) }));
            res.status(403).json({ error: `Transition from '${currentStatus}' to 'approved_for_provisioning' is not authorized` });
            return;
        }
        await (0, auth_port_1.logAuthDecision)(approverTenantId, {
            userId: approverUserId,
            permissionCode: 'onboarding.approve',
            decision: 'allow',
            reason: 'Session owner approved own onboarding (initial tenant setup — SoD waived by design)',
        }).catch(err => logger_port_1.logger.warn('[Provisioning] logAuthDecision failed', { error: err instanceof Error ? err.message : String(err) }));
        const result = await orchestrator.approve(sessionId, { ...req.body, approvedBy: approverUserId });
        res.json(result);
    }
    catch (err) {
        res.status((0, errors_port_1.toErrorMessage)(err).includes('blocked') ? 422 : 500).json({ error: (0, errors_port_1.toErrorMessage)(err) });
    }
}
async function provisionWorkspace(req, res) {
    try {
        const { sessionId } = req.params;
        if (!sessionId || !UUID_RE.test(sessionId)) {
            res.status(400).json({ error: 'Invalid sessionId format' });
            return;
        }
        if (!(await (0, session_ownership_util_1.verifySessionOwnership)(sessionId, req))) {
            res.status(403).json({ error: 'Access denied: session does not belong to this user' });
            return;
        }
        const userId = req.user?.userId ?? 'system-user';
        const tenantId = req.user?.tenantId || '';
        await (0, auth_port_1.logAuthDecision)(tenantId, {
            userId,
            permissionCode: 'workspace.provision',
            decision: 'allow',
            reason: 'Session owner provisioned own workspace (initial tenant setup — SoD waived by design)',
        }).catch(err => logger_port_1.logger.warn('[Provisioning] logAuthDecision failed', { error: err instanceof Error ? err.message : String(err) }));
        const result = await orchestrator.startProvisioning(sessionId, userId);
        res.status(202).json(result);
    }
    catch (err) {
        res.status((0, errors_port_1.toErrorMessage)(err).includes('blocked') ? 422 : 500).json({ error: (0, errors_port_1.toErrorMessage)(err) });
    }
}
async function getProvisioningJob(req, res) {
    try {
        const { jobId } = req.params;
        if (!jobId || !UUID_RE.test(jobId)) {
            badJobId(res);
            return;
        }
        let job = await jobRepo.findById(jobId);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        let temporal = null;
        try {
            temporal = await orchestrator.getTemporalStatus(jobId);
        }
        catch {
            // non-fatal — DB job is the source of truth
        }
        if (job.job_status === 'running' && temporal) {
            const tStatus = temporal.status;
            if (tStatus === 'FAILED' || tStatus === 'TERMINATED' || tStatus === 'TIMED_OUT') {
                await jobRepo.markFailed(jobId, { error: `Temporal workflow ${tStatus}` });
                job = await jobRepo.findById(jobId);
            }
        }
        res.json({ ...job, temporal });
    }
    catch (err) {
        (0, errors_port_1.sendError)(res, err);
    }
}
async function getProvisioningSteps(req, res) {
    try {
        const { jobId } = req.params;
        if (!jobId || !UUID_RE.test(jobId)) {
            badJobId(res);
            return;
        }
        const steps = await stepRepo.listByJob(jobId);
        res.json(steps);
    }
    catch (err) {
        (0, errors_port_1.sendError)(res, err);
    }
}
async function getProvisioningEvents(req, res) {
    try {
        const { jobId } = req.params;
        if (!jobId || !UUID_RE.test(jobId)) {
            badJobId(res);
            return;
        }
        const result = await (0, database_port_1.safeQuery)(`SELECT * FROM public.provisioning_events WHERE job_id = $1::uuid ORDER BY created_at ASC`, [jobId]);
        res.json(result.rows);
    }
    catch (err) {
        (0, errors_port_1.sendError)(res, err);
    }
}
async function retryProvisioningJob(req, res) {
    try {
        const { jobId } = req.params;
        if (!jobId || !UUID_RE.test(jobId)) {
            badJobId(res);
            return;
        }
        const actorUserId = req.user?.userId ?? req.userId ?? 'system-user';
        await enforceProtectedJobAction(jobId, actorUserId, {
            permissionCode: 'onboarding.retry_provisioning',
            toState: 'provisioning',
        });
        const result = await orchestrator.retryProvisioning(jobId);
        res.status(202).json({ jobId, status: 'retrying', ...result });
    }
    catch (err) {
        const code = (err?.code);
        if (code === 'LIFECYCLE_AUTH_DENIED' || code === 'SOD_VIOLATION') {
            res.status(403).json({ error: (0, errors_port_1.toErrorMessage)(err), code });
        }
        else if (code === 'MAX_RETRIES') {
            res.status(422).json({ error: (0, errors_port_1.toErrorMessage)(err), retry_count: err['retry_count'], max_retries: 5 });
        }
        else if ((0, errors_port_1.toErrorMessage)(err).includes('Cannot retry')) {
            res.status(422).json({ error: (0, errors_port_1.toErrorMessage)(err) });
        }
        else {
            (0, errors_port_1.sendError)(res, err);
        }
    }
}
async function cancelProvisioningJob(req, res) {
    try {
        const { jobId } = req.params;
        if (!jobId || !UUID_RE.test(jobId)) {
            badJobId(res);
            return;
        }
        const actorUserId = req.user?.userId ?? req.userId ?? 'system-user';
        await enforceProtectedJobAction(jobId, actorUserId, {
            permissionCode: 'onboarding.retry_provisioning',
            toState: 'cancelled',
        });
        const job = await jobRepo.findById(jobId);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }
        if (!['queued', 'running'].includes(job.job_status)) {
            res.status(422).json({ error: `Cannot cancel job in status: ${job.job_status}` });
            return;
        }
        const result = await orchestrator.cancelProvisioning(jobId);
        res.json({ jobId, ...result });
    }
    catch (err) {
        const code = (err?.code);
        if (code === 'LIFECYCLE_AUTH_DENIED' || code === 'SOD_VIOLATION') {
            res.status(403).json({ error: (0, errors_port_1.toErrorMessage)(err), code });
            return;
        }
        (0, errors_port_1.sendError)(res, err);
    }
}
async function getTemporalStatus(req, res) {
    try {
        const { jobId } = req.params;
        if (!jobId || !UUID_RE.test(jobId)) {
            badJobId(res);
            return;
        }
        const status = await orchestrator.getTemporalStatus(jobId);
        if (!status) {
            res.status(404).json({ error: 'Temporal workflow not found or Temporal disabled', temporalEnabled: process.env.TEMPORAL_PROVISIONING_ENABLED !== 'false' });
            return;
        }
        res.json(status);
    }
    catch (err) {
        (0, errors_port_1.sendError)(res, err);
    }
}
//# sourceMappingURL=provisioning.controller.js.map
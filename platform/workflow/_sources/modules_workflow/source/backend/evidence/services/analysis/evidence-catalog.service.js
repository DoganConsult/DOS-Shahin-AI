"use strict";
// Workflow-local shim for evidence quality-gate validation.
//
// The single consumer inside modules/workflow is
// services/core/evidence-relay.service.ts which imports { validateEvidence }
// from '../analysis/evidence-catalog.service'. The canonical implementation
// lives in modules/evidence/...; duplicating the pure validator here keeps
// workflow's dist self-contained without depending on a sibling module at
// require() time. Quality-gate rules are a stable contract — if they drift
// we fail the PR that changes them and update both copies.
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEvidence = void 0;
function validateEvidence(submission) {
    var failures = [];
    if (!submission.date || submission.date.trim() === '') {
        failures.push({ field: 'date', rule: 'required', message: 'Evidence date is required' });
    }
    if (!submission.owner || submission.owner.trim() === '') {
        failures.push({ field: 'owner', rule: 'required', message: 'Evidence owner is required' });
    }
    if (!submission.systemReference || submission.systemReference.trim() === '') {
        failures.push({ field: 'systemReference', rule: 'required', message: 'System reference is required' });
    }
    if (!submission.ticketId || submission.ticketId.trim() === '') {
        failures.push({ field: 'ticketId', rule: 'required', message: 'Ticket ID is required' });
    }
    if (!submission.approvalTrail ||
        !Array.isArray(submission.approvalTrail) ||
        submission.approvalTrail.length === 0) {
        failures.push({
            field: 'approvalTrail',
            rule: 'required',
            message: 'Approval trail is required with at least one entry',
        });
    }
    return { passed: failures.length === 0, failures: failures };
}
exports.validateEvidence = validateEvidence;

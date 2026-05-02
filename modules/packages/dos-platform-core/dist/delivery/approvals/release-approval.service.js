"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestApproval = requestApproval;
exports.approveRelease = approveRelease;
exports.rejectApproval = rejectApproval;
exports.withdrawApproval = withdrawApproval;
exports.getApproval = getApproval;
exports.listApprovalsByRelease = listApprovalsByRelease;
exports.listPendingApprovals = listPendingApprovals;
exports.isFullyApproved = isFullyApproved;
exports.hasRejection = hasRejection;
const db_1 = require("@dos/db");
const events_1 = require("../../events");
const uuid_1 = require("uuid");
async function requestApproval(input) {
    const approvalId = (0, uuid_1.v4)();
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`INSERT INTO public.dos_release_approvals (
      approval_id, release_id, approval_role, required_by,
      approved_by, status, comments, requested_at, resolved_at
    ) VALUES ($1,$2,$3,$4,NULL,'pending',NULL,$5,NULL)`, [approvalId, input.releaseId, input.approvalRole, input.requiredBy, now]);
    await (0, events_1.publish)('delivery.approval.requested', 'platform', {
        approvalId,
        releaseId: input.releaseId,
        approvalRole: input.approvalRole,
    }, {});
    return getApproval(approvalId);
}
async function approveRelease(approvalId, approvedBy, comments) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_release_approvals
     SET status = 'approved', approved_by = $1, comments = $2, resolved_at = $3
     WHERE approval_id = $4`, [approvedBy, comments ?? null, now, approvalId]);
    const approval = await getApproval(approvalId);
    if (approval) {
        await (0, events_1.publish)('delivery.approval.granted', 'platform', {
            approvalId,
            releaseId: approval.releaseId,
            approvedBy,
        }, {});
    }
    return approval;
}
async function rejectApproval(approvalId, rejectedBy, comments) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_release_approvals
     SET status = 'rejected', approved_by = $1, comments = $2, resolved_at = $3
     WHERE approval_id = $4`, [rejectedBy, comments, now, approvalId]);
    const approval = await getApproval(approvalId);
    if (approval) {
        await (0, events_1.publish)('delivery.approval.rejected', 'platform', {
            approvalId,
            releaseId: approval.releaseId,
            rejectedBy,
            comments,
        }, {});
    }
    return approval;
}
async function withdrawApproval(approvalId) {
    const now = new Date().toISOString();
    await (0, db_1.safeQuery)(`UPDATE public.dos_release_approvals SET status = 'withdrawn', resolved_at = $1 WHERE approval_id = $2`, [now, approvalId]);
}
async function getApproval(approvalId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_release_approvals WHERE approval_id = $1 LIMIT 1`, [approvalId]);
    if (!result.rows[0])
        return null;
    return mapApprovalRow(result.rows[0]);
}
async function listApprovalsByRelease(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_release_approvals WHERE release_id = $1 ORDER BY requested_at`, [releaseId]);
    return result.rows.map(mapApprovalRow);
}
async function listPendingApprovals(releaseId) {
    const result = await (0, db_1.safeQuery)(`SELECT * FROM public.dos_release_approvals WHERE release_id = $1 AND status = 'pending' ORDER BY requested_at`, [releaseId]);
    return result.rows.map(mapApprovalRow);
}
async function isFullyApproved(releaseId) {
    const approvals = await listApprovalsByRelease(releaseId);
    if (approvals.length === 0)
        return false;
    return approvals.every((a) => a.status === 'approved');
}
async function hasRejection(releaseId) {
    const approvals = await listApprovalsByRelease(releaseId);
    return approvals.some((a) => a.status === 'rejected');
}
function mapApprovalRow(row) {
    return {
        approvalId: row.approval_id,
        releaseId: row.release_id,
        approvalRole: row.approval_role,
        requiredBy: row.required_by,
        approvedBy: row.approved_by ?? null,
        status: row.status,
        comments: row.comments ?? null,
        requestedAt: row.requested_at,
        resolvedAt: row.resolved_at ?? null,
    };
}
//# sourceMappingURL=release-approval.service.js.map
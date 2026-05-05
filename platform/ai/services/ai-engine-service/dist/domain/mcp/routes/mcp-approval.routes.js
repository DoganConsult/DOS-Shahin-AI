// @ts-nocheck
import { Router } from 'express';
import { authenticate, requirePermission } from '../ports/auth.port';
import { auditMiddleware, asyncHandler, moduleStack, validate, setAuditData } from '../ports/middleware.port';
import * as executionService from '../services/mcp-execution.service';
import { approvalReviewBody, listApprovalsQuery } from '../schemas/mcp.schemas';
import { z } from "zod";
const router = Router();
router.use(moduleStack('mcp'));
router.use(auditMiddleware('mcp'));
router.get('/', authenticate, requirePermission('mcp.approval.manage'), validate({ query: listApprovalsQuery }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const { status } = req.query;
    const rows = await executionService.listApprovalRequests(tenantId, status || undefined);
    res.json({ success: true, data: rows, total: rows.length });
}));
router.post('/:requestId/review', authenticate, requirePermission('mcp.approval.manage'), validate({ body: approvalReviewBody }), asyncHandler(async (req, res) => {
    const tenantId = req.tenantId;
    const reviewedBy = req.user?.userId || 'unknown';
    setAuditData(res, { action: 'review_approval', entityType: 'mcp_tool_approval', entityId: req.params.requestId });
    await executionService.reviewApproval(tenantId, req.params.requestId, req.body.decision, reviewedBy, req.body.notes);
    res.json({ success: true, message: `Approval ${req.body.decision}` });
}));
export default router;
let genericPayloadSchema = z.record(z.unknown());
//# sourceMappingURL=mcp-approval.routes.js.map
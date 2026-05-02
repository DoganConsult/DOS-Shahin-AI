"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sodWaiverBody = exports.validateDelegationBody = exports.revokeDelegationGrantBody = exports.createDelegationGrantBody = void 0;
const zod_1 = require("zod");
const delegationScopeCode = zod_1.z.enum([
    'onboarding',
    'workspace_setup',
    'policy_drafting',
    'risk_seeding',
    'control_mapping',
    'evidence_upload',
    'assessment',
]);
exports.createDelegationGrantBody = zod_1.z.object({
    agentId: zod_1.z.string().min(1).max(64),
    scopes: zod_1.z.array(delegationScopeCode).min(1).max(10),
    durationMinutes: zod_1.z.number().int().min(1).max(10080).default(60),
}).strict();
exports.revokeDelegationGrantBody = zod_1.z.object({
    grantId: zod_1.z.string().uuid(),
    reason: zod_1.z.string().max(500).optional(),
}).strict();
exports.validateDelegationBody = zod_1.z.object({
    grantId: zod_1.z.string().uuid(),
    agentId: zod_1.z.string().min(1).max(64),
}).strict();
exports.sodWaiverBody = zod_1.z.object({
    policyId: zod_1.z.string().uuid(),
    justification: zod_1.z.string().min(10).max(2000),
    expiresAt: zod_1.z.string().datetime().optional(),
}).strict();
//# sourceMappingURL=delegation.schemas.js.map
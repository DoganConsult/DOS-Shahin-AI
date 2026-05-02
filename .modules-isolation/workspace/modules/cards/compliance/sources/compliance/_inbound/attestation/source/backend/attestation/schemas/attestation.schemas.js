"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransitionCampaignSchema = exports.ReviewRecordSchema = exports.CreateRecordSchema = exports.CreateCampaignSchema = void 0;
// @ts-nocheck
const zod_1 = require("zod");
exports.CreateCampaignSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().optional(),
    campaignType: zod_1.z.enum(['periodic', 'event_driven', 'continuous']).default('periodic'),
    dueDate: zod_1.z.string().datetime().optional(),
    scopeJson: zod_1.z.record(zod_1.z.unknown()).optional(),
    frequency: zod_1.z.enum(['monthly', 'quarterly', 'semi_annual', 'annual']).default('quarterly'),
});
exports.CreateRecordSchema = zod_1.z.object({
    campaignId: zod_1.z.string().uuid(),
    attestorUserId: zod_1.z.string().uuid(),
    entityType: zod_1.z.string().min(1).max(100),
    entityId: zod_1.z.string().uuid(),
});
exports.ReviewRecordSchema = zod_1.z.object({
    reviewStatus: zod_1.z.enum(['approved', 'rejected']),
    reviewComment: zod_1.z.string().optional(),
});
exports.TransitionCampaignSchema = zod_1.z.object({
    targetStatus: zod_1.z.enum(['active', 'closed']),
});
//# sourceMappingURL=attestation.schemas.js.map
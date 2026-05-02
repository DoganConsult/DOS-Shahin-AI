"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateAppetiteSchema = exports.UpdateObjectiveSchema = exports.CreateObjectiveSchema = exports.ApproveBriefSchema = exports.CreateBriefSchema = void 0;
// @ts-nocheck
const zod_1 = require("zod");
exports.CreateBriefSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500),
    referenceDate: zod_1.z.string().optional(),
    generationMethod: zod_1.z.enum(['ai_generated', 'manual']).default('ai_generated'),
});
exports.ApproveBriefSchema = zod_1.z.object({
    status: zod_1.z.enum(['approved', 'rejected']),
});
exports.CreateObjectiveSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().optional(),
    parentId: zod_1.z.string().uuid().optional(),
    targetKpi: zod_1.z.string().max(255).optional(),
    targetValue: zod_1.z.number().optional(),
    ownerUserId: zod_1.z.string().uuid().optional(),
    dueDate: zod_1.z.string().optional(),
});
exports.UpdateObjectiveSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(500).optional(),
    currentValue: zod_1.z.number().optional(),
    targetValue: zod_1.z.number().optional(),
    progressPct: zod_1.z.number().min(0).max(100).optional(),
    status: zod_1.z.enum(['active', 'achieved', 'at_risk', 'cancelled']).optional(),
});
exports.CreateAppetiteSchema = zod_1.z.object({
    domainCategory: zod_1.z.string().min(1).max(255),
    quantitativeLimit: zod_1.z.number().optional(),
    qualitativeLimitDesc: zod_1.z.string().optional(),
});
//# sourceMappingURL=executive.schemas.js.map
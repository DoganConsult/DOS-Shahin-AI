"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogStepSchema = exports.ExecutePlaybookSchema = exports.CreateStepSchema = exports.CreateTemplateSchema = void 0;
// @ts-nocheck
const zod_1 = require("zod");
exports.CreateTemplateSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    triggeringEvents: zod_1.z.array(zod_1.z.string()).optional()
});
exports.CreateStepSchema = zod_1.z.object({
    stepOrder: zod_1.z.number().min(1),
    title: zod_1.z.string().min(1).max(255),
    instructionsMd: zod_1.z.string().optional(),
    isAutomated: zod_1.z.boolean().default(false),
    requiredRole: zod_1.z.string().max(100).optional()
});
exports.ExecutePlaybookSchema = zod_1.z.object({
    triggerSourceEntity: zod_1.z.string().max(255).optional()
});
exports.LogStepSchema = zod_1.z.object({
    stepId: zod_1.z.string().uuid(),
    resultData: zod_1.z.record(zod_1.z.unknown()).optional()
});
//# sourceMappingURL=playbooks.schemas.js.map
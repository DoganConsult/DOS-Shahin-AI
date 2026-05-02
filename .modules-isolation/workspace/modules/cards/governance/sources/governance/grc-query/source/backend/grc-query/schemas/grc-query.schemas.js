"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NlqSearchSchema = exports.FederatedSearchSchema = exports.UnifiedSearchSchema = exports.SaveQuerySchema = void 0;
// @ts-nocheck
const zod_1 = require("zod");
exports.SaveQuerySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    queryDslJson: zod_1.z.record(zod_1.z.unknown()),
    isPublic: zod_1.z.boolean().default(false)
});
exports.UnifiedSearchSchema = zod_1.z.object({
    query: zod_1.z.string().min(2),
    limit: zod_1.z.number().max(100).optional(),
    modules: zod_1.z.array(zod_1.z.string()).optional()
});
exports.FederatedSearchSchema = zod_1.z.object({
    queryDslJson: zod_1.z.record(zod_1.z.unknown()),
    limit: zod_1.z.number().max(500).optional(),
    modules: zod_1.z.array(zod_1.z.string()).optional()
});
exports.NlqSearchSchema = zod_1.z.object({
    prompt: zod_1.z.string().min(5),
    limit: zod_1.z.number().max(100).optional()
});
//# sourceMappingURL=grc-query.schemas.js.map
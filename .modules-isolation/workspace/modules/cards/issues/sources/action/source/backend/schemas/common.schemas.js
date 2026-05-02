"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkIdsBody = exports.searchQuery = exports.grcPositiveInt = exports.grcJsonMetadata = exports.statusFilter = exports.paginationQuery = void 0;
const zod_1 = require("zod");
exports.paginationQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    sortBy: zod_1.z.string().max(100).optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).optional().default('desc'),
    pageSize: zod_1.z.coerce.number().int().min(1).max(200).optional(),
});
exports.statusFilter = zod_1.z.object({
    status: zod_1.z.string().max(50).optional(),
});
exports.grcJsonMetadata = zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional();
exports.grcPositiveInt = zod_1.z.coerce.number().int().min(1);
exports.searchQuery = zod_1.z.object({
    q: zod_1.z.string().max(500).optional(),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
});
exports.bulkIdsBody = zod_1.z.object({
    ids: zod_1.z.array(zod_1.z.string().uuid()).min(1).max(100),
});
//# sourceMappingURL=common.schemas.js.map
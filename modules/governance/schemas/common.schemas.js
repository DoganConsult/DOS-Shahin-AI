"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.grcConfidence = exports.queryBoolean = exports.dateRange = exports.grcSortDir = exports.grcISODate = exports.grcSeverity = exports.grcSanitizedText = exports.idParam = exports.bulkIdsBody = exports.searchQuery = exports.grcPositiveInt = exports.grcJsonMetadata = exports.statusFilter = exports.paginationQuery = void 0;
/**
 * Common Zod schemas shared across all ai-engine-service domains.
 */
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
exports.idParam = zod_1.z.object({ id: zod_1.z.string().min(1) });
// Strips control chars / zero-width, trims, caps length. Used across GRC bodies.
const grcSanitizedText = (max) => zod_1.z
    .string()
    .transform((v) => v.replace(/[\u0000-\u001F\u007F\u200B-\u200D\uFEFF]/g, '').trim())
    .pipe(zod_1.z.string().max(max));
exports.grcSanitizedText = grcSanitizedText;
exports.grcSeverity = zod_1.z.enum(['info', 'low', 'medium', 'high', 'critical']);
exports.grcISODate = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})?)?$/, 'ISO-8601 required');
exports.grcSortDir = zod_1.z.enum(['asc', 'desc']);
exports.dateRange = zod_1.z.object({
    from: exports.grcISODate.optional(),
    to: exports.grcISODate.optional(),
});
exports.queryBoolean = zod_1.z
    .union([zod_1.z.boolean(), zod_1.z.enum(['true', 'false', '1', '0'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true' || v === '1'));
exports.grcConfidence = zod_1.z.coerce.number().min(0).max(1);

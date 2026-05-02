"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPositionsQuery = exports.updatePositionBody = exports.createPositionBody = void 0;
const zod_1 = require("zod");
const common_schemas_1 = require("./common.schemas");
exports.createPositionBody = zod_1.z.object({
    dept_id: zod_1.z.string().uuid('Invalid department ID format').optional(),
    title_en: zod_1.z.string().min(1, 'English title is required').max(255, 'English title too long'),
    title_ar: zod_1.z.string().min(1, 'Arabic title is required').max(255, 'Arabic title too long').optional(),
    grade: zod_1.z.string().max(50, 'Grade too long').optional(),
    reports_to_position_id: zod_1.z.string().uuid('Invalid reports-to position ID format').optional(),
    status: zod_1.z.enum(['active', 'inactive', 'vacant'], {
        message: 'Invalid status. Must be active, inactive, or vacant.',
    }).default('active'),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
});
exports.updatePositionBody = exports.createPositionBody.partial();
exports.listPositionsQuery = common_schemas_1.paginationQuery.extend({
    departmentId: zod_1.z.string().uuid('Invalid department ID format').optional(),
});
//# sourceMappingURL=positions.schemas.js.map
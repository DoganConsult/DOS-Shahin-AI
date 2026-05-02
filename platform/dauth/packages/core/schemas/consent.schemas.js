"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.memoryConsentBody = exports.consentListQuery = exports.revokeConsentBody = exports.grantConsentBody = void 0;
const zod_1 = require("zod");
const consentType = zod_1.z.string().min(1).max(50);
const consentVersion = zod_1.z.string().min(1).max(20).default('1.0');
const legalBasis = zod_1.z.enum(['consent', 'legitimate_interest', 'contract', 'legal_obligation', 'vital_interest', 'public_interest']).default('consent');
const consentAction = zod_1.z.enum(['grant', 'revoke', 'forget', 'export', 'update_purpose']);
exports.grantConsentBody = zod_1.z.object({
    consentType,
    consentVersion,
    legalBasis,
    dataCategories: zod_1.z.array(zod_1.z.string().max(100)).max(50).default([]),
    retentionPeriodDays: zod_1.z.number().int().min(1).max(3650).default(365),
    purpose: zod_1.z.string().max(1000).optional(),
}).strict();
exports.revokeConsentBody = zod_1.z.object({
    consentType,
    consentVersion,
    reason: zod_1.z.string().max(500).optional(),
}).strict();
exports.consentListQuery = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    pageSize: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    consentType: consentType.optional(),
    granted: zod_1.z.enum(['true', 'false']).optional(),
}).partial();
exports.memoryConsentBody = zod_1.z.object({
    action: consentAction,
    purpose: zod_1.z.string().max(1000).optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
}).strict();
//# sourceMappingURL=consent.schemas.js.map
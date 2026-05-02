"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GRC_QUERY_SOD_RULES = void 0;
exports.GRC_QUERY_SOD_RULES = [
    {
        ruleCode: 'SOD-GRC-01',
        descriptionEn: 'Creator cannot approve their own changes',
        descriptionAr: 'لا يمكن للمنشئ الموافقة على تغييراته الخاصة',
        conflictingActions: ['grc-query.draft.write', 'grc-query.draft.approve'],
        conflictingRoles: [],
        conflictingTransitions: [],
        severity: 'high',
        enforcement: 'block',
        temporaryWaiverAllowed: false,
        waiverMaxDays: 30,
        compensatingControls: [],
        overrideAuthority: ['sysadmin'],
        auditObligations: ['log_attempt']
    }
];
//# sourceMappingURL=grc-query.sod.js.map
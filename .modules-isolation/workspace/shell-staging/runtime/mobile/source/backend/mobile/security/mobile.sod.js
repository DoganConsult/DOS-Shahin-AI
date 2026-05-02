"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MOBILE_SOD_RULES = void 0;
exports.MOBILE_SOD_RULES = [
    {
        ruleCode: 'SOD-MOB-01',
        descriptionEn: 'Creator cannot approve their own changes',
        descriptionAr: 'لا يمكن للمنشئ الموافقة على تغييراته الخاصة',
        conflictingActions: ['mobile.draft.write', 'mobile.draft.approve'],
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
//# sourceMappingURL=mobile.sod.js.map
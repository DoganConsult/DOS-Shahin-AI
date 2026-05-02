"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PLAYBOOKS_SOD_RULES = void 0;
exports.PLAYBOOKS_SOD_RULES = [
    {
        ruleCode: 'SOD-PLA-01',
        descriptionEn: 'Creator cannot approve their own changes',
        descriptionAr: 'لا يمكن للمنشئ الموافقة على تغييراته الخاصة',
        conflictingActions: ['playbooks.draft.write', 'playbooks.draft.approve'],
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
//# sourceMappingURL=playbooks.sod.js.map
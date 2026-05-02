"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RISK_SOD_RULES = void 0;
exports.RISK_SOD_RULES = [
    {
        ruleCode: 'risk-sod-001',
        severity: 'critical',
        conflictingRoles: ['risk.contributor', 'risk.approver'],
        conflictingActions: ['risk.assessment.write', 'risk.assessment.approve'],
        descriptionEn: 'A user cannot both create and approve risk assessments',
        descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد تقييمات المخاطر في نفس الوقت',
    },
    {
        ruleCode: 'risk-sod-002',
        severity: 'high',
        conflictingRoles: ['risk.contributor', 'risk.executive_owner'],
        conflictingActions: ['risk.record.write', 'risk.record.delete'],
        descriptionEn: 'A user cannot both create and delete risk records',
        descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات المخاطر في نفس الوقت',
    },
    {
        ruleCode: 'risk-sod-003',
        severity: 'high',
        conflictingRoles: ['risk.operator', 'risk.approver'],
        conflictingActions: ['risk.treatment.write', 'risk.assessment.approve'],
        descriptionEn: 'A user cannot both manage treatments and approve the assessments they treat',
        descriptionAr: 'لا يمكن للمستخدم إدارة المعالجات واعتماد التقييمات التي يعالجها',
    },
];
//# sourceMappingURL=risk.sod.js.map
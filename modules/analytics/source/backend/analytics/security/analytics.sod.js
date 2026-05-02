"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ANALYTICS_SOD_RULES = void 0;
exports.ANALYTICS_SOD_RULES = [
    {
        ruleCode: 'anl-sod-001',
        severity: 'critical',
        conflictingRoles: ['analytics.operator', 'analytics.viewer'],
        conflictingActions: ['analytics.record.write', 'analytics.record.approve'],
        descriptionEn: 'A user cannot both write and approve analytics records',
        descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات analytics في نفس الوقت',
    },
    {
        ruleCode: 'anl-sod-002',
        severity: 'high',
        conflictingRoles: ['analytics.operator'],
        conflictingActions: ['analytics.record.write', 'analytics.record.delete'],
        descriptionEn: 'A user cannot both write and delete analytics records',
        descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات analytics في نفس الوقت',
    },
];
//# sourceMappingURL=analytics.sod.js.map
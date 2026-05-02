export const AGRC_ENGINE_SOD_RULES = [
    {
        ruleCode: 'age-sod-001',
        severity: 'critical',
        conflictingRoles: ['agrc-engine.operator', 'agrc-engine.viewer'],
        conflictingActions: ['agrc-engine.record.write', 'agrc-engine.record.approve'],
        descriptionEn: 'A user cannot both write and approve agrc-engine records',
        descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات agrc-engine في نفس الوقت',
    },
    {
        ruleCode: 'age-sod-002',
        severity: 'high',
        conflictingRoles: ['agrc-engine.operator'],
        conflictingActions: ['agrc-engine.record.write', 'agrc-engine.record.delete'],
        descriptionEn: 'A user cannot both write and delete agrc-engine records',
        descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات agrc-engine في نفس الوقت',
    },
];
//# sourceMappingURL=agrc-engine.sod.js.map
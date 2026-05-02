export const AI_SOD_RULES = [
    {
        ruleCode: 'ai-sod-001',
        severity: 'critical',
        conflictingRoles: ['ai.contributor', 'ai.approver'],
        conflictingActions: ['ai.record.write', 'ai.record.approve'],
        descriptionEn: 'A user cannot both create and approve ai records',
        descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات ai في نفس الوقت',
    },
    {
        ruleCode: 'ai-sod-002',
        severity: 'high',
        conflictingRoles: ['ai.contributor', 'ai.executive_owner'],
        conflictingActions: ['ai.record.write', 'ai.record.delete'],
        descriptionEn: 'A user cannot both create and delete ai records',
        descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات ai في نفس الوقت',
    },
];
//# sourceMappingURL=ai.sod.js.map
interface LOCAL_KNOWLEDGE_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const LOCAL_KNOWLEDGE_SOD_RULES: LOCAL_KNOWLEDGE_SodRule[] = [
  {
    ruleCode: 'lkn-sod-001',
    severity: 'critical',
    conflictingRoles: ['local-knowledge.contributor', 'local-knowledge.approver'],
    conflictingActions: ['local-knowledge.record.write', 'local-knowledge.record.approve'],
    descriptionEn: 'A user cannot both create and approve local-knowledge records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات local-knowledge في نفس الوقت',
  },
  {
    ruleCode: 'lkn-sod-002',
    severity: 'high',
    conflictingRoles: ['local-knowledge.contributor', 'local-knowledge.executive_owner'],
    conflictingActions: ['local-knowledge.record.write', 'local-knowledge.record.delete'],
    descriptionEn: 'A user cannot both create and delete local-knowledge records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات local-knowledge في نفس الوقت',
  },
];

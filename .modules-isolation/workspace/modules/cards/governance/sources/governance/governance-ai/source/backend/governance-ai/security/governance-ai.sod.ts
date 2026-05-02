interface GOVERNANCE_AI_SodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const GOVERNANCE_AI_SOD_RULES: GOVERNANCE_AI_SodRule[] = [
  {
    ruleCode: 'gai-sod-001',
    severity: 'critical',
    conflictingRoles: ['governance-ai.operator', 'governance-ai.viewer'],
    conflictingActions: ['governance-ai.record.write', 'governance-ai.record.approve'],
    descriptionEn: 'A user cannot both write and approve governance-ai records',
    descriptionAr: 'لا يمكن للمستخدم كتابة واعتماد سجلات governance-ai في نفس الوقت',
  },
  {
    ruleCode: 'gai-sod-002',
    severity: 'high',
    conflictingRoles: ['governance-ai.operator'],
    conflictingActions: ['governance-ai.record.write', 'governance-ai.record.delete'],
    descriptionEn: 'A user cannot both write and delete governance-ai records',
    descriptionAr: 'لا يمكن للمستخدم كتابة وحذف سجلات governance-ai في نفس الوقت',
  },
];

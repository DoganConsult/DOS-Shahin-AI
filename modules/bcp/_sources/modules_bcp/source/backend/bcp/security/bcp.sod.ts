export interface BCPSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const BCP_SOD_RULES: BCPSodRule[] = [
  {
    ruleCode: 'bcp-sod-001',
    severity: 'critical',
    conflictingRoles: ['bcp.contributor', 'bcp.approver'],
    conflictingActions: ['bcp.record.write', 'bcp.record.approve'],
    descriptionEn: 'A user cannot both create and approve bcp records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات bcp في نفس الوقت',
  },
  {
    ruleCode: 'bcp-sod-002',
    severity: 'high',
    conflictingRoles: ['bcp.contributor', 'bcp.executive_owner'],
    conflictingActions: ['bcp.record.write', 'bcp.record.delete'],
    descriptionEn: 'A user cannot both create and delete bcp records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات bcp في نفس الوقت',
  },
];

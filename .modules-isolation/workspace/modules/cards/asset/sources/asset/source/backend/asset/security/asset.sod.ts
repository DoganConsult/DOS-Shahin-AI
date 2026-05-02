export interface ASSETSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const ASSET_SOD_RULES: ASSETSodRule[] = [
  {
    ruleCode: 'ast-sod-001',
    severity: 'critical',
    conflictingRoles: ['asset.contributor', 'asset.approver'],
    conflictingActions: ['asset.record.write', 'asset.record.approve'],
    descriptionEn: 'A user cannot both create and approve asset records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات asset في نفس الوقت',
  },
  {
    ruleCode: 'ast-sod-002',
    severity: 'high',
    conflictingRoles: ['asset.contributor', 'asset.executive_owner'],
    conflictingActions: ['asset.record.write', 'asset.record.delete'],
    descriptionEn: 'A user cannot both create and delete asset records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات asset في نفس الوقت',
  },
];

export interface VENDORSodRule {
  ruleCode: string;
  severity: 'critical' | 'high' | 'medium';
  conflictingRoles: string[];
  conflictingActions: string[];
  descriptionEn: string;
  descriptionAr: string;
}

export const VENDOR_SOD_RULES: VENDORSodRule[] = [
  {
    ruleCode: 'vnd-sod-001',
    severity: 'critical',
    conflictingRoles: ['vendor.contributor', 'vendor.approver'],
    conflictingActions: ['vendor.record.write', 'vendor.record.approve'],
    descriptionEn: 'A user cannot both create and approve vendor records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء واعتماد سجلات vendor في نفس الوقت',
  },
  {
    ruleCode: 'vnd-sod-002',
    severity: 'high',
    conflictingRoles: ['vendor.contributor', 'vendor.executive_owner'],
    conflictingActions: ['vendor.record.write', 'vendor.record.delete'],
    descriptionEn: 'A user cannot both create and delete vendor records',
    descriptionAr: 'لا يمكن للمستخدم إنشاء وحذف سجلات vendor في نفس الوقت',
  },
];

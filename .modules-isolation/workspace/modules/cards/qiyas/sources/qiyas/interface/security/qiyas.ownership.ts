interface QIYAS_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const QIYAS_OWNERSHIP_RULES: QIYAS_OwnershipRule[] = [
  { entityType: 'qiyas_benchmark', defaultOwnerRole: 'qiyas.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'qiyas_benchmark entities require module lead ownership' },
  { entityType: 'qiyas_assessment', defaultOwnerRole: 'qiyas.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'qiyas_assessment entities require module lead ownership' },
];

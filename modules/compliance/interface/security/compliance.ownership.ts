export interface COMPLIANCEOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const COMPLIANCE_OWNERSHIP_RULES: COMPLIANCEOwnershipRule[] = [
  { entityType: 'framework', defaultOwnerRole: 'compliance.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'framework entities require module lead ownership' },
  { entityType: 'obligation', defaultOwnerRole: 'compliance.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'obligation entities require module lead ownership' },
  { entityType: 'assessment', defaultOwnerRole: 'compliance.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'assessment entities require module lead ownership' },
];

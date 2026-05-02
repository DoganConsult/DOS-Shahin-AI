export interface GOVERNANCEOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const GOVERNANCE_OWNERSHIP_RULES: GOVERNANCEOwnershipRule[] = [
  { entityType: 'committee', defaultOwnerRole: 'governance.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'committee entities require module lead ownership' },
  { entityType: 'charter', defaultOwnerRole: 'governance.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'charter entities require module lead ownership' },
  { entityType: 'mandate', defaultOwnerRole: 'governance.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'mandate entities require module lead ownership' },
];

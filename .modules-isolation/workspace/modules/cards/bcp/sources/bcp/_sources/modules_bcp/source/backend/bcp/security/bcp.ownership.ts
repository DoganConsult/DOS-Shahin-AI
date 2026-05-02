export interface BCPOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const BCP_OWNERSHIP_RULES: BCPOwnershipRule[] = [
  { entityType: 'bcp_plan', defaultOwnerRole: 'bcp.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'bcp_plan entities require module lead ownership' },
  { entityType: 'recovery_test', defaultOwnerRole: 'bcp.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'recovery_test entities require module lead ownership' },
  { entityType: 'impact_analysis', defaultOwnerRole: 'bcp.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'impact_analysis entities require module lead ownership' },
];

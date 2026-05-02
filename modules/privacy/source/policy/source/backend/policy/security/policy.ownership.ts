export interface POLICYOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const POLICY_OWNERSHIP_RULES: POLICYOwnershipRule[] = [
  { entityType: 'policy', defaultOwnerRole: 'policy.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'policy entities require module lead ownership' },
  { entityType: 'standard', defaultOwnerRole: 'policy.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'standard entities require module lead ownership' },
  { entityType: 'procedure', defaultOwnerRole: 'policy.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'procedure entities require module lead ownership' },
];

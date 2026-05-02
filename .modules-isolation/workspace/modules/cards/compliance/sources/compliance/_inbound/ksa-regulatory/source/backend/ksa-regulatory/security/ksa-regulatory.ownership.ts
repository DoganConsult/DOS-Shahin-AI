interface KSA_REGULATORY_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const KSA_REGULATORY_OWNERSHIP_RULES: KSA_REGULATORY_OwnershipRule[] = [
  { entityType: 'regulatory_requirement', defaultOwnerRole: 'ksa-regulatory.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'regulatory_requirement entities require module lead ownership' },
  { entityType: 'regulatory_mapping', defaultOwnerRole: 'ksa-regulatory.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'regulatory_mapping entities require module lead ownership' },
];

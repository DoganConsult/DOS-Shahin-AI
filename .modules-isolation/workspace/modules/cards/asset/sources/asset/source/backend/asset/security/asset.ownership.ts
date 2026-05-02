export interface ASSETOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const ASSET_OWNERSHIP_RULES: ASSETOwnershipRule[] = [
  { entityType: 'asset', defaultOwnerRole: 'asset.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'asset entities require module lead ownership' },
  { entityType: 'asset_classification', defaultOwnerRole: 'asset.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'asset_classification entities require module lead ownership' },
  { entityType: 'asset_owner', defaultOwnerRole: 'asset.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'asset_owner entities require module lead ownership' },
];

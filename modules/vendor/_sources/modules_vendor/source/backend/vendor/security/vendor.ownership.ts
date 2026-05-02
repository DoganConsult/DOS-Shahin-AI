export interface VENDOROwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const VENDOR_OWNERSHIP_RULES: VENDOROwnershipRule[] = [
  { entityType: 'vendor', defaultOwnerRole: 'vendor.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'vendor entities require module lead ownership' },
  { entityType: 'contract', defaultOwnerRole: 'vendor.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'contract entities require module lead ownership' },
  { entityType: 'assessment', defaultOwnerRole: 'vendor.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'assessment entities require module lead ownership' },
];

interface PORTALS_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const PORTALS_OWNERSHIP_RULES: PORTALS_OwnershipRule[] = [
  { entityType: 'portal_config', defaultOwnerRole: 'portals.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'portal_config entities require module lead ownership' },
  { entityType: 'portal_page', defaultOwnerRole: 'portals.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'portal_page entities require module lead ownership' },
];

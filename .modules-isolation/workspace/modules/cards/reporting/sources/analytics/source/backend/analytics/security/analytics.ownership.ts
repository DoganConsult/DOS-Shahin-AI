interface ANALYTICS_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const ANALYTICS_OWNERSHIP_RULES: ANALYTICS_OwnershipRule[] = [
  { entityType: 'analytics_dashboard', defaultOwnerRole: 'analytics.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'analytics_dashboard entities require operator ownership' },
  { entityType: 'analytics_query', defaultOwnerRole: 'analytics.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'analytics_query entities require operator ownership' },
];

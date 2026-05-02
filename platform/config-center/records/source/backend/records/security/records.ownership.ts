interface RECORDS_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const RECORDS_OWNERSHIP_RULES: RECORDS_OwnershipRule[] = [
  { entityType: 'record_entry', defaultOwnerRole: 'records.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'record_entry entities require module lead ownership' },
  { entityType: 'record_category', defaultOwnerRole: 'records.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'record_category entities require module lead ownership' },
];

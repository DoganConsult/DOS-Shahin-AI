interface REPORTING_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const REPORTING_OWNERSHIP_RULES: REPORTING_OwnershipRule[] = [
  { entityType: 'report_definition', defaultOwnerRole: 'reporting.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'report_definition entities require operator ownership' },
  { entityType: 'report_schedule', defaultOwnerRole: 'reporting.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'report_schedule entities require operator ownership' },
];

export interface DoraOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const DORA_OWNERSHIP_RULES: DoraOwnershipRule[] = [
  { entityType: 'dora_ict_risk', defaultOwnerRole: 'dora.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'ICT risk entities require module lead ownership' },
  { entityType: 'dora_incident', defaultOwnerRole: 'dora.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'DORA incident entities require module lead ownership' },
  { entityType: 'dora_third_party', defaultOwnerRole: 'dora.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'Third-party provider entities require module lead ownership' },
];

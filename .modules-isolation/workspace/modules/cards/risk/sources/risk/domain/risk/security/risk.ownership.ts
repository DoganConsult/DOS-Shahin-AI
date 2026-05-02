export interface RISKOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const RISK_OWNERSHIP_RULES: RISKOwnershipRule[] = [
  { entityType: 'risk_register', defaultOwnerRole: 'risk.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'risk_register entities require module lead ownership' },
  { entityType: 'risk_treatment', defaultOwnerRole: 'risk.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'risk_treatment entities require module lead ownership' },
  { entityType: 'risk_appetite', defaultOwnerRole: 'risk.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'risk_appetite entities require module lead ownership' },
];

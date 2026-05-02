export interface AUDITOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const AUDIT_OWNERSHIP_RULES: AUDITOwnershipRule[] = [
  { entityType: 'audit_engagement', defaultOwnerRole: 'audit.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'audit_engagement entities require module lead ownership' },
  { entityType: 'audit_finding', defaultOwnerRole: 'audit.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'audit_finding entities require module lead ownership' },
  { entityType: 'audit_plan', defaultOwnerRole: 'audit.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'audit_plan entities require module lead ownership' },
];

export interface REMEDIATIONOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const REMEDIATION_OWNERSHIP_RULES: REMEDIATIONOwnershipRule[] = [
  { entityType: 'remediation_plan', defaultOwnerRole: 'remediation.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'remediation_plan entities require module lead ownership' },
  { entityType: 'remediation_task', defaultOwnerRole: 'remediation.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'remediation_task entities require module lead ownership' },
  { entityType: 'remediation_action', defaultOwnerRole: 'remediation.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'remediation_action entities require module lead ownership' },
];

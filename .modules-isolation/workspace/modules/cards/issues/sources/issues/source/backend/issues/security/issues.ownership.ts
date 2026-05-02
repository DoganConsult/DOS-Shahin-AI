export interface ISSUESOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const ISSUES_OWNERSHIP_RULES: ISSUESOwnershipRule[] = [
  { entityType: 'issue', defaultOwnerRole: 'issues.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'issue entities require module lead ownership' },
  { entityType: 'finding', defaultOwnerRole: 'issues.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'finding entities require module lead ownership' },
  { entityType: 'root_cause', defaultOwnerRole: 'issues.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'root_cause entities require module lead ownership' },
];

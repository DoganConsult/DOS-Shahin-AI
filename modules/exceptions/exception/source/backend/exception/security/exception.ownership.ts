export interface EXCEPTIONOwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const EXCEPTION_OWNERSHIP_RULES: EXCEPTIONOwnershipRule[] = [
  { entityType: 'exception_request', defaultOwnerRole: 'exception.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'exception_request entities require module lead ownership' },
  { entityType: 'compensating_control', defaultOwnerRole: 'exception.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'compensating_control entities require module lead ownership' },
  { entityType: 'exception_approval', defaultOwnerRole: 'exception.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'exception_approval entities require module lead ownership' },
];

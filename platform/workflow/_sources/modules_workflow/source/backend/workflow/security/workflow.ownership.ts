interface WORKFLOW_OwnershipRule {
  entityType: string;
  defaultOwnerRole: string;
  canDelegate: boolean;
  requiresApproval: boolean;
  ownershipField: string;
  descriptionEn: string;
}

export const WORKFLOW_OWNERSHIP_RULES: WORKFLOW_OwnershipRule[] = [
  { entityType: 'workflow_template', defaultOwnerRole: 'workflow.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'workflow_template entities require operator ownership' },
  { entityType: 'workflow_instance', defaultOwnerRole: 'workflow.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'workflow_instance entities require operator ownership' },
];

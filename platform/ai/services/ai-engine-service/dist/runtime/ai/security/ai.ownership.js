export const AI_OWNERSHIP_RULES = [
    { entityType: 'ai_agent', defaultOwnerRole: 'ai.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'ai_agent entities require module lead ownership' },
    { entityType: 'ai_conversation', defaultOwnerRole: 'ai.module_lead', canDelegate: true, requiresApproval: true, ownershipField: 'owner_id', descriptionEn: 'ai_conversation entities require module lead ownership' },
];
//# sourceMappingURL=ai.ownership.js.map
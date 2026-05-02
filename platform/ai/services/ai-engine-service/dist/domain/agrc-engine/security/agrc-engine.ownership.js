export const AGRC_ENGINE_OWNERSHIP_RULES = [
    { entityType: 'engine_rule', defaultOwnerRole: 'agrc-engine.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'engine_rule entities require operator ownership' },
    { entityType: 'engine_execution', defaultOwnerRole: 'agrc-engine.operator', canDelegate: true, requiresApproval: false, ownershipField: 'owner_id', descriptionEn: 'engine_execution entities require operator ownership' },
];
//# sourceMappingURL=agrc-engine.ownership.js.map
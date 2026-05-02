export const AI_MODEL_GOVERNANCE_STATES = [
    'draft', 'in_review', 'approved', 'deployed', 'monitoring', 'suspended', 'retired', 'archived',
];
export const AI_MODEL_GOVERNANCE_TRANSITIONS = {
    draft: ['in_review'],
    in_review: ['approved', 'draft'],
    approved: ['deployed'],
    deployed: ['monitoring', 'suspended'],
    monitoring: ['suspended', 'retired'],
    suspended: ['monitoring', 'retired'],
    retired: ['archived'],
    archived: [],
};
export const AI_RISK_ASSESSMENT_STATES = [
    'planned', 'in_progress', 'under_review', 'completed', 'cancelled',
];
export const AI_RISK_ASSESSMENT_TRANSITIONS = {
    planned: ['in_progress', 'cancelled'],
    in_progress: ['under_review', 'cancelled'],
    under_review: ['completed', 'in_progress'],
    completed: [],
    cancelled: [],
};
//# sourceMappingURL=ai-governance-lifecycle.js.map
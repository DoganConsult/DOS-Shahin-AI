export const AGRCENGINE_STATES = [
    'draft', 'in_review', 'approved', 'active', 'suspended', 'archived',
];
export const AGRCENGINE_TRANSITIONS = {
    draft: ['in_review'],
    in_review: ['approved', 'draft'],
    approved: ['active'],
    active: ['suspended', 'archived'],
    suspended: ['active', 'archived'],
    archived: [],
};
//# sourceMappingURL=agrc-engine-lifecycle.js.map
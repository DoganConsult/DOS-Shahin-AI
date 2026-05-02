export const AI_AGENT_RUN_STATES = [
    'pending',
    'running',
    'awaiting_approval',
    'completed',
    'failed',
    'cancelled',
];
export const AI_AGENT_RUN_TRANSITIONS = {
    pending: ['running', 'cancelled'],
    running: ['awaiting_approval', 'completed', 'failed', 'cancelled'],
    awaiting_approval: ['running', 'cancelled'],
    completed: [],
    failed: ['pending'],
    cancelled: [],
};
export const AI_PROPOSAL_STATES = [
    'draft',
    'submitted',
    'in_review',
    'approved',
    'rejected',
    'applied',
    'archived',
];
export const AI_PROPOSAL_TRANSITIONS = {
    draft: ['submitted'],
    submitted: ['in_review'],
    in_review: ['approved', 'rejected'],
    approved: ['applied', 'archived'],
    rejected: ['draft', 'archived'],
    applied: ['archived'],
    archived: [],
};
export function isTerminalRunState(state) {
    return ['completed', 'failed', 'cancelled'].includes(state);
}
//# sourceMappingURL=ai-lifecycle.js.map
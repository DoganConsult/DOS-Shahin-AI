"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const module_sdk_1 = require("@dos/module-sdk");
/**
 * Executive Module — Lifecycle State Machines
 *
 * 1. executive_briefs: draft → in_review → approved → published → archived
 * 2. executive_objectives: draft → active → in_progress → completed → cancelled
 */
// ── Brief Lifecycle ─────────────────────────────────────────────
const BRIEF_STATES = ['draft', 'in_review', 'approved', 'published', 'archived'];
const BRIEF_TRANSITIONS = {
    draft: ['in_review'],
    in_review: ['approved', 'draft'],
    approved: ['published'],
    published: ['archived'],
    archived: [],
};
(0, module_sdk_1.registerLifecycleDefinition)({ moduleCode: 'executive', entityType: 'executive_briefs', states: BRIEF_STATES, transitions: BRIEF_TRANSITIONS, ...{
        initialState: 'draft',
        terminalStates: ['archived'],
        transitionPermissions: {
            'draft->in_review': 'executive.brief.manage',
            'in_review->approved': 'executive.brief.approve',
            'in_review->draft': 'executive.brief.manage',
            'approved->published': 'executive.brief.approve',
            'published->archived': 'executive.brief.manage',
        },
        transitionApprovals: {
            'in_review->approved': { required: true, workflowTemplate: 'executive_brief_approval' },
        },
    } });
// ── Objective Lifecycle ─────────────────────────────────────────
const OBJECTIVE_STATES = ['draft', 'active', 'in_progress', 'completed', 'cancelled'];
const OBJECTIVE_TRANSITIONS = {
    draft: ['active'],
    active: ['in_progress', 'cancelled'],
    in_progress: ['completed', 'cancelled'],
    completed: [],
    cancelled: [],
};
(0, module_sdk_1.registerLifecycleDefinition)({ moduleCode: 'executive', entityType: 'executive_objectives', states: OBJECTIVE_STATES, transitions: OBJECTIVE_TRANSITIONS, ...{
        initialState: 'draft',
        terminalStates: ['completed', 'cancelled'],
        transitionPermissions: {
            'draft->active': 'executive.objective.manage',
            'active->in_progress': 'executive.objective.manage',
            'in_progress->completed': 'executive.objective.manage',
            'active->cancelled': 'executive.objective.manage',
            'in_progress->cancelled': 'executive.objective.manage',
        },
    } });
//# sourceMappingURL=lifecycle-registration.js.map
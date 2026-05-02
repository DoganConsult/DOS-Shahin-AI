import { registerLifecycleDefinition } from '@dos/module-sdk';

/**
 * Executive Module — Lifecycle State Machines
 *
 * 1. executive_briefs: draft → in_review → approved → published → archived
 * 2. executive_objectives: draft → active → in_progress → completed → cancelled
 */

// ── Brief Lifecycle ─────────────────────────────────────────────
const BRIEF_STATES = ['draft', 'in_review', 'approved', 'published', 'archived'] as string[];

const BRIEF_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['published'],
  published: ['archived'],
  archived: [],
};

registerLifecycleDefinition({ moduleCode: 'executive', entityType: 'executive_briefs', states: BRIEF_STATES as any[], transitions: BRIEF_TRANSITIONS as any, ...{
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
const OBJECTIVE_STATES = ['draft', 'active', 'in_progress', 'completed', 'cancelled'] as string[];

const OBJECTIVE_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active'],
  active: ['in_progress', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
};

registerLifecycleDefinition({ moduleCode: 'executive', entityType: 'executive_objectives', states: OBJECTIVE_STATES as any[], transitions: OBJECTIVE_TRANSITIONS as any, ...{
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

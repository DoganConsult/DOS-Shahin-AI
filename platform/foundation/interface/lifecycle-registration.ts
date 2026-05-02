import { registerLifecycleDefinition, EntityStateMachine } from '../ports/lifecycle.port';

const FOUNDATION_STATES = ['draft', 'in_review', 'approved', 'published', 'active', 'suspended', 'archived'] as const;

const FOUNDATION_TRANSITIONS: Record<string, string[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['published'],
  published: ['active'],
  active: ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived: [],
};

registerLifecycleDefinition('foundation', 'foundation_node', FOUNDATION_STATES, FOUNDATION_TRANSITIONS, {
  initialState: 'draft',
  terminalStates: ['archived'],
});

export const FOUNDATION_STATE_MACHINE = new EntityStateMachine<'draft' | 'in_review' | 'approved' | 'published' | 'active' | 'suspended' | 'archived'>({
  entityType: 'foundation_node',
  transitions: {
    draft: ['in_review'],
    in_review: ['approved', 'draft'],
    approved: ['published'],
    published: ['active'],
    active: ['suspended', 'archived'],
    suspended: ['active', 'archived'],
    archived: [],
  },
});

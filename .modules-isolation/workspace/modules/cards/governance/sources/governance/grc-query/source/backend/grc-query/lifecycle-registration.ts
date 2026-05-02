import { registerLifecycleDefinition } from '@dos/module-sdk';

const QUERY_STATES = ['draft', 'active', 'archived'] as string[];
const QUERY_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active'],
  active: ['archived'],
  archived: [],
};

registerLifecycleDefinition({ moduleCode: 'grc-query', entityType: 'grc_saved_queries', states: QUERY_STATES as any[], transitions: QUERY_TRANSITIONS as any, ...{
  initialState: 'draft',
  terminalStates: ['archived'],
  transitionPermissions: {
    'draft->active': 'grc-query.manage',
    'active->archived': 'grc-query.manage',
  },
} });

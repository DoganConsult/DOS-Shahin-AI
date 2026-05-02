import { registerLifecycleDefinition } from '@dos/module-sdk';

const PLAYBOOK_STATES = ['draft', 'active', 'executing', 'completed', 'archived'] as string[];
const PLAYBOOK_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active'],
  active: ['executing', 'archived'],
  executing: ['completed'],
  completed: ['archived'],
  archived: [],
};

registerLifecycleDefinition({ moduleCode: 'playbooks', entityType: 'playbooks', states: PLAYBOOK_STATES as any[], transitions: PLAYBOOK_TRANSITIONS as any, ...{
  initialState: 'draft',
  terminalStates: ['archived'],
  transitionPermissions: {
    'draft->active': 'playbooks.manage',
    'active->executing': 'playbooks.execute',
    'active->archived': 'playbooks.manage',
    'executing->completed': 'playbooks.execute',
    'completed->archived': 'playbooks.manage',
  },
} });

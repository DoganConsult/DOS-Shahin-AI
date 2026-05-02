import { registerLifecycleDefinition } from '@dos/module-sdk';

const SNAPSHOT_STATES = ['pending_import', 'imported', 'active', 'archived'] as string[];

const SNAPSHOT_TRANSITIONS: Record<string, readonly string[]> = {
  pending_import: ['imported'],
  imported: ['active'],
  active: ['archived'],
  archived: [],
};

registerLifecycleDefinition({ moduleCode: 'config-center', entityType: 'config_snapshots', states: SNAPSHOT_STATES as any[], transitions: SNAPSHOT_TRANSITIONS as any, ...{
  initialState: 'pending_import',
  terminalStates: ['archived'],
  transitionPermissions: {
    'pending_import->imported': 'config-center.manage',
    'imported->active': 'config-center.manage',
    'active->archived': 'config-center.manage',
  },
  transitionApprovals: {
    'imported->active': { required: true, workflowTemplate: 'config_import_approval' },
  },
} });

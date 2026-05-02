import { registerLifecycleDefinition } from '@dos/module-sdk';

const BENCHMARK_STATES = ['draft', 'active', 'completed', 'archived'] as string[];
const BENCHMARK_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active'],
  active: ['completed'],
  completed: ['archived'],
  archived: [],
};

registerLifecycleDefinition({ moduleCode: 'benchmarks', entityType: 'benchmarks', states: BENCHMARK_STATES as any[], transitions: BENCHMARK_TRANSITIONS as any, ...{
  initialState: 'draft',
  terminalStates: ['archived'],
  transitionPermissions: {
    'draft->active': 'benchmarks.manage',
    'active->completed': 'benchmarks.manage',
    'completed->archived': 'benchmarks.manage',
  },
} });

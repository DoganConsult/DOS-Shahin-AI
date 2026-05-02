import { registerLifecycleDefinition } from '@dos/module-sdk';

const REPORT_STATES = ['generating', 'ready', 'expired', 'archived'] as string[];
const REPORT_TRANSITIONS: Record<string, readonly string[]> = {
  generating: ['ready'],
  ready: ['expired', 'archived'],
  expired: ['archived'],
  archived: [],
};

registerLifecycleDefinition({ moduleCode: 'platform-stats', entityType: 'platform_stat_reports', states: REPORT_STATES as any[], transitions: REPORT_TRANSITIONS as any, ...{
  initialState: 'generating',
  terminalStates: ['archived'],
  transitionPermissions: {
    'generating->ready': 'platform-stats.manage',
    'ready->expired': 'platform-stats.manage',
    'ready->archived': 'platform-stats.manage',
    'expired->archived': 'platform-stats.manage',
  },
} });

import { registerLifecycleDefinition } from '@dos/module-sdk';

const SESSION_STATES = ['active', 'suspended', 'expired', 'revoked'] as string[];
const SESSION_TRANSITIONS: Record<string, readonly string[]> = {
  active: ['suspended', 'expired', 'revoked'],
  suspended: ['active', 'revoked'],
  expired: [],
  revoked: [],
};

registerLifecycleDefinition({ moduleCode: 'mobile', entityType: 'mobile_sessions', states: SESSION_STATES as any[], transitions: SESSION_TRANSITIONS as any, ...{
  initialState: 'active',
  terminalStates: ['expired', 'revoked'],
  transitionPermissions: {
    'active->suspended': 'mobile.session.manage',
    'active->revoked': 'mobile.session.manage',
    'suspended->active': 'mobile.session.manage',
    'suspended->revoked': 'mobile.session.manage',
  },
} });

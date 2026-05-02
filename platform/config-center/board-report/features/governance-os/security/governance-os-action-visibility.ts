import { ACTION_VISIBILITY_RULES, ActionVisibilityRule } from '../../../../shared/security/module-action-visibility';

export const GOVERNANCE_OS_ACTION_RULES: ActionVisibilityRule[] =
  ACTION_VISIBILITY_RULES.filter(r => r.requiresModule === 'governance-os');

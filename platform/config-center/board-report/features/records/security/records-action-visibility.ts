import { ACTION_VISIBILITY_RULES, ActionVisibilityRule } from '../../../../shared/security/module-action-visibility';

export const RECORDS_ACTION_RULES: ActionVisibilityRule[] =
  ACTION_VISIBILITY_RULES.filter(r => r.requiresModule === 'records');

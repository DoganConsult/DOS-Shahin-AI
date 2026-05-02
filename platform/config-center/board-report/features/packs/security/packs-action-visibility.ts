import { ACTION_VISIBILITY_RULES, ActionVisibilityRule } from '../../../../shared/security/module-action-visibility';

export const PACKS_ACTION_RULES: ActionVisibilityRule[] =
  ACTION_VISIBILITY_RULES.filter(r => r.requiresModule === 'packs');

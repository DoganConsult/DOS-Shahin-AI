import { ACTION_VISIBILITY_RULES, ActionVisibilityRule } from '../../../../shared/security/module-action-visibility';

export const AGRC_ENGINE_ACTION_RULES: ActionVisibilityRule[] =
  ACTION_VISIBILITY_RULES.filter(r => r.requiresModule === 'agrc-engine');

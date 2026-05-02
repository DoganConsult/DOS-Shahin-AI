/**
 * Policy Module — Lifecycle Registry Registration
 *
 * Registers the policy entity lifecycle (states + transitions) with the
 * central LifecycleRegistry. Aligned with migration 174 enterprise states.
 * Legacy domain states (review, archived) preserved for backward compat.
 */

import { registerLifecycleDefinition } from './ports/lifecycle.port';
import { POLICY_STATES, POLICY_TRANSITIONS } from './workflows/policy-lifecycle';

registerLifecycleDefinition(
  'policy',
  'policy',
  POLICY_STATES,
  POLICY_TRANSITIONS as Record<string, string[]>,
  {
    initialState: 'draft',
    terminalStates: ['retired'],
    transitionPermissions: {
      'draft->submitted': 'policy.document.update',
      'submitted->under_review': 'policy.document.review',
      'under_review->revision_requested': 'policy.document.review',
      'under_review->approved': 'policy.document.approve',
      'revision_requested->resubmitted': 'policy.document.update',
      'resubmitted->under_review': 'policy.document.review',
      'approved->published': 'policy.document.publish',
      'published->active': 'policy.document.publish',
      'active->review_due': 'policy.document.update',
      'review_due->under_revision': 'policy.document.update',
      'active->retired': 'policy.document.retire',
    },
  },
);

/**
 * exception — Lifecycle Registry Registration
 *
 * Registers entity lifecycles with the central LifecycleRegistry (DOS-owned).
 * DAuth evaluateLifecycleTransition() consumes these definitions.
 * Single source: workflows/exception-lifecycle.ts
 */

import { registerLifecycleDefinition } from './ports/lifecycle.port';
import { EXCEPTION_STATES, EXCEPTION_TRANSITIONS } from './workflows/exception-lifecycle';

registerLifecycleDefinition(
  'exception',
  'exception',
  EXCEPTION_STATES,
  EXCEPTION_TRANSITIONS as Record<string, string[]>,
  {
    initialState: 'draft',
    terminalStates: ['archived'],
    transitionPermissions: {
      'draft->submitted': 'exception.request.create',
      'submitted->under_review': 'exception.request.review',
      'under_review->approved': 'exception.request.approve',
      'under_review->rejected': 'exception.request.approve',
      'approved->active': 'exception.request.review',
      'active->monitoring': 'exception.request.review',
      'monitoring->expired': 'exception.request.review',
      'expired->renewed': 'exception.request.create',
      'expired->closed': 'exception.request.review',
    },
  },
);

registerLifecycleDefinition(
  'exception',
  'policy_exception_requests',
  EXCEPTION_STATES,
  EXCEPTION_TRANSITIONS as Record<string, string[]>,
  {
    initialState: 'draft',
    terminalStates: ['archived'],
  },
);

const POLICY_EXCEPTION_APPROVALS_STATES = [
  'draft',
  'in_review',
  'approved',
  'active',
  'suspended',
  'archived',
] as const;

const POLICY_EXCEPTION_APPROVALS_TRANSITIONS: Record<string, string[]> = {
  draft           : ['in_review'],
  in_review       : ['approved', 'draft'],
  approved        : ['active'],
  active          : ['suspended', 'archived'],
  suspended       : ['active', 'archived'],
  archived        : [],
};

registerLifecycleDefinition(
  'exception',
  'policy_exception_approvals',
  POLICY_EXCEPTION_APPROVALS_STATES,
  POLICY_EXCEPTION_APPROVALS_TRANSITIONS,
  {
    initialState: 'draft',
    terminalStates: ['archived'],
  },
);

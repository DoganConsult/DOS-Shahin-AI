/**
 * Evidence Module — Lifecycle Registry Registration
 *
 * Registers the evidence entity lifecycle (states + transitions) with the
 * central LifecycleRegistry so that lifecycle-auth, EntityStateMachine, and
 * admin diagnostics can resolve evidence definitions at runtime without
 * hitting the DB.
 *
 * Sprint S5 / Z1.13
 */

import { registerLifecycleDefinition } from './ports/lifecycle.port';
import { EVIDENCE_LIFECYCLE_DEFINITIONS } from './data/evidence-security';

registerLifecycleDefinition(
  'evidence',
  EVIDENCE_LIFECYCLE_DEFINITIONS.entityType,
  EVIDENCE_LIFECYCLE_DEFINITIONS.states,
  EVIDENCE_LIFECYCLE_DEFINITIONS.transitions as unknown as Record<string, string[]>,
  {
    initialState: EVIDENCE_LIFECYCLE_DEFINITIONS.initialState,
    terminalStates: EVIDENCE_LIFECYCLE_DEFINITIONS.terminalStates,
    transitionPermissions: EVIDENCE_LIFECYCLE_DEFINITIONS.transitionPermissions as unknown as Record<string, string>,
  },
);

const EVIDENCE_COLLECTION_STATES = [
  'planned', 'in_progress', 'completed', 'failed', 'cancelled',
] as const;

const EVIDENCE_COLLECTION_TRANSITIONS: Record<string, string[]> = {
  planned:     ['in_progress', 'cancelled'],
  in_progress: ['completed', 'failed', 'cancelled'],
  completed:   [],
  failed:      ['planned'],
  cancelled:   [],
};

registerLifecycleDefinition(
  'evidence',
  'evidence_collection',
  EVIDENCE_COLLECTION_STATES,
  EVIDENCE_COLLECTION_TRANSITIONS,
  {
    initialState: 'planned',
    terminalStates: ['completed', 'cancelled'],
    transitionPermissions: {
      'in_progress->completed': 'evidence.collection.complete',
      'in_progress->failed':    'evidence.collection.manage',
    },
  },
);

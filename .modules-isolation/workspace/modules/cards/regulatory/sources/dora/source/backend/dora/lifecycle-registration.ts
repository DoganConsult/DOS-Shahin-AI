/**
 * dora -- Lifecycle Registry Registration
 *
 * Registers entity lifecycles with the central LifecycleRegistry (DOS-owned).
 * DAuth evaluateLifecycleTransition() consumes these definitions.
 *
 * MP-25 §3: Domain-specific lifecycle states for DORA entities:
 *   - ICT Assets: draft -> classified -> active -> decommissioning -> decommissioned
 *   - Resilience Tests: planned -> in_progress -> completed -> failed -> archived
 *   - Major Incidents: detected -> investigating -> containing -> resolved -> closed
 *   - DORA Obligations: draft -> under_review -> approved -> active -> expired -> archived
 *
 * Transition permissions enforce protected operations through DAuth.
 */

import { registerLifecycleDefinition } from './ports/lifecycle.port';

// ── ICT Assets Lifecycle ───────────────────────────────────────────────
// Domain-specific: draft -> classified -> active -> decommissioning -> decommissioned
const DORA_ICT_ASSETS_STATES = [
  'draft',
  'classified',
  'in_review',
  'approved',
  'active',
  'suspended',
  'decommissioning',
  'decommissioned',
  'archived',
] as const;

const DORA_ICT_ASSETS_TRANSITIONS: Record<string, string[]> = {
  draft             : ['classified', 'in_review'],
  classified        : ['in_review', 'active'],
  in_review         : ['approved', 'draft'],
  approved          : ['active'],
  active            : ['suspended', 'decommissioning', 'archived'],
  suspended         : ['active', 'decommissioning', 'archived'],
  decommissioning   : ['decommissioned'],
  decommissioned    : [],
  archived          : [],
};

registerLifecycleDefinition(
  'dora',
  'dora_ict_assets',
  DORA_ICT_ASSETS_STATES,
  DORA_ICT_ASSETS_TRANSITIONS,
  {
    initialState: 'draft',
    terminalStates: ['decommissioned', 'archived'],
    transitionPermissions: {
      'draft->classified': 'dora.record.write',
      'classified->in_review': 'dora.record.write',
      'in_review->approved': 'dora.record.approve',
      'approved->active': 'dora.record.write',
      'active->decommissioning': 'dora.record.approve',
      'decommissioning->decommissioned': 'dora.record.approve',
      'active->suspended': 'dora.record.approve',
      'suspended->active': 'dora.record.approve',
      'active->archived': 'dora.record.approve',
    },
  },
);

// ── Resilience Tests Lifecycle ─────────────────────────────────────────
// Domain-specific: planned -> in_progress -> completed -> failed -> archived
const DORA_RESILIENCE_TESTS_STATES = [
  'planned',
  'scheduled',
  'in_progress',
  'completed',
  'failed',
  'cancelled',
  'archived',
] as const;

const DORA_RESILIENCE_TESTS_TRANSITIONS: Record<string, string[]> = {
  planned           : ['scheduled', 'in_progress', 'cancelled'],
  scheduled         : ['in_progress', 'cancelled'],
  in_progress       : ['completed', 'failed', 'cancelled'],
  completed         : ['archived'],
  failed            : ['planned', 'archived'],
  cancelled         : ['planned', 'archived'],
  archived          : [],
};

registerLifecycleDefinition(
  'dora',
  'dora_resilience_tests',
  DORA_RESILIENCE_TESTS_STATES,
  DORA_RESILIENCE_TESTS_TRANSITIONS,
  {
    initialState: 'planned',
    terminalStates: ['archived'],
    transitionPermissions: {
      'planned->in_progress': 'dora.record.write',
      'scheduled->in_progress': 'dora.record.write',
      'in_progress->completed': 'dora.record.write',
      'in_progress->failed': 'dora.record.write',
      'completed->archived': 'dora.record.approve',
      'failed->planned': 'dora.record.write',
      'planned->cancelled': 'dora.record.approve',
      'scheduled->cancelled': 'dora.record.approve',
      'in_progress->cancelled': 'dora.record.approve',
    },
  },
);

// ── Major Incidents Lifecycle ──────────────────────────────────────────
const DORA_MAJOR_INCIDENTS_STATES = [
  'detected',
  'investigating',
  'containing',
  'resolved',
  'closed',
  'archived',
] as const;

const DORA_MAJOR_INCIDENTS_TRANSITIONS: Record<string, string[]> = {
  detected          : ['investigating'],
  investigating     : ['containing', 'resolved'],
  containing        : ['resolved'],
  resolved          : ['closed'],
  closed            : ['archived'],
  archived          : [],
};

registerLifecycleDefinition(
  'dora',
  'dora_major_incidents',
  DORA_MAJOR_INCIDENTS_STATES,
  DORA_MAJOR_INCIDENTS_TRANSITIONS,
  {
    initialState: 'detected',
    terminalStates: ['archived'],
    transitionPermissions: {
      'detected->investigating': 'dora.record.write',
      'investigating->containing': 'dora.record.write',
      'containing->resolved': 'dora.record.approve',
      'resolved->closed': 'dora.record.approve',
      'closed->archived': 'dora.record.approve',
    },
  },
);

// ── DORA Obligations Lifecycle ─────────────────────────────────────────
// Domain-specific: draft -> under_review -> approved -> active -> expired -> archived
const DORA_OBLIGATIONS_STATES = [
  'draft',
  'under_review',
  'approved',
  'active',
  'overdue',
  'expired',
  'archived',
] as const;

const DORA_OBLIGATIONS_TRANSITIONS: Record<string, string[]> = {
  draft             : ['under_review'],
  under_review      : ['approved', 'draft'],
  approved          : ['active'],
  active            : ['overdue', 'expired', 'archived'],
  overdue           : ['active', 'expired', 'archived'],
  expired           : ['archived'],
  archived          : [],
};

registerLifecycleDefinition(
  'dora',
  'dora_obligations',
  DORA_OBLIGATIONS_STATES,
  DORA_OBLIGATIONS_TRANSITIONS,
  {
    initialState: 'draft',
    terminalStates: ['archived'],
    transitionPermissions: {
      'draft->under_review': 'dora.record.write',
      'under_review->approved': 'dora.record.approve',
      'under_review->draft': 'dora.record.write',
      'approved->active': 'dora.record.write',
      'active->expired': 'dora.record.approve',
      'active->archived': 'dora.record.approve',
      'overdue->active': 'dora.record.write',
      'overdue->archived': 'dora.record.approve',
      'expired->archived': 'dora.record.approve',
    },
  },
);

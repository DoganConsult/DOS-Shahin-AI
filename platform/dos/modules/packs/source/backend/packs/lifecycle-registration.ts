/**
 * Packs -- Lifecycle Registry Registration
 *
 * Registers pack-specific entity lifecycles with the central
 * LifecycleRegistry (DOS-owned). DAuth evaluateLifecycleTransition()
 * consumes these definitions for authorization before any status change.
 *
 * Entity types registered:
 *  1. pack_installations -- pack installation lifecycle
 *     (available -> installing -> installed -> updating -> uninstalling -> uninstalled -> archived)
 *  2. pack_record -- standard CRUD lifecycle for pack configuration records
 *
 * MP-36 Section 7.2: DAuth lifecycle authorization integration.
 *
 * @owner DOS
 * @module packs
 */

import { registerLifecycleDefinition } from './ports/lifecycle.port';

// ── Pack Installation Lifecycle ─────────────────────────────────────────
// The primary lifecycle for packs: covers the full install/update/uninstall flow.

const PACK_INSTALLATION_STATES = [
  'available',
  'installing',
  'installed',
  'updating',
  'uninstalling',
  'uninstalled',
  'failed',
  'archived',
] as const;

const PACK_INSTALLATION_TRANSITIONS: Record<string, string[]> = {
  available:    ['installing'],
  installing:   ['installed', 'failed'],
  installed:    ['updating', 'uninstalling', 'archived'],
  updating:     ['installed', 'failed'],
  uninstalling: ['uninstalled', 'failed'],
  uninstalled:  ['installing', 'archived'],
  failed:       ['installing', 'archived'],
  archived:     [],
};

registerLifecycleDefinition(
  'packs',
  'pack_installations',
  PACK_INSTALLATION_STATES,
  PACK_INSTALLATION_TRANSITIONS,
  {
    initialState: 'available',
    terminalStates: ['archived'],
    transitionPermissions: {
      'available->installing':    'packs.pack.manage',
      'installed->updating':      'packs.pack.manage',
      'installed->uninstalling':  'packs.pack.manage',
      'installed->archived':      'packs.pack.manage',
      'uninstalled->installing':  'packs.pack.manage',
      'uninstalled->archived':    'packs.pack.manage',
      'failed->installing':       'packs.pack.manage',
      'failed->archived':         'packs.pack.manage',
    },
  },
);

// ── Pack Record Lifecycle ───────────────────────────────────────────────
// Standard CRUD lifecycle for pack configuration and metadata records.

const PACK_RECORD_STATES = [
  'draft',
  'in_review',
  'approved',
  'active',
  'suspended',
  'archived',
] as const;

const PACK_RECORD_TRANSITIONS: Record<string, string[]> = {
  draft:     ['in_review'],
  in_review: ['approved', 'draft'],
  approved:  ['active'],
  active:    ['suspended', 'archived'],
  suspended: ['active', 'archived'],
  archived:  [],
};

registerLifecycleDefinition(
  'packs',
  'pack_record',
  PACK_RECORD_STATES,
  PACK_RECORD_TRANSITIONS,
  {
    initialState: 'draft',
    terminalStates: ['archived'],
    transitionPermissions: {
      'draft->in_review':     'packs.policy.manage',
      'in_review->approved':  'packs.pack.manage',
      'in_review->draft':     'packs.policy.manage',
      'approved->active':     'packs.pack.manage',
      'active->suspended':    'packs.pack.manage',
      'active->archived':     'packs.pack.manage',
      'suspended->active':    'packs.pack.manage',
      'suspended->archived':  'packs.pack.manage',
    },
  },
);

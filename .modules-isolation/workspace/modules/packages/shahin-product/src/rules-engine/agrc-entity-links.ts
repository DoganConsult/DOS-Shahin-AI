// @ts-nocheck — module-layer imports not yet extracted
// ============================================================================
// Shahin — AGRC Required Entity Links
// Defines mandatory cross-module relationships that must exist.
// Used by entity-link-integrity.service.ts for orphan detection & enforcement.
// ============================================================================

import type { EntityType, RelationshipType } from '@dos/types';

export interface RequiredEntityLink {
  source: EntityType;
  target: EntityType;
  relationship: RelationshipType;
  /** If true, deletion of target is blocked when inbound links exist */
  blockTargetDeletion: boolean;
  /** Human-readable description for audit/reporting */
  description: string;
}

/**
 * Canonical set of required cross-module links.
 * These represent structural GRC relationships that should be
 * enforced or at minimum warned about when broken.
 */
export const REQUIRED_ENTITY_LINKS: RequiredEntityLink[] = [
  {
    source: 'risk',
    target: 'control',
    relationship: 'mitigates',
    blockTargetDeletion: true,
    description: 'Risk must be mitigated by at least one control',
  },
  {
    source: 'control',
    target: 'evidence',
    relationship: 'implements',
    blockTargetDeletion: false,
    description: 'Control implementation should be backed by evidence',
  },
  {
    source: 'finding',
    target: 'remediation',
    relationship: 'related_to',
    blockTargetDeletion: true,
    description: 'Audit finding must be linked to a remediation action',
  },
  {
    source: 'policy',
    target: 'control',
    relationship: 'governs',
    blockTargetDeletion: false,
    description: 'Policy should govern at least one control',
  },
  {
    source: 'framework',
    target: 'control',
    relationship: 'maps_to',
    blockTargetDeletion: false,
    description: 'Framework requirements should map to controls',
  },
  {
    source: 'vendor',
    target: 'risk',
    relationship: 'related_to',
    blockTargetDeletion: false,
    description: 'Vendor should have associated risk assessment',
  },
  {
    source: 'incident',
    target: 'risk',
    relationship: 'related_to',
    blockTargetDeletion: false,
    description: 'Incident should be linked to related risks',
  },
];

/**
 * Map of entity types that block deletion when they have critical inbound links.
 * Derived from REQUIRED_ENTITY_LINKS for fast lookup.
 */
export const DELETION_BLOCKED_TARGETS = new Set<EntityType>(
  REQUIRED_ENTITY_LINKS
    .filter((l) => l.blockTargetDeletion)
    .map((l) => l.target),
);

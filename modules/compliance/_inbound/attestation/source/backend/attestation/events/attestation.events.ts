import type { ModuleEventContract } from '@dos/types';

export const ATTESTATION_PUBLISHED_EVENTS = [
  'attestation.campaign_created',
  'attestation.campaign_activated',
  'attestation.campaign_closed',
  'attestation.record_submitted',
  'attestation.record_reviewed',
  'attestation.record_approved',
  'attestation.record_rejected',
] as const;

export const ATTESTATION_EVENT_CONTRACT: ModuleEventContract = {
  moduleCode: 'attestation',
  published: {
    'attestation.campaign_created': { description: 'New attestation campaign created', version: 1, payloadType: 'any' },
    'attestation.campaign_activated': { description: 'Campaign transitioned from draft to active', version: 1, payloadType: 'any' },
    'attestation.campaign_closed': { description: 'Campaign closed — all records finalized', version: 1, payloadType: 'any' },
    'attestation.record_submitted': { description: 'Attestation record submitted for review', version: 1, payloadType: 'any' },
    'attestation.record_reviewed': { description: 'Attestation record review completed', version: 1, payloadType: 'any' },
    'attestation.record_approved': { description: 'Attestation record approved', version: 1, payloadType: 'any' },
    'attestation.record_rejected': { description: 'Attestation record rejected', version: 1, payloadType: 'any' },
  },
  consumed: {
    'compliance.control_updated': { source: 'compliance', handler: 'handleControlUpdated', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
    'evidence.collected': { source: 'evidence', handler: 'handleEvidenceCollected', idempotent: true, retryPolicy: 'exponential', deadLetterEnabled: true },
  },
};

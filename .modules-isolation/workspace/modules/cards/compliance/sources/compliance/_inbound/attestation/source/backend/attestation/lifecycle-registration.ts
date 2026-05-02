import { registerLifecycleDefinition } from '@dos/module-sdk';

/**
 * Attestation Module — Lifecycle State Machines
 *
 * Two aggregate roots with enforced state transitions:
 * 1. attestation_campaigns: draft → active → closed
 * 2. attestation_records: pending → under_review → approved | rejected
 */

// ── Campaign Lifecycle ──────────────────────────────────────────
const CAMPAIGN_STATES = ['draft', 'active', 'closed'] as string[];

const CAMPAIGN_TRANSITIONS: Record<string, readonly string[]> = {
  draft: ['active'],
  active: ['closed'],
  closed: [],
};

registerLifecycleDefinition({ moduleCode: 'attestation', entityType: 'attestation_campaigns', states: CAMPAIGN_STATES as any[], transitions: CAMPAIGN_TRANSITIONS as any, ...{
  initialState: 'draft',
  terminalStates: ['closed'],
  transitionPermissions: {
    'draft->active': 'attestation.campaign.manage',
    'active->closed': 'attestation.campaign.manage',
  },
  transitionApprovals: {
    'draft->active': { required: false },
    'active->closed': { required: true, workflowTemplate: 'attestation_campaign_approval' },
  },
} });

// ── Record Lifecycle ────────────────────────────────────────────
const RECORD_STATES = ['pending', 'under_review', 'approved', 'rejected'] as string[];

const RECORD_TRANSITIONS: Record<string, readonly string[]> = {
  pending: ['under_review'],
  under_review: ['approved', 'rejected'],
  approved: [],
  rejected: ['pending'],
};

registerLifecycleDefinition({ moduleCode: 'attestation', entityType: 'attestation_records', states: RECORD_STATES as any[], transitions: RECORD_TRANSITIONS as any, ...{
  initialState: 'pending',
  terminalStates: ['approved'],
  transitionPermissions: {
    'pending->under_review': 'attestation.record.manage',
    'under_review->approved': 'attestation.record.review',
    'under_review->rejected': 'attestation.record.review',
    'rejected->pending': 'attestation.record.manage',
  },
  transitionApprovals: {
    'under_review->approved': { required: true, sodEnforced: true },
  },
} });

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const module_sdk_1 = require("@dos/module-sdk");
/**
 * Attestation Module — Lifecycle State Machines
 *
 * Two aggregate roots with enforced state transitions:
 * 1. attestation_campaigns: draft → active → closed
 * 2. attestation_records: pending → under_review → approved | rejected
 */
// ── Campaign Lifecycle ──────────────────────────────────────────
const CAMPAIGN_STATES = ['draft', 'active', 'closed'];
const CAMPAIGN_TRANSITIONS = {
    draft: ['active'],
    active: ['closed'],
    closed: [],
};
(0, module_sdk_1.registerLifecycleDefinition)({ moduleCode: 'attestation', entityType: 'attestation_campaigns', states: CAMPAIGN_STATES, transitions: CAMPAIGN_TRANSITIONS, ...{
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
const RECORD_STATES = ['pending', 'under_review', 'approved', 'rejected'];
const RECORD_TRANSITIONS = {
    pending: ['under_review'],
    under_review: ['approved', 'rejected'],
    approved: [],
    rejected: ['pending'],
};
(0, module_sdk_1.registerLifecycleDefinition)({ moduleCode: 'attestation', entityType: 'attestation_records', states: RECORD_STATES, transitions: RECORD_TRANSITIONS, ...{
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
//# sourceMappingURL=lifecycle-registration.js.map
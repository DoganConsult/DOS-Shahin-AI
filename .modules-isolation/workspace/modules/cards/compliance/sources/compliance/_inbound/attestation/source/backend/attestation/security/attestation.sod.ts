import type { SoDRule } from '@dos/types';

/**
 * Attestation SoD Rules
 * An attestor cannot review their own submission.
 * A campaign creator cannot close their own campaign without secondary approval.
 */
export const ATTESTATION_SOD_RULES: SoDRule[] = [
  {
    ruleCode: 'attestation.sod.attestor_reviewer',
    descriptionEn: 'Attestor cannot review their own submission',
    descriptionAr: 'لا يمكن للمصدّق مراجعة تقديمه الخاص',
    conflictingActions: ['attestation.record.submit', 'attestation.record.review'],
    severity: 'high',
    enforcement: 'block',
    temporaryWaiverAllowed: false, conflictingRoles: [], conflictingTransitions: [], waiverMaxDays: 30, compensatingControls: [], overrideAuthority: [], auditObligations: [],
  },
  {
    ruleCode: 'attestation.sod.campaign_creator_closer',
    descriptionEn: 'Campaign creator cannot close their own campaign without approval',
    descriptionAr: 'لا يمكن لمنشئ الحملة إغلاقها بدون موافقة',
    conflictingActions: ['attestation.campaign.create', 'attestation.campaign.close'],
    severity: 'medium',
    enforcement: 'warn',
    temporaryWaiverAllowed: true, conflictingRoles: [], conflictingTransitions: [], waiverMaxDays: 30, compensatingControls: [], overrideAuthority: [], auditObligations: [],
  },
];

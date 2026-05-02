import type { SoDRule } from '@dos/types';

export const GRC_QUERY_SOD_RULES: SoDRule[] = [
  {
    ruleCode: 'SOD-GRC-01',
    descriptionEn: 'Creator cannot approve their own changes',
    descriptionAr: 'لا يمكن للمنشئ الموافقة على تغييراته الخاصة',
    conflictingActions: ['grc-query.draft.write', 'grc-query.draft.approve'],
    conflictingRoles: [],
    conflictingTransitions: [],
    severity: 'high',
    enforcement: 'block',
    temporaryWaiverAllowed: false,
    waiverMaxDays: 30,
    compensatingControls: [],
    overrideAuthority: ['sysadmin'],
    auditObligations: ['log_attempt']
  }
];

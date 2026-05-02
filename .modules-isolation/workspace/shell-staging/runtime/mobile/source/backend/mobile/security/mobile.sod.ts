import type { SoDRule } from '@dos/types';

export const MOBILE_SOD_RULES: SoDRule[] = [
  {
    ruleCode: 'SOD-MOB-01',
    descriptionEn: 'Creator cannot approve their own changes',
    descriptionAr: 'لا يمكن للمنشئ الموافقة على تغييراته الخاصة',
    conflictingActions: ['mobile.draft.write', 'mobile.draft.approve'],
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

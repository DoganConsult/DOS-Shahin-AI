import type { SoDRule } from '@dos/types';

export const BENCHMARKS_SOD_RULES: SoDRule[] = [
  {
    ruleCode: 'SOD-BEN-01',
    descriptionEn: 'Creator cannot approve their own changes',
    descriptionAr: 'لا يمكن للمنشئ الموافقة على تغييراته الخاصة',
    conflictingActions: ['benchmarks.draft.write', 'benchmarks.draft.approve'],
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

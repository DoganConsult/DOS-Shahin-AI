
import type { SoDRule } from '@dos/types';
export const CONFIG_CENTER_SOD_RULES: SoDRule[] = [
  {
    ruleCode: 'SOD-CFG-01',
    descriptionEn: 'Configuration creator cannot approve their own changes',
    descriptionAr: 'لا يمكن لمنشئ التكوين الموافقة على تغييراته الخاصة',
    conflictingActions: ['config-center.draft.write', 'config-center.draft.approve'],
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
    
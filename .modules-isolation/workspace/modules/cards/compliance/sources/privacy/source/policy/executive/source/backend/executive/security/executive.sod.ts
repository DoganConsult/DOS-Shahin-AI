import type { SoDRule } from '@dos/types';

/**
 * Executive SoD Rules
 * Brief author cannot approve their own brief.
 * Board member who sets risk appetite cannot approve their own brief.
 */
export const EXECUTIVE_SOD_RULES: SoDRule[] = [
  {
    ruleCode: 'executive.sod.brief_author_approver',
    descriptionEn: 'Brief author cannot approve their own briefing',
    descriptionAr: 'لا يمكن لكاتب التقرير الموافقة على تقريره الخاص',
    conflictingActions: ['executive.brief.create', 'executive.brief.approve'],
    severity: 'high',
    enforcement: 'block',
    temporaryWaiverAllowed: false, conflictingRoles: [], conflictingTransitions: [], waiverMaxDays: 30, compensatingControls: [], overrideAuthority: [], auditObligations: [],
  },
  {
    ruleCode: 'executive.sod.appetite_setter_reviewer',
    descriptionEn: 'Risk appetite setter cannot self-review appetite changes',
    descriptionAr: 'لا يمكن لمحدد حد المخاطر مراجعة تغييراته بنفسه',
    conflictingActions: ['executive.appetite.manage', 'executive.appetite.approve'],
    severity: 'medium',
    enforcement: 'warn',
    temporaryWaiverAllowed: true, conflictingRoles: [], conflictingTransitions: [], waiverMaxDays: 30, compensatingControls: [], overrideAuthority: [], auditObligations: [],
  },
];

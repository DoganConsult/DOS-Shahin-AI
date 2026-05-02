/**
 * Action Module — Separation of Duties Rules
 * Prevents conflict-of-interest violations within the action lifecycle.
 * @owner Module:action
 */

import type { SoDRule } from '@dos/types';

export const ACTION_SOD_RULES: SoDRule[] = [
  {
    ruleCode: 'action.assignee_verifier',
    severity: 'critical',
    enforcement: 'hard_block',
    conflictingPermissions: ['action.item.assign', 'action.item.verify'],
    conflictingRoles: ['action.operator', 'action.approver'],
    conflictingActions: [],
    conflictingTransitions: [],
    temporaryWaiverAllowed: false,
    waiverMaxDays: 0,
    compensatingControls: [],
    overrideAuthority: ['none'],
    auditObligations: ['log'],
    descriptionEn: 'The person who assigns an action item cannot verify its completion',
    descriptionAr: 'لا يمكن للشخص الذي يعيّن عنصر إجراء أن يتحقق من إكماله',
  },
  {
    ruleCode: 'action.creator_closer',
    severity: 'high',
    enforcement: 'block',
    conflictingPermissions: ['action.item.write', 'action.item.close'],
    conflictingRoles: ['action.contributor', 'action.approver'],
    conflictingActions: [],
    conflictingTransitions: [],
    temporaryWaiverAllowed: false,
    waiverMaxDays: 0,
    compensatingControls: [],
    overrideAuthority: ['none'],
    auditObligations: ['log'],
    descriptionEn: 'The person who creates an action item cannot close it',
    descriptionAr: 'لا يمكن للشخص الذي ينشئ عنصر إجراء أن يغلقه',
  },
  {
    ruleCode: 'action.writer_deleter',
    severity: 'high',
    enforcement: 'block',
    conflictingPermissions: ['action.item.write', 'action.item.delete'],
    conflictingRoles: ['action.contributor', 'action.executive_owner'],
    conflictingActions: [],
    conflictingTransitions: [],
    temporaryWaiverAllowed: false,
    waiverMaxDays: 0,
    compensatingControls: [],
    overrideAuthority: ['none'],
    auditObligations: ['log'],
    descriptionEn: 'The person who creates an action item cannot delete it',
    descriptionAr: 'لا يمكن للشخص الذي ينشئ عنصر إجراء أن يحذفه',
  },
];

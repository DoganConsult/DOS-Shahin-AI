export const VENDOR_STATES = [
  'prospect', 'due_diligence', 'in_review', 'approved', 'onboarding',
  'active', 'under_monitoring', 'suspended', 'offboarding', 'terminated', 'archived',
] as const;

export type VendorState = (typeof VENDOR_STATES)[number];

export const VENDOR_TRANSITIONS: Record<VendorState, VendorState[]> = {
  prospect: ['due_diligence'],
  due_diligence: ['in_review', 'prospect'],
  in_review: ['approved', 'due_diligence'],
  approved: ['onboarding'],
  onboarding: ['active'],
  active: ['under_monitoring', 'suspended', 'offboarding'],
  under_monitoring: ['active', 'suspended'],
  suspended: ['active', 'offboarding'],
  offboarding: ['terminated'],
  terminated: ['archived'],
  archived: [],
};

export const VENDOR_ASSESSMENT_STATES = [
  'planned', 'in_progress', 'under_review', 'completed', 'failed', 'cancelled',
] as const;

export type VendorAssessmentState = (typeof VENDOR_ASSESSMENT_STATES)[number];

export const VENDOR_ASSESSMENT_TRANSITIONS: Record<VendorAssessmentState, VendorAssessmentState[]> = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['under_review', 'cancelled'],
  under_review: ['completed', 'failed', 'in_progress'],
  completed: [],
  failed: ['planned'],
  cancelled: [],
};

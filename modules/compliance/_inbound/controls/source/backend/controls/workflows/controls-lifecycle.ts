export const CONTROL_STATES = [
  'draft', 'in_review', 'approved', 'active', 'under_testing',
  'ineffective', 'remediation_required', 'retired', 'archived',
] as const;

export type ControlState = (typeof CONTROL_STATES)[number];

export const CONTROL_TRANSITIONS: Record<ControlState, ControlState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['under_testing', 'retired', 'archived'],
  under_testing: ['active', 'ineffective'],
  ineffective: ['remediation_required', 'active'],
  remediation_required: ['active', 'retired'],
  retired: ['archived'],
  archived: [],
};

export const CONTROL_TESTING_STATES = [
  'planned', 'in_progress', 'under_review', 'effective', 'ineffective', 'cancelled',
] as const;

export type ControlTestingState = (typeof CONTROL_TESTING_STATES)[number];

export const CONTROL_TESTING_TRANSITIONS: Record<ControlTestingState, ControlTestingState[]> = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['under_review', 'cancelled'],
  under_review: ['effective', 'ineffective'],
  effective: [],
  ineffective: [],
  cancelled: [],
};

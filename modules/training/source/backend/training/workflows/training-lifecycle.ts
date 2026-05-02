export const TRAINING_PROGRAM_STATES = [
  'draft', 'in_review', 'approved', 'active', 'suspended', 'expired', 'archived',
] as const;

export type TrainingProgramState = (typeof TRAINING_PROGRAM_STATES)[number];

export const TRAINING_PROGRAM_TRANSITIONS: Record<TrainingProgramState, TrainingProgramState[]> = {
  draft: ['in_review'],
  in_review: ['approved', 'draft'],
  approved: ['active'],
  active: ['suspended', 'expired', 'archived'],
  suspended: ['active', 'archived'],
  expired: ['active', 'archived'],
  archived: [],
};

export const TRAINING_ASSIGNMENT_STATES = [
  'assigned', 'in_progress', 'completed', 'failed', 'overdue', 'waived',
] as const;

export type TrainingAssignmentState = (typeof TRAINING_ASSIGNMENT_STATES)[number];

export const TRAINING_ASSIGNMENT_TRANSITIONS: Record<TrainingAssignmentState, TrainingAssignmentState[]> = {
  assigned: ['in_progress', 'waived'],
  in_progress: ['completed', 'failed', 'overdue'],
  overdue: ['in_progress', 'waived'],
  completed: [],
  failed: ['assigned'],
  waived: [],
};

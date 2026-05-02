import type { TrainingProgramStatus } from '../contracts/training.contracts';
export const TRAINING_STATES: readonly TrainingProgramStatus[] = ['draft', 'active', 'paused', 'completed', 'retired', 'archived'] as const;
export const TRAINING_TRANSITIONS: Record<TrainingProgramStatus, TrainingProgramStatus[]> = {
  draft: ['active', 'archived'], active: ['paused', 'completed', 'retired'], paused: ['active', 'retired'],
  completed: ['archived'], retired: ['archived'], archived: [],
};
export const TRAINING_TERMINAL_STATES: readonly TrainingProgramStatus[] = ['archived'];
export function isValidTrainingTransition(from: TrainingProgramStatus, to: TrainingProgramStatus): boolean { return TRAINING_TRANSITIONS[from]?.includes(to) ?? false; }
export function isTrainingTerminal(state: TrainingProgramStatus): boolean { return TRAINING_TERMINAL_STATES.includes(state); }

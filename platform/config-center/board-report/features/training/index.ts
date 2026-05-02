export { TrainingDashboardComponent } from './dashboards/training-dashboard.component';
export { TrainingDiagnosticsComponent } from './diagnostics/training-diagnostics.component';
export { TrainingAdminComponent } from './admin/training-admin.component';
export { TrainingWidgetComponent } from './widgets/training-widget.component';
export { TrainingState } from './state/training.state';
export { TRAINING_STATES, TRAINING_TRANSITIONS, TRAINING_TERMINAL_STATES, isValidTrainingTransition, isTrainingTerminal } from './workflows/training-lifecycle';
export type { TrainingProgramContract, TrainingCampaignContract, TrainingAssignmentContract, TrainingDiagnosticsContract, TrainingDashboardContract, TrainingProgramStatus, CampaignStatus, AssignmentStatus } from './contracts/training.contracts';

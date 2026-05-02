export const WORKFLOW_MODES = ['standard', 'express', 'enterprise'] as const;
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];

export interface WorkflowModeConfig {
  mode: WorkflowMode;
  label: string;
  description: string;
  automationLevel: number;
}

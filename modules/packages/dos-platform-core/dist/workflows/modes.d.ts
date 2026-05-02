export declare const WORKFLOW_MODES: readonly ["standard", "express", "enterprise"];
export type WorkflowMode = (typeof WORKFLOW_MODES)[number];
export interface WorkflowModeConfig {
    mode: WorkflowMode;
    label: string;
    description: string;
    automationLevel: number;
}

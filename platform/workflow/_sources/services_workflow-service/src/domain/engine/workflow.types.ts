export type WorkflowStatus = 'draft' | 'active' | 'paused' | 'completed' | 'cancelled' | 'failed' | 'archived';
export const WORKFLOW_STATUSES: readonly WorkflowStatus[] = ['draft', 'active', 'paused', 'completed', 'cancelled', 'failed', 'archived'] as const;

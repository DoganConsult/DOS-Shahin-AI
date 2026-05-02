import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface WorkflowItemDto {
  id: string;
  name: string;
  status: 'draft' | 'published' | 'archived';
  triggerType: string;
  lastRun: string | null;
  runCount: number;
}

export interface WorkflowExecutionDto {
  executionId: string;
  workflowId: string;
  workflowName: string;
  status: string;
  startedAt: string;
  completedAt: string | null;
}

export const WorkflowActions = createActionGroup({
  source: 'Workflow',
  events: {
    'Load Definitions': emptyProps(),
    'Definitions Loaded': props<{ definitions: WorkflowItemDto[] }>(),
    'Definitions Load Failed': props<{ error: string }>(),

    'Load Executions': emptyProps(),
    'Executions Loaded': props<{ executions: WorkflowExecutionDto[] }>(),
    'Executions Load Failed': props<{ error: string }>(),

    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

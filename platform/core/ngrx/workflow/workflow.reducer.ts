import { createFeature, createReducer, on } from '@ngrx/store';
import { WorkflowActions, WorkflowItemDto, WorkflowExecutionDto } from './workflow.actions';

export interface WorkflowState {
  definitions: WorkflowItemDto[];
  recentExecutions: WorkflowExecutionDto[];
  loading: boolean;
  error: string | null;
}

const initialState: WorkflowState = {
  definitions: [],
  recentExecutions: [],
  loading: false,
  error: null,
};

export const workflowFeature = createFeature({
  name: 'workflow',
  reducer: createReducer(
    initialState,
    on(WorkflowActions.loadDefinitions, WorkflowActions.loadExecutions, WorkflowActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),

    on(WorkflowActions.definitionsLoaded, (state, { definitions }) => ({ ...state, definitions, loading: false })),
    on(WorkflowActions.definitionsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(WorkflowActions.executionsLoaded, (state, { executions }) => ({ ...state, recentExecutions: executions, loading: false })),
    on(WorkflowActions.executionsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(WorkflowActions.reset, () => initialState),
  ),
});

export const {
  selectDefinitions: selectWorkflowDefinitions,
  selectRecentExecutions: selectWorkflowRecentExecutions,
  selectLoading: selectWorkflowLoading,
  selectError: selectWorkflowError,
} = workflowFeature;

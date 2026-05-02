import { createReducer, on, createFeature } from '@ngrx/store';
import { RemediationActions } from './remediation.actions';

export interface RemediationState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: RemediationState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const remediationFeature = createFeature({
  name: 'remediation',
  reducer: createReducer(
    initialState,
    on(RemediationActions.loadDashboard, RemediationActions.loadTasks, RemediationActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(RemediationActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(RemediationActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(RemediationActions.tasksLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(RemediationActions.tasksLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(RemediationActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectRemediationDashboard,
  selectItems: selectRemediationItems,
  selectTotal: selectRemediationTotal,
  selectLoading: selectRemediationLoading,
  selectError: selectRemediationError,
} = remediationFeature;

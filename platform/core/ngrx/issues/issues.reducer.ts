import { createReducer, on, createFeature } from '@ngrx/store';
import { IssuesActions } from './issues.actions';

export interface IssuesState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: IssuesState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const issuesFeature = createFeature({
  name: 'issues',
  reducer: createReducer(
    initialState,
    on(IssuesActions.loadDashboard, IssuesActions.loadItems, IssuesActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(IssuesActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(IssuesActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(IssuesActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(IssuesActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(IssuesActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectIssuesDashboard,
  selectItems: selectIssuesItems,
  selectTotal: selectIssuesTotal,
  selectLoading: selectIssuesLoading,
  selectError: selectIssuesError,
} = issuesFeature;

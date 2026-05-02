import { createReducer, on, createFeature } from '@ngrx/store';
import { FoundationActions } from './foundation.actions';

export interface FoundationState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: FoundationState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const foundationFeature = createFeature({
  name: 'foundation',
  reducer: createReducer(
    initialState,
    on(FoundationActions.loadDashboard, FoundationActions.loadConfigs, FoundationActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(FoundationActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(FoundationActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(FoundationActions.configsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(FoundationActions.configsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(FoundationActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectFoundationDashboard,
  selectItems: selectFoundationItems,
  selectTotal: selectFoundationTotal,
  selectLoading: selectFoundationLoading,
  selectError: selectFoundationError,
} = foundationFeature;

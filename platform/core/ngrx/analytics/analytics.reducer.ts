import { createReducer, on, createFeature } from '@ngrx/store';
import { AnalyticsActions } from './analytics.actions';

export interface AnalyticsState {
  dashboard: any | null;
  loading: boolean;
  error: string | null;
}

const initialState: AnalyticsState = {
  dashboard: null,
  loading: false,
  error: null,
};

export const analyticsFeature = createFeature({
  name: 'analytics',
  reducer: createReducer(
    initialState,
    on(AnalyticsActions.loadDashboard, AnalyticsActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(AnalyticsActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(AnalyticsActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(AnalyticsActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectAnalyticsDashboard,
  selectLoading: selectAnalyticsLoading,
  selectError: selectAnalyticsError,
} = analyticsFeature;

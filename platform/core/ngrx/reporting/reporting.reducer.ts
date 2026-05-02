import { createReducer, on, createFeature } from '@ngrx/store';
import { ReportingActions } from './reporting.actions';

export interface ReportingState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: ReportingState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const reportingFeature = createFeature({
  name: 'reporting',
  reducer: createReducer(
    initialState,
    on(ReportingActions.loadDashboard, ReportingActions.loadReports, ReportingActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(ReportingActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(ReportingActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(ReportingActions.reportsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(ReportingActions.reportsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(ReportingActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectReportingDashboard,
  selectItems: selectReportingItems,
  selectTotal: selectReportingTotal,
  selectLoading: selectReportingLoading,
  selectError: selectReportingError,
} = reportingFeature;

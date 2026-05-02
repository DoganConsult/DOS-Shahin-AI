import { createReducer, on, createFeature } from '@ngrx/store';
import { PrivacyActions } from './privacy.actions';

export interface PrivacyState {
  dashboard: any | null;
  dsrs: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: PrivacyState = {
  dashboard: null,
  dsrs: [],
  total: 0,
  loading: false,
  error: null,
};

export const privacyFeature = createFeature({
  name: 'privacy',
  reducer: createReducer(
    initialState,
    on(PrivacyActions.loadDashboard, PrivacyActions.loadDsrs, PrivacyActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(PrivacyActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(PrivacyActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(PrivacyActions.dsrsLoaded, (state, { dsrs, total }) => ({ ...state, dsrs, total, loading: false })),
    on(PrivacyActions.dsrsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(PrivacyActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectPrivacyDashboard,
  selectDsrs: selectPrivacyDsrs,
  selectTotal: selectPrivacyTotal,
  selectLoading: selectPrivacyLoading,
  selectError: selectPrivacyError,
} = privacyFeature;

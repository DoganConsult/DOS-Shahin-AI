import { createReducer, on, createFeature } from '@ngrx/store';
import type { FoundationLookups } from '../services/foundation-api.service';
import { FoundationActions } from './foundation.actions';

/** Mirror of platform/core/ngrx/foundation — keep aligned or delete duplicate. */
export interface FoundationState {
  dashboard: any | null;
  lookups: FoundationLookups | null;
  loading: boolean;
  error: string | null;
}

const initialState: FoundationState = {
  dashboard: null,
  lookups: null,
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
    on(FoundationActions.configsLoaded, (state, { lookups }) => ({ ...state, lookups, loading: false })),
    on(FoundationActions.configsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(FoundationActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectFoundationDashboard,
  selectLookups: selectFoundationLookups,
  selectLoading: selectFoundationLoading,
  selectError: selectFoundationError,
} = foundationFeature;

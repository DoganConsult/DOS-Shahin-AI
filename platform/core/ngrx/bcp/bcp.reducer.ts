import { createReducer, on, createFeature } from '@ngrx/store';
import { BcpActions } from './bcp.actions';

export interface BcpState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: BcpState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const bcpFeature = createFeature({
  name: 'bcp',
  reducer: createReducer(
    initialState,
    on(BcpActions.loadDashboard, BcpActions.loadPlans, BcpActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(BcpActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(BcpActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(BcpActions.plansLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(BcpActions.plansLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(BcpActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectBcpDashboard,
  selectItems: selectBcpItems,
  selectTotal: selectBcpTotal,
  selectLoading: selectBcpLoading,
  selectError: selectBcpError,
} = bcpFeature;

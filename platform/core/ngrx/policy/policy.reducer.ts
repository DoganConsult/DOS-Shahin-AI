import { createReducer, on, createFeature } from '@ngrx/store';
import { PolicyActions } from './policy.actions';

export interface PolicyState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: PolicyState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const policyFeature = createFeature({
  name: 'policy',
  reducer: createReducer(
    initialState,
    on(PolicyActions.loadDashboard, PolicyActions.loadItems, PolicyActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(PolicyActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(PolicyActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(PolicyActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(PolicyActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(PolicyActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectPolicyDashboard,
  selectItems: selectPolicyItems,
  selectTotal: selectPolicyTotal,
  selectLoading: selectPolicyLoading,
  selectError: selectPolicyError,
} = policyFeature;

import { createReducer, on, createFeature } from '@ngrx/store';
import { IntegrationsActions } from './integrations.actions';

export interface IntegrationsState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: IntegrationsState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const integrationsFeature = createFeature({
  name: 'integrations',
  reducer: createReducer(
    initialState,
    on(IntegrationsActions.loadDashboard, IntegrationsActions.loadItems, IntegrationsActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(IntegrationsActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(IntegrationsActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(IntegrationsActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(IntegrationsActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(IntegrationsActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectIntegrationsDashboard,
  selectItems: selectIntegrationsItems,
  selectTotal: selectIntegrationsTotal,
  selectLoading: selectIntegrationsLoading,
  selectError: selectIntegrationsError,
} = integrationsFeature;

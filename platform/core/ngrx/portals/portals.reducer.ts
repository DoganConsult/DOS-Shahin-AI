import { createReducer, on, createFeature } from '@ngrx/store';
import { PortalsActions } from './portals.actions';

export interface PortalsState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: PortalsState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const portalsFeature = createFeature({
  name: 'portals',
  reducer: createReducer(
    initialState,
    on(PortalsActions.loadDashboard, PortalsActions.loadItems, PortalsActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(PortalsActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(PortalsActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(PortalsActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(PortalsActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(PortalsActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectPortalsDashboard,
  selectItems: selectPortalsItems,
  selectTotal: selectPortalsTotal,
  selectLoading: selectPortalsLoading,
  selectError: selectPortalsError,
} = portalsFeature;

import { createReducer, on, createFeature } from '@ngrx/store';
import { AdminActions } from './admin.actions';

export interface AdminState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: AdminState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const adminFeature = createFeature({
  name: 'admin',
  reducer: createReducer(
    initialState,
    on(AdminActions.loadDashboard, AdminActions.loadTenants, AdminActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(AdminActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(AdminActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(AdminActions.tenantsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(AdminActions.tenantsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(AdminActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectAdminDashboard,
  selectItems: selectAdminItems,
  selectTotal: selectAdminTotal,
  selectLoading: selectAdminLoading,
  selectError: selectAdminError,
} = adminFeature;

import { createReducer, on, createFeature } from '@ngrx/store';
import { QiyasActions } from './qiyas.actions';

export interface QiyasState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: QiyasState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const qiyasFeature = createFeature({
  name: 'qiyas',
  reducer: createReducer(
    initialState,
    on(QiyasActions.loadDashboard, QiyasActions.loadItems, QiyasActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(QiyasActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(QiyasActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(QiyasActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(QiyasActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(QiyasActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectQiyasDashboard,
  selectItems: selectQiyasItems,
  selectTotal: selectQiyasTotal,
  selectLoading: selectQiyasLoading,
  selectError: selectQiyasError,
} = qiyasFeature;

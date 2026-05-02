import { createReducer, on, createFeature } from '@ngrx/store';
import { ExceptionActions } from './exception.actions';

export interface ExceptionState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: ExceptionState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const exceptionFeature = createFeature({
  name: 'exception',
  reducer: createReducer(
    initialState,
    on(ExceptionActions.loadDashboard, ExceptionActions.loadItems, ExceptionActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(ExceptionActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(ExceptionActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(ExceptionActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(ExceptionActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(ExceptionActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectExceptionDashboard,
  selectItems: selectExceptionItems,
  selectTotal: selectExceptionTotal,
  selectLoading: selectExceptionLoading,
  selectError: selectExceptionError,
} = exceptionFeature;

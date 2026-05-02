import { createReducer, on, createFeature } from '@ngrx/store';
import { RecordsActions } from './records.actions';

export interface RecordsState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: RecordsState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const recordsFeature = createFeature({
  name: 'records',
  reducer: createReducer(
    initialState,
    on(RecordsActions.loadDashboard, RecordsActions.loadItems, RecordsActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(RecordsActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(RecordsActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(RecordsActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(RecordsActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(RecordsActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectRecordsDashboard,
  selectItems: selectRecordsItems,
  selectTotal: selectRecordsTotal,
  selectLoading: selectRecordsLoading,
  selectError: selectRecordsError,
} = recordsFeature;

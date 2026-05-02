import { createReducer, on, createFeature } from '@ngrx/store';
import { ActionActions } from './action.actions';

export interface ActionState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: ActionState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const actionFeature = createFeature({
  name: 'action',
  reducer: createReducer(
    initialState,
    on(ActionActions.loadDashboard, ActionActions.loadItems, ActionActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(ActionActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(ActionActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(ActionActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(ActionActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(ActionActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectActionDashboard,
  selectItems: selectActionItems,
  selectTotal: selectActionTotal,
  selectLoading: selectActionLoading,
  selectError: selectActionError,
} = actionFeature;

import { createReducer, on, createFeature } from '@ngrx/store';
import { AssetActions } from './asset.actions';

export interface AssetState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: AssetState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const assetFeature = createFeature({
  name: 'asset',
  reducer: createReducer(
    initialState,
    on(AssetActions.loadDashboard, AssetActions.loadItems, AssetActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(AssetActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(AssetActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(AssetActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(AssetActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(AssetActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectAssetDashboard,
  selectItems: selectAssetItems,
  selectTotal: selectAssetTotal,
  selectLoading: selectAssetLoading,
  selectError: selectAssetError,
} = assetFeature;

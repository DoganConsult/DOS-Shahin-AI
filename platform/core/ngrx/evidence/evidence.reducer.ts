import { createReducer, on, createFeature } from '@ngrx/store';
import { EvidenceActions } from './evidence.actions';

export interface EvidenceState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: EvidenceState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const evidenceFeature = createFeature({
  name: 'evidence',
  reducer: createReducer(
    initialState,
    on(EvidenceActions.loadDashboard, EvidenceActions.loadItems, EvidenceActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(EvidenceActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(EvidenceActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(EvidenceActions.itemsLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(EvidenceActions.itemsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(EvidenceActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectEvidenceDashboard,
  selectItems: selectEvidenceItems,
  selectTotal: selectEvidenceTotal,
  selectLoading: selectEvidenceLoading,
  selectError: selectEvidenceError,
} = evidenceFeature;

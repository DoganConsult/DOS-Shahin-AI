import { createReducer, on, createFeature } from '@ngrx/store';
import { RiskActions } from './risk.actions';
import type { RiskOverviewDto, RiskRegisterItemDto, RiskHeatmapDto, KRIItemDto } from './risk.actions';

export interface RiskState {
  overview: RiskOverviewDto | null;
  register: RiskRegisterItemDto[];
  registerCount: number;
  heatmap: RiskHeatmapDto | null;
  kris: KRIItemDto[];
  loading: boolean;
  error: string | null;
}

const initialState: RiskState = {
  overview: null,
  register: [],
  registerCount: 0,
  heatmap: null,
  kris: [],
  loading: false,
  error: null,
};

export const riskFeature = createFeature({
  name: 'risk',
  reducer: createReducer(
    initialState,
    on(RiskActions.loadOverview, RiskActions.loadRegister, RiskActions.loadHeatmap, RiskActions.loadKRIs, RiskActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),

    on(RiskActions.overviewLoaded, (state, { overview }) => ({ ...state, overview, loading: false })),
    on(RiskActions.overviewLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(RiskActions.registerLoaded, (state, { risks, count }) => ({ ...state, register: risks, registerCount: count, loading: false })),
    on(RiskActions.registerLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(RiskActions.heatmapLoaded, (state, { heatmap }) => ({ ...state, heatmap, loading: false })),
    on(RiskActions.heatmapLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(RiskActions.kRIsLoaded, (state, { kris }) => ({ ...state, kris, loading: false })),
    on(RiskActions.kRIsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(RiskActions.riskUpdated, (state, { risk }) => ({
      ...state,
      register: state.register.map(r => r.riskId === risk.riskId ? risk : r),
      loading: false,
    })),
    on(RiskActions.riskUpdateFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(RiskActions.reset, () => initialState),
  ),
});

export const {
  selectOverview: selectRiskOverview,
  selectRegister: selectRiskRegister,
  selectRegisterCount: selectRiskRegisterCount,
  selectHeatmap: selectRiskHeatmap,
  selectKris: selectRiskKris,
  selectLoading: selectRiskLoading,
  selectError: selectRiskError,
} = riskFeature;

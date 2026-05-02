import { createReducer, on, createFeature } from '@ngrx/store';
import { AiActions } from './ai.actions';

export interface AiState {
  dashboard: any | null;
  agents: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: AiState = {
  dashboard: null,
  agents: [],
  total: 0,
  loading: false,
  error: null,
};

export const aiFeature = createFeature({
  name: 'ai',
  reducer: createReducer(
    initialState,
    on(AiActions.loadDashboard, AiActions.loadAgents, AiActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(AiActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(AiActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(AiActions.agentsLoaded, (state, { agents, total }) => ({ ...state, agents, total, loading: false })),
    on(AiActions.agentsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(AiActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectAiDashboard,
  selectAgents: selectAiAgents,
  selectTotal: selectAiTotal,
  selectLoading: selectAiLoading,
  selectError: selectAiError,
} = aiFeature;

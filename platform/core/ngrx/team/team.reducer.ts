import { createReducer, on, createFeature } from '@ngrx/store';
import { TeamActions } from './team.actions';

export interface TeamState {
  dashboard: any | null;
  items: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: TeamState = {
  dashboard: null,
  items: [],
  total: 0,
  loading: false,
  error: null,
};

export const teamFeature = createFeature({
  name: 'team',
  reducer: createReducer(
    initialState,
    on(TeamActions.loadDashboard, TeamActions.loadMembers, TeamActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(TeamActions.dashboardLoaded, (state, { dashboard }) => ({ ...state, dashboard, loading: false })),
    on(TeamActions.dashboardLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(TeamActions.membersLoaded, (state, { items, total }) => ({ ...state, items, total, loading: false })),
    on(TeamActions.membersLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(TeamActions.reset, () => initialState),
  ),
});

export const {
  selectDashboard: selectTeamDashboard,
  selectItems: selectTeamItems,
  selectTotal: selectTeamTotal,
  selectLoading: selectTeamLoading,
  selectError: selectTeamError,
} = teamFeature;

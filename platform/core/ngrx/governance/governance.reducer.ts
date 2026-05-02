import { createFeature, createReducer, on } from '@ngrx/store';
import { GovernanceActions, GovernanceOverviewDto, PolicySummaryDto, CommitteeSummaryDto } from './governance.actions';

export interface GovernanceState {
  overview: GovernanceOverviewDto | null;
  policies: PolicySummaryDto[];
  committees: CommitteeSummaryDto[];
  loading: boolean;
  error: string | null;
}

const initialState: GovernanceState = {
  overview: null,
  policies: [],
  committees: [],
  loading: false,
  error: null,
};

export const governanceFeature = createFeature({
  name: 'governance',
  reducer: createReducer(
    initialState,
    on(GovernanceActions.loadOverview, GovernanceActions.loadPolicies, GovernanceActions.loadCommittees, GovernanceActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),

    on(GovernanceActions.overviewLoaded, (state, { overview }) => ({ ...state, overview, loading: false })),
    on(GovernanceActions.overviewLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(GovernanceActions.policiesLoaded, (state, { policies }) => ({ ...state, policies, loading: false })),
    on(GovernanceActions.policiesLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(GovernanceActions.committeesLoaded, (state, { committees }) => ({ ...state, committees, loading: false })),
    on(GovernanceActions.committeesLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(GovernanceActions.reset, () => initialState),
  ),
});

export const {
  selectOverview: selectGovernanceOverview,
  selectPolicies: selectGovernancePolicies,
  selectCommittees: selectGovernanceCommittees,
  selectLoading: selectGovernanceLoading,
  selectError: selectGovernanceError,
} = governanceFeature;

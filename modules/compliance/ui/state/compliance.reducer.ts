import { createReducer, on, createFeature } from '@ngrx/store';
import { ComplianceActions } from './compliance.actions';
import type { ComplianceOverviewDto, FrameworkSummaryDto, ComplianceGapDto } from './compliance.actions';

export interface ComplianceState {
  overview: ComplianceOverviewDto | null;
  frameworks: FrameworkSummaryDto[];
  gaps: ComplianceGapDto[];
  regulatoryChanges: Record<string, unknown>[];
  loading: boolean;
  error: string | null;
}

const initialState: ComplianceState = {
  overview: null,
  frameworks: [],
  gaps: [],
  regulatoryChanges: [],
  loading: false,
  error: null,
};

export const complianceFeature = createFeature({
  name: 'compliance',
  reducer: createReducer(
    initialState,
    on(ComplianceActions.loadOverview, ComplianceActions.loadFrameworks, ComplianceActions.loadGaps, ComplianceActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),

    on(ComplianceActions.overviewLoaded, (state, { overview }) => ({ ...state, overview, loading: false })),
    on(ComplianceActions.overviewLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(ComplianceActions.frameworksLoaded, (state, { frameworks }) => ({ ...state, frameworks, loading: false })),
    on(ComplianceActions.frameworksLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(ComplianceActions.gapsLoaded, (state, { gaps }) => ({ ...state, gaps, loading: false })),
    on(ComplianceActions.gapsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(ComplianceActions.regulatoryChangesLoaded, (state, { changes }) => ({ ...state, regulatoryChanges: changes, loading: false })),
    on(ComplianceActions.regulatoryChangesLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(ComplianceActions.reset, () => initialState),
  ),
});

export const {
  selectOverview: selectComplianceOverview,
  selectFrameworks: selectComplianceFrameworks,
  selectGaps: selectComplianceGaps,
  selectRegulatoryChanges: selectComplianceRegulatoryChanges,
  selectLoading: selectComplianceLoading,
  selectError: selectComplianceError,
} = complianceFeature;

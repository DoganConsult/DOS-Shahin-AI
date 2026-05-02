import { createFeature, createReducer, on } from '@ngrx/store';
import { AuditActions, AuditOverviewDto, AuditPlanDto, AuditFindingDto } from './audit.actions';

export interface AuditState {
  overview: AuditOverviewDto | null;
  plans: AuditPlanDto[];
  findings: AuditFindingDto[];
  loading: boolean;
  error: string | null;
}

const initialState: AuditState = {
  overview: null,
  plans: [],
  findings: [],
  loading: false,
  error: null,
};

export const auditFeature = createFeature({
  name: 'audit',
  reducer: createReducer(
    initialState,
    on(AuditActions.loadOverview, AuditActions.loadPlans, AuditActions.loadFindings, AuditActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),

    on(AuditActions.overviewLoaded, (state, { overview }) => ({ ...state, overview, loading: false })),
    on(AuditActions.overviewLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(AuditActions.plansLoaded, (state, { plans }) => ({ ...state, plans, loading: false })),
    on(AuditActions.plansLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(AuditActions.findingsLoaded, (state, { findings }) => ({ ...state, findings, loading: false })),
    on(AuditActions.findingsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(AuditActions.reset, () => initialState),
  ),
});

export const {
  selectOverview: selectAuditOverview,
  selectPlans: selectAuditPlans,
  selectFindings: selectAuditFindings,
  selectLoading: selectAuditLoading,
  selectError: selectAuditError,
} = auditFeature;

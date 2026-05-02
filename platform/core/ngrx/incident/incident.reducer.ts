import { createFeature, createReducer, on } from '@ngrx/store';
import { IncidentActions, IncidentItemDto } from './incident.actions';

export interface IncidentState {
  incidents: IncidentItemDto[];
  nearMisses: IncidentItemDto[];
  trends: Record<string, unknown> | null;
  loading: boolean;
  error: string | null;
}

const initialState: IncidentState = {
  incidents: [],
  nearMisses: [],
  trends: null,
  loading: false,
  error: null,
};

export const incidentFeature = createFeature({
  name: 'incident',
  reducer: createReducer(
    initialState,
    on(IncidentActions.loadIncidents, IncidentActions.loadNearMisses, IncidentActions.loadTrends, IncidentActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),

    on(IncidentActions.incidentsLoaded, (state, { incidents }) => ({ ...state, incidents, loading: false })),
    on(IncidentActions.incidentsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(IncidentActions.nearMissesLoaded, (state, { nearMisses }) => ({ ...state, nearMisses, loading: false })),
    on(IncidentActions.nearMissesLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(IncidentActions.trendsLoaded, (state, { trends }) => ({ ...state, trends, loading: false })),
    on(IncidentActions.trendsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(IncidentActions.reset, () => initialState),
  ),
});

export const {
  selectIncidents: selectIncidentList,
  selectNearMisses: selectIncidentNearMisses,
  selectTrends: selectIncidentTrends,
  selectLoading: selectIncidentLoading,
  selectError: selectIncidentError,
} = incidentFeature;

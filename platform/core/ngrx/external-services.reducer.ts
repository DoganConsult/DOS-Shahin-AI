import { createReducer, on, createFeature } from '@ngrx/store';
import { ExternalServicesActions } from './external-services.actions';

export interface ExternalServicesState {
  health: Record<string, boolean>;
  cisoFrameworks: any[];
  openprojectWorkPackages: any[];
  govreadyControls: any[];
  loading: boolean;
  error: string | null;
}

const initialState: ExternalServicesState = {
  health: {},
  cisoFrameworks: [],
  openprojectWorkPackages: [],
  govreadyControls: [],
  loading: false,
  error: null,
};

export const externalServicesFeature = createFeature({
  name: 'externalServices',
  reducer: createReducer(
    initialState,
    on(ExternalServicesActions.checkHealth, (state) => ({ ...state, loading: true, error: null })),
    on(ExternalServicesActions.healthChecked, (state, { services }) => ({ ...state, health: services, loading: false })),
    on(ExternalServicesActions.healthCheckFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(ExternalServicesActions.loadCISOFrameworks, (state) => ({ ...state, loading: true, error: null })),
    on(ExternalServicesActions.cISOFrameworksLoaded, (state, { frameworks }) => ({ ...state, cisoFrameworks: frameworks, loading: false })),
    on(ExternalServicesActions.cISOFrameworksLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(ExternalServicesActions.loadOpenProjectWorkPackages, (state) => ({ ...state, loading: true, error: null })),
    on(ExternalServicesActions.openProjectWorkPackagesLoaded, (state, { workPackages }) => ({ ...state, openprojectWorkPackages: workPackages, loading: false })),
    on(ExternalServicesActions.openProjectWorkPackagesLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(ExternalServicesActions.loadGovReadyControls, (state) => ({ ...state, loading: true, error: null })),
    on(ExternalServicesActions.govReadyControlsLoaded, (state, { controls }) => ({ ...state, govreadyControls: controls, loading: false })),
    on(ExternalServicesActions.govReadyControlsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
  ),
});

export const {
  selectExternalServicesState,
  selectHealth,
  selectCisoFrameworks,
  selectOpenprojectWorkPackages,
  selectGovreadyControls,
  selectLoading,
  selectError,
} = externalServicesFeature;

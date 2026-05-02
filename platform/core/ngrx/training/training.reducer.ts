import { createReducer, on, createFeature } from '@ngrx/store';
import { TrainingActions } from './training.actions';

export interface TrainingState {
  snapshot: any | null;
  programs: any[];
  total: number;
  loading: boolean;
  error: string | null;
}

const initialState: TrainingState = {
  snapshot: null,
  programs: [],
  total: 0,
  loading: false,
  error: null,
};

export const trainingFeature = createFeature({
  name: 'training',
  reducer: createReducer(
    initialState,
    on(TrainingActions.loadSnapshot, TrainingActions.loadPrograms, TrainingActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),
    on(TrainingActions.snapshotLoaded, (state, { snapshot }) => ({ ...state, snapshot, loading: false })),
    on(TrainingActions.snapshotLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(TrainingActions.programsLoaded, (state, { programs, total }) => ({ ...state, programs, total, loading: false })),
    on(TrainingActions.programsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),
    on(TrainingActions.reset, () => initialState),
  ),
});

export const {
  selectSnapshot: selectTrainingSnapshot,
  selectPrograms: selectTrainingPrograms,
  selectTotal: selectTrainingTotal,
  selectLoading: selectTrainingLoading,
  selectError: selectTrainingError,
} = trainingFeature;

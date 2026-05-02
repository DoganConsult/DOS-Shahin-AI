import { createFeature, createReducer, on } from '@ngrx/store';
import { AiGovernanceActions, AiAssetDto } from './ai-governance.actions';

export interface AiGovernanceState {
  assets: AiAssetDto[];
  modelsRequiringAssessment: AiAssetDto[];
  loading: boolean;
  error: string | null;
}

const initialState: AiGovernanceState = {
  assets: [],
  modelsRequiringAssessment: [],
  loading: false,
  error: null,
};

export const aiGovernanceFeature = createFeature({
  name: 'aiGovernance',
  reducer: createReducer(
    initialState,
    on(AiGovernanceActions.loadAssets, AiGovernanceActions.loadModelsRequiringAssessment, AiGovernanceActions.loadAll,
      (state) => ({ ...state, loading: true, error: null })),

    on(AiGovernanceActions.assetsLoaded, (state, { assets }) => ({ ...state, assets, loading: false })),
    on(AiGovernanceActions.assetsLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(AiGovernanceActions.modelsRequiringAssessmentLoaded, (state, { models }) => ({ ...state, modelsRequiringAssessment: models, loading: false })),
    on(AiGovernanceActions.modelsRequiringAssessmentLoadFailed, (state, { error }) => ({ ...state, error, loading: false })),

    on(AiGovernanceActions.reset, () => initialState),
  ),
});

export const {
  selectAssets: selectAiGovernanceAssets,
  selectModelsRequiringAssessment: selectAiGovernanceModelsRequiringAssessment,
  selectLoading: selectAiGovernanceLoading,
  selectError: selectAiGovernanceError,
} = aiGovernanceFeature;

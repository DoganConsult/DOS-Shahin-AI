import { createActionGroup, emptyProps, props } from '@ngrx/store';

export interface AiAssetDto {
  id: string;
  assetType: string;
  assetKey: string;
  name: string;
  status: string;
  riskLevel: string;
}

export interface AiGovernanceOverviewDto {
  totalAssets: number;
  highRiskModels: number;
  activeAgents: number;
  pendingAssessments: number;
  complianceScore: number;
}

export const AiGovernanceActions = createActionGroup({
  source: 'AI Governance',
  events: {
    'Load Assets': emptyProps(),
    'Assets Loaded': props<{ assets: AiAssetDto[] }>(),
    'Assets Load Failed': props<{ error: string }>(),

    'Load Models Requiring Assessment': emptyProps(),
    'Models Requiring Assessment Loaded': props<{ models: AiAssetDto[] }>(),
    'Models Requiring Assessment Load Failed': props<{ error: string }>(),

    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

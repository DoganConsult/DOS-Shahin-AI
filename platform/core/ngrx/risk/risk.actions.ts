import { createActionGroup, emptyProps, props } from '@ngrx/store';

type RiskOverviewDto = any;
type RiskRegisterItemDto = any;
type RiskHeatmapDto = any;
type KRIItemDto = any;



export { RiskOverviewDto, RiskRegisterItemDto, RiskHeatmapDto, KRIItemDto };

export const RiskActions = createActionGroup({
  source: 'Risk',
  events: {
    'Load Overview': emptyProps(),
    'Overview Loaded': props<{ overview: RiskOverviewDto }>(),
    'Overview Load Failed': props<{ error: string }>(),

    'Load Register': props<{ params?: Record<string, string> }>(),
    'Register Loaded': props<{ risks: RiskRegisterItemDto[]; count: number }>(),
    'Register Load Failed': props<{ error: string }>(),

    'Load Heatmap': props<{ mode: 'inherent' | 'residual' }>(),
    'Heatmap Loaded': props<{ heatmap: RiskHeatmapDto }>(),
    'Heatmap Load Failed': props<{ error: string }>(),

    'Load KRIs': emptyProps(),
    'KRIs Loaded': props<{ kris: KRIItemDto[] }>(),
    'KRIs Load Failed': props<{ error: string }>(),

    'Update Risk': props<{ riskId: string; patch: Partial<RiskRegisterItemDto> }>(),
    'Risk Updated': props<{ risk: RiskRegisterItemDto }>(),
    'Risk Update Failed': props<{ riskId: string; error: string }>(),

    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

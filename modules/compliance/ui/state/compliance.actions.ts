import { createActionGroup, emptyProps, props } from '@ngrx/store';

type ComplianceOverviewDto = any;
type FrameworkSummaryDto = any;
type ComplianceGapDto = any;



export { ComplianceOverviewDto, FrameworkSummaryDto, ComplianceGapDto };

export const ComplianceActions = createActionGroup({
  source: 'Compliance',
  events: {
    'Load Overview': emptyProps(),
    'Overview Loaded': props<{ overview: ComplianceOverviewDto }>(),
    'Overview Load Failed': props<{ error: string }>(),

    'Load Frameworks': props<{ regulator?: string }>(),
    'Frameworks Loaded': props<{ frameworks: FrameworkSummaryDto[] }>(),
    'Frameworks Load Failed': props<{ error: string }>(),

    'Load Gaps': emptyProps(),
    'Gaps Loaded': props<{ gaps: ComplianceGapDto[] }>(),
    'Gaps Load Failed': props<{ error: string }>(),

    'Load Regulatory Changes': emptyProps(),
    'Regulatory Changes Loaded': props<{ changes: Record<string, unknown>[] }>(),
    'Regulatory Changes Load Failed': props<{ error: string }>(),

    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

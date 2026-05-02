import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const FoundationActions = createActionGroup({
  source: 'Foundation',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Configs': emptyProps(),
    'Configs Loaded': props<{ items: any[]; total: number }>(),
    'Configs Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

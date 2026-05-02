import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const AnalyticsActions = createActionGroup({
  source: 'Analytics',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

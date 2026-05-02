import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const ReportingActions = createActionGroup({
  source: 'Reporting',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Reports': emptyProps(),
    'Reports Loaded': props<{ items: any[]; total: number }>(),
    'Reports Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

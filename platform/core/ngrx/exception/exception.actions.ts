import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const ExceptionActions = createActionGroup({
  source: 'Exception',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Items': emptyProps(),
    'Items Loaded': props<{ items: any[]; total: number }>(),
    'Items Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const BcpActions = createActionGroup({
  source: 'BCP',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Plans': emptyProps(),
    'Plans Loaded': props<{ items: any[]; total: number }>(),
    'Plans Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

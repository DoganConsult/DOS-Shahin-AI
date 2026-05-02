import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const PrivacyActions = createActionGroup({
  source: 'Privacy',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Dsrs': emptyProps(),
    'Dsrs Loaded': props<{ dsrs: any[]; total: number }>(),
    'Dsrs Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

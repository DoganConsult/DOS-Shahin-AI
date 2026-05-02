import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const TeamActions = createActionGroup({
  source: 'Team',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Members': emptyProps(),
    'Members Loaded': props<{ items: any[]; total: number }>(),
    'Members Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

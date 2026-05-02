import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const RemediationActions = createActionGroup({
  source: 'Remediation',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Tasks': emptyProps(),
    'Tasks Loaded': props<{ items: any[]; total: number }>(),
    'Tasks Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

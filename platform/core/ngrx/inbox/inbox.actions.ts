import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const InboxActions = createActionGroup({
  source: 'Inbox',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Messages': emptyProps(),
    'Messages Loaded': props<{ items: any[]; total: number }>(),
    'Messages Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const AiActions = createActionGroup({
  source: 'AI',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Agents': emptyProps(),
    'Agents Loaded': props<{ agents: any[]; total: number }>(),
    'Agents Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

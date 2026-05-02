import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const AdminActions = createActionGroup({
  source: 'Admin',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Tenants': emptyProps(),
    'Tenants Loaded': props<{ items: any[]; total: number }>(),
    'Tenants Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

import { createActionGroup, emptyProps, props } from '@ngrx/store';
export const TrainingActions = createActionGroup({
  source: 'Training',
  events: {
    'Load Snapshot': emptyProps(),
    'Snapshot Loaded': props<{ snapshot: any }>(),
    'Snapshot Load Failed': props<{ error: string }>(),
    'Load Programs': emptyProps(),
    'Programs Loaded': props<{ programs: any[]; total: number }>(),
    'Programs Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

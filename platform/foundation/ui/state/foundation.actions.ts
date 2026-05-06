import { createActionGroup, emptyProps, props } from '@ngrx/store';
import type { FoundationLookups } from '../services/foundation-api.service';

export const FoundationActions = createActionGroup({
  source: 'Foundation',
  events: {
    'Load Dashboard': emptyProps(),
    'Dashboard Loaded': props<{ dashboard: any }>(),
    'Dashboard Load Failed': props<{ error: string }>(),
    'Load Configs': emptyProps(),
    'Configs Loaded': props<{ lookups: FoundationLookups }>(),
    'Configs Load Failed': props<{ error: string }>(),
    'Load All': emptyProps(),
    'Reset': emptyProps(),
  },
});

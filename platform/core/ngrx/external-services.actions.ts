import { createActionGroup, emptyProps, props } from '@ngrx/store';

export const ExternalServicesActions = createActionGroup({
  source: 'External Services',
  events: {
    'Check Health': emptyProps(),
    'Health Checked': props<{ services: Record<string, boolean> }>(),
    'Health Check Failed': props<{ error: string }>(),

    'Load CISO Frameworks': emptyProps(),
    'CISO Frameworks Loaded': props<{ frameworks: any[] }>(),
    'CISO Frameworks Load Failed': props<{ error: string }>(),

    'Load OpenProject Work Packages': props<{ projectId?: string }>(),
    'OpenProject Work Packages Loaded': props<{ workPackages: any[] }>(),
    'OpenProject Work Packages Load Failed': props<{ error: string }>(),

    'Load GovReady Controls': props<{ systemId?: string }>(),
    'GovReady Controls Loaded': props<{ controls: any[] }>(),
    'GovReady Controls Load Failed': props<{ error: string }>(),
  },
});
